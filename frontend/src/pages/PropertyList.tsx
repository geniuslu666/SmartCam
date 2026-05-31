import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Building2,
  Camera,
  Edit2,
  MapPin,
  MonitorPlay,
  Plus,
  Radio,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Drawer,
  PageHeader,
  StatCard,
  cn,
} from '../components/ui'
import { propertyAPI } from '../services/api'
import { useI18n } from '../i18n'

type PropertyRow = {
  id: string
  name: string
  description?: string
  address?: string
  contact_person?: string
  contact_phone?: string
  uplink_bandwidth_mbps?: number
  max_concurrent_streams: number
  status: 'active' | 'inactive' | 'maintenance'
  latitude?: number
  longitude?: number
  nvr_count: number
  channel_count: number
  offline_channels: number
  active_sessions: number
}

const emptyForm = () => ({
  name: '',
  description: '',
  address: '',
  contact_person: '',
  contact_phone: '',
  uplink_bandwidth_mbps: 100,
  max_concurrent_streams: 50,
  status: 'active' as PropertyRow['status'],
  latitude: undefined as number | undefined,
  longitude: undefined as number | undefined,
})

type FormData = ReturnType<typeof emptyForm>

// ── helpers ───────────────────────────────────────────────────────────────────
const inputCls = 'w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label}{required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
    </div>
  )
}

const statusVariant = (s: string) =>
  s === 'active' ? 'success' : s === 'maintenance' ? 'warning' : 'destructive'

const statusLabel = (s: string, t: (k: string) => string) =>
  s === 'active' ? t('正常') : s === 'maintenance' ? t('维护') : t('停用')

// ── Page ───────────────────────────────────────────────────────────────────────
const PropertyListPage: React.FC = () => {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [properties, setProperties] = useState<PropertyRow[]>([])
  const [loading, setLoading] = useState(true)

  // Drawer state
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PropertyRow | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<PropertyRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await propertyAPI.getProperties({ page: 1, limit: 100 })
      setProperties(res.data.data?.items ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const totalChannels = properties.reduce((s, p) => s + (p.channel_count || 0), 0)
  const totalOffline = properties.reduce((s, p) => s + (p.offline_channels || 0), 0)
  const totalSessions = properties.reduce((s, p) => s + (p.active_sessions || 0), 0)

  const setField = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const openAdd = () => {
    setForm(emptyForm())
    setFormError('')
    setAddOpen(true)
  }

  const openEdit = (p: PropertyRow) => {
    setForm({
      name: p.name,
      description: p.description ?? '',
      address: p.address ?? '',
      contact_person: p.contact_person ?? '',
      contact_phone: p.contact_phone ?? '',
      uplink_bandwidth_mbps: p.uplink_bandwidth_mbps ?? 100,
      max_concurrent_streams: p.max_concurrent_streams,
      status: p.status,
      latitude: p.latitude,
      longitude: p.longitude,
    })
    setFormError('')
    setEditTarget(p)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setFormError(t('物业名称不能为空')); return }
    setSaving(true); setFormError('')
    try {
      if (addOpen) {
        await propertyAPI.createProperty(form as Record<string, unknown>)
        setAddOpen(false)
      } else if (editTarget) {
        await propertyAPI.updateProperty(editTarget.id, form as Record<string, unknown>)
        setEditTarget(null)
      }
      await load()
    } catch {
      setFormError(t('保存失败，请重试'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await propertyAPI.deleteProperty(deleteTarget.id)
      setDeleteTarget(null)
      await load()
    } finally {
      setDeleting(false)
    }
  }

  // Shared form fields rendered inside the Drawer body
  const formFields = (
    <form id="property-form" onSubmit={handleSubmit} className="space-y-4">
      <Field label={t('物业名称')} required>
        <input
          className={inputCls}
          value={form.name}
          onChange={(e) => setField('name', e.target.value)}
          placeholder={t('例：A 号楼')}
        />
      </Field>
      <Field label={t('地址')}>
        <input
          className={inputCls}
          value={form.address ?? ''}
          onChange={(e) => setField('address', e.target.value)}
          placeholder={t('物业地址')}
        />
      </Field>
      <Field label={t('描述')}>
        <textarea
          className={cn(inputCls, 'h-16 resize-none')}
          value={form.description ?? ''}
          onChange={(e) => setField('description', e.target.value)}
          placeholder={t('物业简要描述')}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('联系人')}>
          <input
            className={inputCls}
            value={form.contact_person ?? ''}
            onChange={(e) => setField('contact_person', e.target.value)}
            placeholder={t('姓名')}
          />
        </Field>
        <Field label={t('联系电话')}>
          <input
            className={inputCls}
            value={form.contact_phone ?? ''}
            onChange={(e) => setField('contact_phone', e.target.value)}
            placeholder={t('电话号码')}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('上行带宽 (Mbps)')}>
          <input
            type="number"
            className={inputCls}
            value={form.uplink_bandwidth_mbps ?? ''}
            min={1}
            onChange={(e) => setField('uplink_bandwidth_mbps', Number(e.target.value))}
          />
        </Field>
        <Field label={t('最大并发流')}>
          <input
            type="number"
            className={inputCls}
            value={form.max_concurrent_streams}
            min={1}
            onChange={(e) => setField('max_concurrent_streams', Number(e.target.value))}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('纬度 (lat)')}>
          <input
            type="number"
            step="any"
            className={inputCls}
            value={form.latitude ?? ''}
            onChange={(e) => setField('latitude', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="34.68"
          />
        </Field>
        <Field label={t('经度 (lng)')}>
          <input
            type="number"
            step="any"
            className={inputCls}
            value={form.longitude ?? ''}
            onChange={(e) => setField('longitude', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="135.51"
          />
        </Field>
      </div>
      <Field label={t('状态')}>
        <select
          className={inputCls}
          value={form.status}
          onChange={(e) => setField('status', e.target.value as FormData['status'])}
        >
          <option value="active">{t('正常运行')}</option>
          <option value="inactive">{t('停用')}</option>
          <option value="maintenance">{t('维护中')}</option>
        </select>
      </Field>
      {formError && <p className="text-xs text-red-400">{formError}</p>}
    </form>
  )

  const drawerFooter = (
    <div className="flex justify-end gap-2">
      <Button
        variant="outline"
        onClick={() => { setAddOpen(false); setEditTarget(null) }}
      >
        {t('取消')}
      </Button>
      <Button form="property-form" type="submit" disabled={saving}>
        {saving ? t('保存中...') : t('保存')}
      </Button>
    </div>
  )

  return (
    <>
      <PageHeader
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              <span className="hidden sm:inline">{t('刷新')}</span>
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('新增物业')}</span>
            </Button>
          </div>
        }
        description={t('按物业查看 NVR、通道、异常和实时并发。')}
        title={t('物业总览')}
      />

      <div className="space-y-4 p-4 md:p-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            detail={t('{{n}} 处物业', { n: properties.length })}
            icon={<Building2 className="h-5 w-5" />}
            label={t('物业数量')}
            value={String(properties.length)}
          />
          <StatCard
            detail={t('全部通道')}
            icon={<Camera className="h-5 w-5" />}
            label={t('摄像头通道')}
            value={String(totalChannels)}
          />
          <StatCard
            detail={t('活跃 session')}
            icon={<Radio className="h-5 w-5" />}
            label={t('当前并发')}
            value={String(totalSessions)}
          />
          <StatCard
            detail={totalOffline > 0 ? t('{{n}} 路待检查', { n: totalOffline }) : t('全部在线')}
            icon={<AlertTriangle className="h-5 w-5" />}
            label={t('离线通道')}
            value={String(totalOffline)}
          />
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t('物业列表')}</CardTitle>
            <Badge variant="outline">{t('共 {{n}} 处', { n: properties.length })}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">{t('加载中...')}</div>
            ) : properties.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-10 text-muted-foreground">
                <Building2 className="h-10 w-10 opacity-30" />
                <p className="text-sm">{t('暂无物业，点击「新增物业」开始')}</p>
                <Button size="sm" onClick={openAdd}>
                  <Plus className="h-4 w-4" />{t('新增物业')}
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">{t('物业')}</th>
                      <th className="px-4 py-3 font-medium">{t('状态')}</th>
                      <th className="px-4 py-3 font-medium">NVR</th>
                      <th className="px-4 py-3 font-medium">{t('通道')}</th>
                      <th className="px-4 py-3 font-medium">{t('在线率')}</th>
                      <th className="hidden sm:table-cell px-4 py-3 font-medium">{t('并发')}</th>
                      <th className="hidden sm:table-cell px-4 py-3 font-medium">{t('上行')}</th>
                      <th className="px-4 py-3 font-medium">{t('操作')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {properties.map((p) => {
                      const onlineCh = (p.channel_count || 0) - (p.offline_channels || 0)
                      const rate = p.channel_count > 0 ? Math.round((onlineCh / p.channel_count) * 100) : 100
                      return (
                        <tr
                          className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                          key={p.id}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent">
                                <Building2 className="h-4 w-4 text-accent-foreground" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-foreground truncate">{p.name}</div>
                                {p.address && (
                                  <div className="truncate text-xs text-muted-foreground">{p.address}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={statusVariant(p.status)}>{statusLabel(p.status, t)}</Badge>
                          </td>
                          <td className="px-4 py-3 tabular-nums">{p.nvr_count ?? 0}</td>
                          <td className="px-4 py-3 tabular-nums">{p.channel_count ?? 0}</td>
                          <td className="px-4 py-3">
                            {p.channel_count > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className="h-full rounded-full bg-emerald-500"
                                    style={{ width: `${rate}%` }}
                                  />
                                </div>
                                <span className="text-xs tabular-nums">{onlineCh}/{p.channel_count}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="hidden sm:table-cell px-4 py-3 tabular-nums">
                            {p.active_sessions ?? 0}
                          </td>
                          <td className="hidden sm:table-cell px-4 py-3 text-muted-foreground">
                            {p.uplink_bandwidth_mbps ? `${p.uplink_bandwidth_mbps} Mbps` : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="secondary"
                                title={t('实时预览')}
                                onClick={() => navigate(`/preview?property_id=${p.id}`)}
                              >
                                <MonitorPlay className="h-3.5 w-3.5" />
                                <span className="hidden lg:inline">{t('预览')}</span>
                              </Button>
                              {p.latitude && p.longitude && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  title={t('地图定位')}
                                  onClick={() => navigate('/map')}
                                >
                                  <MapPin className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                title={t('编辑')}
                                onClick={() => openEdit(p)}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                title={t('删除')}
                                className="text-red-400 hover:bg-red-400/10 hover:text-red-300"
                                onClick={() => setDeleteTarget(p)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Drawer */}
      <Drawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t('新增物业')}
        description={t('填写物业基本信息')}
        footer={drawerFooter}
      >
        {formFields}
      </Drawer>

      {/* Edit Drawer */}
      <Drawer
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title={t('编辑物业')}
        description={t('修改物业基本信息')}
        footer={drawerFooter}
      >
        {formFields}
      </Drawer>

      {/* Delete ConfirmDialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('删除物业')}
        message={t('确认删除「{{name}}」？相关 NVR 和通道数据将一并删除，操作不可撤销。', { name: deleteTarget?.name ?? '' })}
        confirmLabel={deleting ? t('删除中...') : t('确认删除')}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        variant="destructive"
      />
    </>
  )
}

export default PropertyListPage
