import React, { useEffect, useState } from 'react'
import {
  CheckCircle2, Download, Edit2, FileKey2, Loader2, Plus, Radio, RefreshCw, Search, Trash2, XCircle,
} from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, PageHeader, Drawer, ConfirmDialog, cn } from '../components/ui'
import { nvrAPI, channelAPI, propertyAPI, brandTemplateAPI } from '../services/api'
import type { BrandTemplate } from './BrandTemplates'
import { useI18n } from '../i18n'

type Mode = 'nvrs' | 'channels' | 'streams'

// ── Types ─────────────────────────────────────────────────────────────────────
type AccessType = 'rtsp' | 'isapi' | 'sdk'

type NVRRow = {
  id: string; property_id: string; name: string; brand: string; model?: string
  ip_address: string; rtsp_port: number; http_port: number; sdk_port: number
  access_type: AccessType; username: string
  channel_count: number; support_h264: boolean; support_h265: boolean
  is_online: boolean; status: string; last_heartbeat?: string
}

type DiscoveredChannel = {
  channel_number: number
  name: string
  is_online: boolean
  ip_address?: string
  model?: string
  firmware_version?: string
  encoding?: string
  resolution?: string
}

type TestResult = {
  success: boolean
  message: string
  device_name?: string
  model?: string
  firmware_version?: string
  serial_number?: string
  device_type?: string
  channel_count?: number
  latency_ms?: number
}
type ChannelRow = {
  id: string; nvr_id: string; property_id: string; channel_number: number
  name: string; location?: string; access_type?: AccessType
  main_stream_encoding?: string; sub_stream_encoding?: string
  main_stream_resolution?: string; sub_stream_resolution?: string
  rtsp_main_url_template?: string; rtsp_sub_url_template?: string
  is_online: boolean; status: string
}
type PropertyOption = { id: string; name: string }

// ── Shared helpers ────────────────────────────────────────────────────────────
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

// ── Access type badge helper ──────────────────────────────────────────────────
const ACCESS_TYPE_LABELS: Record<string, string> = { rtsp: 'RTSP', isapi: 'ISAPI', sdk: 'SDK' }
const ACCESS_TYPE_COLORS: Record<string, string> = {
  rtsp: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  isapi: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  sdk: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
}

// ── NVR Drawer form ───────────────────────────────────────────────────────────
function NVRForm({
  initial, properties, onSave, onClose, setSaving, onDiscoverDone,
}: {
  initial: Partial<NVRRow> & { password?: string }
  properties: PropertyOption[]
  onSave: (data: Record<string, unknown>) => Promise<void>
  onClose: () => void
  saving?: boolean
  setSaving: (v: boolean) => void
  onDiscoverDone?: (nvrId: string, channels: DiscoveredChannel[]) => void
}) {
  const { t } = useI18n()
  const [f, setF] = useState({
    property_id: '', name: '', brand: 'hikvision', model: '', ip_address: '',
    rtsp_port: 554, http_port: 80, sdk_port: 8000, access_type: 'rtsp' as AccessType,
    username: 'admin', password: '', channel_count: 4, support_h265: true, brand_template_id: '',
    ...initial,
  })
  const [templates, setTemplates] = useState<BrandTemplate[]>([])
  const [err, setErr] = useState('')
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [discovering, setDiscovering] = useState(false)
  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    brandTemplateAPI.getAll().then((r) => setTemplates(r.data.data?.items ?? [])).catch(() => {})
  }, [])

  const applyTemplate = (id: string) => {
    const tmpl = templates.find((tpl) => tpl.id === id)
    if (!tmpl) return
    setF((p) => ({
      ...p, brand_template_id: id, brand: tmpl.brand,
      rtsp_port: tmpl.default_rtsp_port, http_port: tmpl.default_http_port,
      username: tmpl.default_username,
    }))
  }

  // Build connection params from current form state.
  // nvr_id lets the backend fill in the stored password when the form field is blank
  // (edit mode never pre-fills the password for security reasons).
  const buildParams = () => ({
    nvr_id: initial.id ?? '',
    ip_address: f.ip_address,
    rtsp_port: f.rtsp_port,
    http_port: f.http_port,
    sdk_port: f.sdk_port,
    access_type: f.access_type,
    username: f.username,
    password: f.password,
    channel_count: f.channel_count,
  })

  const handleTest = async () => {
    if (!f.ip_address) { setTestResult({ success: false, message: t('请先填写内网 IP') }); return }
    setTesting(true); setTestResult(null)
    try {
      const res = await nvrAPI.testByParams(buildParams())
      setTestResult(res.data.data as TestResult)
    } catch {
      setTestResult({ success: false, message: t('连接测试请求失败') })
    } finally {
      setTesting(false)
    }
  }

  const handleDiscover = async () => {
    if (!f.ip_address) { setTestResult({ success: false, message: t('请先填写内网 IP') }); return }
    setDiscovering(true); setTestResult(null)
    try {
      const res = await nvrAPI.discoverByParams(buildParams())
      const discovered: DiscoveredChannel[] = res.data.data ?? []
      onDiscoverDone?.(initial.id ?? '__new__', discovered)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('发现失败')
      setTestResult({ success: false, message: msg })
    } finally {
      setDiscovering(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.property_id || !f.name || !f.ip_address) { setErr(t('请填写必填项')); return }
    setSaving(true); setErr('')
    try { await onSave(f as Record<string, unknown>); onClose() }
    catch { setErr(t('保存失败')) }
    finally { setSaving(false) }
  }

  const accessTypes: { value: AccessType; label: string; desc: string }[] = [
    { value: 'rtsp', label: 'RTSP', desc: t('直接拉 RTSP 流，手动填写 URL 模板') },
    { value: 'isapi', label: 'ISAPI', desc: t('海康 HTTP REST，支持自动扫描摄像头') },
    { value: 'sdk', label: 'SDK', desc: t('海康私有协议（8000 端口），自动扫描') },
  ]

  return (
    <form id="nvr-form" onSubmit={handleSubmit} className="space-y-4">
      {/* Access type selector */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t('接入方式')}</label>
        <div className="grid grid-cols-3 gap-2">
          {accessTypes.map((at) => (
            <button
              key={at.value}
              type="button"
              onClick={() => set('access_type', at.value)}
              className={cn(
                'rounded-md border px-3 py-2 text-left text-xs transition-colors',
                f.access_type === at.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-border/80 hover:bg-muted/40',
              )}
            >
              <div className="font-semibold">{at.label}</div>
              <div className="mt-0.5 leading-tight opacity-70">{at.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <Field label={t('所属物业')} required>
        <select className={inputCls} value={f.property_id} onChange={(e) => set('property_id', e.target.value)}>
          <option value="">{t('请选择...')}</option>
          {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label={t('品牌模板（可选，自动填充端口和用户名）')}>
        <select className={inputCls} value={f.brand_template_id} onChange={(e) => applyTemplate(e.target.value)}>
          <option value="">{t('不使用模板')}</option>
          {templates.map((tmpl) => <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('名称')} required>
          <input className={inputCls} value={f.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label={t('品牌')}>
          <select className={inputCls} value={f.brand} onChange={(e) => set('brand', e.target.value)}>
            {['hikvision', 'dahua', 'uniview', 'axis', 'hanwha', 'reolink', 'onvif', 'other'].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('内网 IP')} required>
          <input className={inputCls} value={f.ip_address} onChange={(e) => set('ip_address', e.target.value)} placeholder="192.168.1.100" />
        </Field>
        <Field label={t('型号')}>
          <input className={inputCls} value={f.model ?? ''} onChange={(e) => set('model', e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t('RTSP 端口')}>
          <input type="number" className={inputCls} value={f.rtsp_port} onChange={(e) => set('rtsp_port', +e.target.value)} />
        </Field>
        <Field label={t('HTTP 端口')}>
          <input type="number" className={inputCls} value={f.http_port} onChange={(e) => set('http_port', +e.target.value)} />
        </Field>
        {f.access_type === 'sdk' ? (
          <Field label={t('SDK 端口')}>
            <input type="number" className={inputCls} value={f.sdk_port} onChange={(e) => set('sdk_port', +e.target.value)} />
          </Field>
        ) : (
          <Field label={t('通道数')}>
            <input type="number" className={inputCls} value={f.channel_count} onChange={(e) => set('channel_count', +e.target.value)} min={1} />
          </Field>
        )}
      </div>
      {f.access_type === 'sdk' && (
        <Field label={t('通道数')}>
          <input type="number" className={inputCls} value={f.channel_count} onChange={(e) => set('channel_count', +e.target.value)} min={1} />
        </Field>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('用户名')}>
          <input className={inputCls} value={f.username} onChange={(e) => set('username', e.target.value)} />
        </Field>
        <Field label={initial.id ? t('新密码（留空不修改）') : `${t('密码')} *`}>
          <input type="password" className={inputCls} value={f.password ?? ''} onChange={(e) => set('password', e.target.value)} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.support_h265} onChange={(e) => set('support_h265', e.target.checked)} />
        {t('支持 H.265')}
      </label>

      {/* Test / Discover actions — works for both new and existing NVR */}
      <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={handleTest} disabled={testing} className="flex-1">
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radio className="h-3.5 w-3.5" />}
            {t('测试连接')}
          </Button>
          {(f.access_type === 'isapi' || f.access_type === 'sdk') && (
            <Button type="button" size="sm" variant="outline" onClick={handleDiscover} disabled={discovering} className="flex-1">
              {discovering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              {t('发现通道')}
            </Button>
          )}
        </div>
        {testResult && (
          <div className={cn('rounded-md px-2.5 py-2 text-xs space-y-0.5', testResult.success ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400')}>
            <div className="flex items-start gap-2">
              {testResult.success
                ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
              <span className="font-medium">{testResult.message}</span>
              {testResult.latency_ms != null && (
                <span className="ml-auto shrink-0 opacity-60">{testResult.latency_ms}ms</span>
              )}
            </div>
            {testResult.success && (testResult.device_name || testResult.model || testResult.firmware_version || testResult.serial_number) && (
              <div className="ml-5 space-y-0.5 opacity-80">
                {testResult.device_name && <div>{t('设备名')}: {testResult.device_name}{testResult.device_type ? ` (${testResult.device_type})` : ''}</div>}
                {testResult.model && <div>{t('型号')}: {testResult.model}</div>}
                {testResult.firmware_version && <div>{t('固件')}: {testResult.firmware_version}</div>}
                {testResult.serial_number && <div>{t('序列号')}: {testResult.serial_number}</div>}
              </div>
            )}
          </div>
        )}
      </div>

      {err && <p className="text-xs text-red-400">{err}</p>}
    </form>
  )
}

// ── Channel Drawer form ───────────────────────────────────────────────────────
function ChannelForm({
  initial, nvrs, onSave, onClose, setSaving,
}: {
  initial: Partial<ChannelRow>
  nvrs: NVRRow[]
  onSave: (data: Record<string, unknown>) => Promise<void>
  onClose: () => void
  saving?: boolean
  setSaving: (v: boolean) => void
}) {
  const { t } = useI18n()
  const [f, setF] = useState<Partial<ChannelRow> & { location: string; main_stream_encoding: string; sub_stream_encoding: string; rtsp_main_url_template: string; rtsp_sub_url_template: string; status: string; access_type: AccessType }>({
    name: '', location: '', channel_number: 1,
    access_type: 'rtsp',
    main_stream_encoding: 'H.265', sub_stream_encoding: 'H.264',
    rtsp_main_url_template: 'rtsp://{username}:{password}@{ip}:{port}/Streaming/channels/{channel_number}01',
    rtsp_sub_url_template: 'rtsp://{username}:{password}@{ip}:{port}/Streaming/channels/{channel_number}02',
    is_online: true, status: 'active', ...initial,
  })
  const [err, setErr] = useState('')
  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }))

  const boundNVR = nvrs.find(n => n.id === f.nvr_id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.name) { setErr(t('名称不能为空')); return }
    setSaving(true); setErr('')
    try { await onSave(f as Record<string, unknown>); onClose() }
    catch { setErr(t('保存失败')) }
    finally { setSaving(false) }
  }

  return (
    <form id="channel-form" onSubmit={handleSubmit} className="space-y-4">
      {/* NVR 绑定信息 */}
      {boundNVR && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs">
          <span className="text-muted-foreground">NVR:</span>
          <span className="font-medium">{boundNVR.name}</span>
          <span className="text-muted-foreground">{boundNVR.ip_address}</span>
          <span className={cn('ml-auto rounded border px-1.5 py-0.5 text-[10px] font-semibold', ACCESS_TYPE_COLORS[boundNVR.access_type ?? 'rtsp'])}>
            NVR·{ACCESS_TYPE_LABELS[boundNVR.access_type ?? 'rtsp']}
          </span>
        </div>
      )}

      {/* 接入方式选择 */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t('接入方式')}</label>
        <div className="flex gap-2">
          {(['rtsp', 'isapi', 'sdk'] as AccessType[]).map(at => (
            <button
              key={at}
              type="button"
              onClick={() => set('access_type', at)}
              className={cn(
                'flex-1 rounded-md border py-1.5 text-center text-xs font-semibold transition-colors',
                f.access_type === at
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted/40',
              )}
            >
              {at.toUpperCase()}
            </button>
          ))}
        </div>
        {f.access_type !== 'rtsp' && (
          <p className="mt-1 text-[10px] text-muted-foreground">
            {f.access_type === 'isapi'
              ? t('ISAPI 模式：流地址自动生成，格式 /ISAPI/Streaming/channels/{N}01，无需填写模板')
              : t('SDK 模式：走标准 RTSP 传输，格式 /Streaming/channels/{N}01，通过 NVR 8000 端口接入')}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('名称')} required>
          <input className={inputCls} value={f.name ?? ''} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label={t('通道编号')}>
          <input type="number" className={inputCls} value={f.channel_number ?? 1} onChange={(e) => set('channel_number', +e.target.value)} min={1} />
        </Field>
      </div>
      <Field label={t('位置/区域')}>
        <input className={inputCls} value={f.location ?? ''} onChange={(e) => set('location', e.target.value)} />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('主码流编码')}>
          <select className={inputCls} value={f.main_stream_encoding} onChange={(e) => set('main_stream_encoding', e.target.value)}>
            <option>H.265</option><option>H.264</option>
          </select>
        </Field>
        <Field label={t('子码流编码')}>
          <select className={inputCls} value={f.sub_stream_encoding} onChange={(e) => set('sub_stream_encoding', e.target.value)}>
            <option>H.264</option><option>H.265</option>
          </select>
        </Field>
      </div>

      {/* RTSP 模板 — 仅 RTSP 模式显示 */}
      {f.access_type === 'rtsp' ? (
        <>
          <Field label={t('主码流 RTSP 模板')}>
            <input className={inputCls} value={f.rtsp_main_url_template ?? ''} onChange={(e) => set('rtsp_main_url_template', e.target.value)} />
          </Field>
          <Field label={t('子码流 RTSP 模板')}>
            <input className={inputCls} value={f.rtsp_sub_url_template ?? ''} onChange={(e) => set('rtsp_sub_url_template', e.target.value)} />
          </Field>
        </>
      ) : (
        <div className="rounded-md border border-dashed border-border bg-muted/10 px-3 py-2.5 space-y-0.5 text-[11px] text-muted-foreground font-mono">
          <div>{f.access_type === 'isapi' ? '/ISAPI' : ''}/Streaming/channels/{f.channel_number ?? 1}01 ← 主码流</div>
          <div>{f.access_type === 'isapi' ? '/ISAPI' : ''}/Streaming/channels/{f.channel_number ?? 1}02 ← 子码流</div>
        </div>
      )}

      <Field label={t('状态')}>
        <select className={inputCls} value={f.status} onChange={(e) => set('status', e.target.value)}>
          <option value="active">{t('启用')}</option>
          <option value="inactive">{t('禁用')}</option>
        </select>
      </Field>
      {err && <p className="text-xs text-red-400">{err}</p>}
    </form>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
const DeviceInventoryPage: React.FC<{ mode: Mode }> = ({ mode }) => {
  const { t } = useI18n()
  const [nvrs, setNVRs] = useState<NVRRow[]>([])
  const [channels, setChannels] = useState<ChannelRow[]>([])
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  // Drawer state
  const [nvrDrawer, setNvrDrawer] = useState<{ open: boolean; data?: NVRRow }>({ open: false })
  const [channelDrawerState, setChannelDrawerState] = useState<{ open: boolean; data?: ChannelRow }>({ open: false })
  const [saving, setSaving] = useState(false)

  // Discovered channels state (used inside NVR edit drawer)
  const [discoverResult, setDiscoverResult] = useState<{ nvrId: string; channels: DiscoveredChannel[] } | null>(null)
  const [importing, setImporting] = useState(false)
  const [selectedDiscovers, setSelectedDiscovers] = useState<Set<number>>(new Set())

  // NVR import drawer (standalone: triggered from NVR list row)
  const [importDrawer, setImportDrawer] = useState<{
    open: boolean; nvr?: NVRRow; loading: boolean
    channels: DiscoveredChannel[]; selected: Set<number>; error: string; importing: boolean
  }>({ open: false, loading: false, channels: [], selected: new Set(), error: '', importing: false })

  const openImportDrawer = async (nvr: NVRRow) => {
    setImportDrawer({ open: true, nvr, loading: true, channels: [], selected: new Set(), error: '', importing: false })
    try {
      const res = await nvrAPI.discoverByParams({
        nvr_id: nvr.id, ip_address: nvr.ip_address, rtsp_port: nvr.rtsp_port,
        http_port: nvr.http_port, sdk_port: nvr.sdk_port ?? 8000,
        access_type: nvr.access_type, username: nvr.username, password: '', channel_count: nvr.channel_count,
      })
      const chs: DiscoveredChannel[] = res.data.data ?? []
      setImportDrawer(p => ({ ...p, loading: false, channels: chs, selected: new Set(chs.map(c => c.channel_number)) }))
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('发现通道失败')
      setImportDrawer(p => ({ ...p, loading: false, error: msg }))
    }
  }

  // Delete confirm state
  const [delTarget, setDelTarget] = useState<{ id: string; label: string; type: 'nvr' | 'channel' } | null>(null)

  const loadAll = async () => {
    setLoading(true)
    try {
      const [chRes, propRes] = await Promise.all([
        channelAPI.getChannels({ limit: 200 }),
        propertyAPI.getProperties({ limit: 100 }),
      ])
      const allChannels: ChannelRow[] = chRes.data.data ?? []
      setChannels(allChannels)
      const propList: PropertyOption[] = (propRes.data.data?.items ?? []).map(
        (p: { id: string; name: string }) => ({ id: p.id, name: p.name }),
      )
      setProperties(propList)
      // Collect NVRs from all properties
      const nvrResults = await Promise.all(
        propList.map((p) => nvrAPI.getNVRsByPropertyId(p.id).catch(() => ({ data: { data: [] } }))),
      )
      const allNVRs = nvrResults.flatMap((r) => r.data.data ?? [])
      setNVRs(allNVRs)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [mode])

  const q = search.toLowerCase()
  const filteredNVRs = nvrs.filter((n) => !q || n.name.toLowerCase().includes(q) || n.ip_address.includes(q))
  const filteredChannels = channels.filter(
    (c) => !q || c.name.toLowerCase().includes(q) || (c.location ?? '').toLowerCase().includes(q),
  )

  const titleMap: Record<Mode, string> = {
    nvrs: t('NVR 设备'),
    channels: t('摄像头通道'),
    streams: t('流地址模板'),
  }
  const descMap: Record<Mode, string> = {
    nvrs: t('维护 NVR 品牌、型号、内网地址、通道数和在线状态。'),
    channels: t('维护通道名称、区域、主/子码流编码和 RTSP 模板。'),
    streams: t('各通道的 RTSP 主/子码流模板汇总，可逐条编辑。'),
  }

  return (
    <>
      <PageHeader
        title={titleMap[mode]}
        description={descMap[mode]}
        action={
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring sm:w-40"
                placeholder={t('搜索...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" onClick={loadAll}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            {mode !== 'streams' && (
              <Button
                size="sm"
                onClick={() => {
                  if (mode === 'nvrs') setNvrDrawer({ open: true })
                  else setChannelDrawerState({ open: true })
                }}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t('新增')}</span>
              </Button>
            )}
          </div>
        }
      />

      <div className="space-y-4 p-4 md:p-6">
        {/* NVRs */}
        {mode === 'nvrs' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('设备清单')}</CardTitle>
              <Badge variant="outline">{filteredNVRs.length} {t('台')}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {filteredNVRs.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {loading ? t('加载中...') : t('暂无 NVR')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">{t('名称')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('品牌/型号')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('内网地址')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('接入方式')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('通道')}</th>
                        <th className="hidden px-4 py-3 text-left font-medium md:table-cell">{t('编码')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('状态')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('操作')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredNVRs.map((nvr) => (
                        <tr className="border-b border-border last:border-0 hover:bg-muted/20" key={nvr.id}>
                          <td className="px-4 py-3 font-medium">{nvr.name}</td>
                          <td className="px-4 py-3 capitalize text-muted-foreground">
                            {nvr.brand}{nvr.model ? ` / ${nvr.model}` : ''}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{nvr.ip_address}:{nvr.rtsp_port}</td>
                          <td className="px-4 py-3">
                            <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-semibold', ACCESS_TYPE_COLORS[nvr.access_type ?? 'rtsp'])}>
                              {ACCESS_TYPE_LABELS[nvr.access_type ?? 'rtsp']}
                            </span>
                          </td>
                          <td className="px-4 py-3 tabular-nums">{nvr.channel_count}</td>
                          <td className="hidden px-4 py-3 md:table-cell">
                            <div className="flex gap-1">
                              <Badge variant="outline">H.264</Badge>
                              {nvr.support_h265 && <Badge variant="warning">H.265</Badge>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={nvr.is_online ? 'success' : 'destructive'}>
                              {nvr.is_online ? t('在线') : t('离线')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => setNvrDrawer({ open: true, data: nvr })}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm" variant="outline"
                                title={t('导入通道')}
                                onClick={() => openImportDrawer(nvr)}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm" variant="ghost"
                                className="text-red-400 hover:bg-red-400/10"
                                onClick={() => setDelTarget({ id: nvr.id, label: nvr.name, type: 'nvr' })}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Channels */}
        {mode === 'channels' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('通道清单')}</CardTitle>
              <Badge variant="outline">{filteredChannels.length} {t('路')}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {filteredChannels.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {loading ? t('加载中...') : t('暂无通道')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[780px] text-sm">
                    <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">{t('名称')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('所属 NVR')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('接入方式')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('区域')}</th>
                        <th className="hidden px-4 py-3 text-left font-medium md:table-cell">{t('编码')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('状态')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('操作')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredChannels.map((ch) => {
                        const boundNVR = nvrs.find(n => n.id === ch.nvr_id)
                        return (
                          <tr className="border-b border-border last:border-0 hover:bg-muted/20" key={ch.id}>
                            <td className="px-4 py-3 font-medium">
                              <div>{ch.name}</div>
                              <div className="text-xs text-muted-foreground">CH {ch.channel_number}</div>
                            </td>
                            <td className="px-4 py-3">
                              {boundNVR ? (
                                <div>
                                  <div className="text-xs font-medium">{boundNVR.name}</div>
                                  <div className="text-[10px] text-muted-foreground font-mono">{boundNVR.ip_address}</div>
                                </div>
                              ) : <span className="text-muted-foreground">-</span>}
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-semibold', ACCESS_TYPE_COLORS[ch.access_type ?? 'rtsp'])}>
                                {ACCESS_TYPE_LABELS[ch.access_type ?? 'rtsp']}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{ch.location || '-'}</td>
                            <td className="hidden px-4 py-3 md:table-cell">
                              <div className="flex gap-1">
                                {ch.sub_stream_encoding && <Badge variant="outline">{ch.sub_stream_encoding}</Badge>}
                                {ch.main_stream_encoding && <Badge variant="warning">{ch.main_stream_encoding}</Badge>}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={ch.is_online ? 'success' : 'destructive'}>
                                {ch.is_online ? t('在线') : t('离线')}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" onClick={() => setChannelDrawerState({ open: true, data: ch })}>
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm" variant="ghost"
                                  className="text-red-400 hover:bg-red-400/10"
                                  onClick={() => setDelTarget({ id: ch.id, label: ch.name, type: 'channel' })}
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
        )}

        {/* Streams */}
        {mode === 'streams' && (
          <div className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle>{t('RTSP 模板说明')}</CardTitle>
                <FileKey2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="mb-2 text-xs text-muted-foreground">{t('变量说明')}</div>
                  <div className="flex flex-wrap gap-2">
                    {['{username}', '{password}', '{ip}', '{port}', '{channel_number}'].map((v) => (
                      <code key={v} className="rounded bg-muted px-2 py-0.5 text-xs">{v}</code>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {filteredChannels.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                {loading ? t('加载中...') : t('暂无通道数据')}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredChannels.map((ch) => (
                  <div key={ch.id} className="space-y-2 rounded-md border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{ch.name}</div>
                      <Button size="sm" variant="outline" onClick={() => setChannelDrawerState({ open: true, data: ch })}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      <div>
                        <div className="mb-0.5 text-xs text-muted-foreground">{t('主码流')}</div>
                        <code className="block break-all rounded bg-muted px-2 py-1.5 text-xs text-muted-foreground">
                          {ch.rtsp_main_url_template || '-'}
                        </code>
                      </div>
                      <div>
                        <div className="mb-0.5 text-xs text-muted-foreground">{t('子码流')}</div>
                        <code className="block break-all rounded bg-muted px-2 py-1.5 text-xs text-muted-foreground">
                          {ch.rtsp_sub_url_template || '-'}
                        </code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* NVR Drawer */}
      <Drawer
        open={nvrDrawer.open}
        onClose={() => setNvrDrawer({ open: false })}
        title={nvrDrawer.data ? t('编辑 NVR') : t('新增 NVR')}
        description={t('配置 NVR 设备信息')}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNvrDrawer({ open: false })}>{t('取消')}</Button>
            <Button form="nvr-form" type="submit" disabled={saving}>
              {saving ? t('保存中...') : t('保存')}
            </Button>
          </div>
        }
      >
        {nvrDrawer.open && (
          <>
            <NVRForm
              key={nvrDrawer.data?.id ?? 'new-nvr'}
              initial={nvrDrawer.data ?? {}}
              properties={properties}
              saving={saving}
              setSaving={setSaving}
              onClose={() => setNvrDrawer({ open: false })}
              onSave={async (d) => {
                if (nvrDrawer.data) {
                  await nvrAPI.updateNVR(nvrDrawer.data.id, d)
                } else {
                  await nvrAPI.createNVR(d.property_id as string, d)
                }
                await loadAll()
              }}
              onDiscoverDone={(nvrId, chs) => {
                setDiscoverResult({ nvrId, channels: chs })
                setSelectedDiscovers(new Set(chs.map((c) => c.channel_number)))
              }}
            />
            {/* Discovered channel import panel */}
            {discoverResult && (discoverResult.nvrId === nvrDrawer.data?.id || discoverResult.nvrId === '__new__') && (
              <div className="mt-4 rounded-md border border-border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">
                    {t('发现 {{n}} 个通道，勾选后导入', { n: discoverResult.channels.length })}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setDiscoverResult(null)}
                  >✕</button>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {discoverResult.channels.map((ch) => (
                    <label key={ch.channel_number} className="flex items-start gap-2 rounded px-2 py-1.5 hover:bg-muted/40 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 shrink-0"
                        checked={selectedDiscovers.has(ch.channel_number)}
                        onChange={(e) => setSelectedDiscovers((prev) => {
                          const next = new Set(prev)
                          if (e.target.checked) next.add(ch.channel_number)
                          else next.delete(ch.channel_number)
                          return next
                        })}
                      />
                      <span className={cn('mt-1 h-1.5 w-1.5 rounded-full shrink-0', ch.is_online ? 'bg-emerald-400' : 'bg-slate-500')} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium truncate">{ch.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">CH {ch.channel_number}</span>
                        </div>
                        {(ch.ip_address || ch.model || ch.encoding || ch.resolution) && (
                          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                            {ch.ip_address && <span>{ch.ip_address}</span>}
                            {ch.model && <span>{ch.model}</span>}
                            {ch.encoding && <span>{ch.encoding}</span>}
                            {ch.resolution && <span>{ch.resolution}</span>}
                            {ch.firmware_version && <span>{ch.firmware_version}</span>}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  disabled={importing || selectedDiscovers.size === 0}
                  onClick={async () => {
                    if (!nvrDrawer.data) return
                    setImporting(true)
                    try {
                      const nvr = nvrDrawer.data
                      const toImport = discoverResult.channels.filter((c) => selectedDiscovers.has(c.channel_number))
                      await Promise.all(toImport.map((ch) =>
                        channelAPI.createChannel({
                          nvr_id: nvr.id,
                          property_id: nvr.property_id,
                          channel_number: ch.channel_number,
                          name: ch.name,
                          is_online: ch.is_online,
                          status: 'active',
                        }),
                      ))
                      setDiscoverResult(null)
                      await loadAll()
                    } finally {
                      setImporting(false)
                    }
                  }}
                >
                  {importing ? t('导入中...') : t('导入选中 ({{n}})', { n: selectedDiscovers.size })}
                </Button>
              </div>
            )}
          </>
        )}
      </Drawer>

      {/* Channel Drawer */}
      <Drawer
        open={channelDrawerState.open}
        onClose={() => setChannelDrawerState({ open: false })}
        title={channelDrawerState.data ? t('编辑通道') : t('新增通道')}
        description={t('配置摄像头通道信息')}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setChannelDrawerState({ open: false })}>{t('取消')}</Button>
            <Button form="channel-form" type="submit" disabled={saving}>
              {saving ? t('保存中...') : t('保存')}
            </Button>
          </div>
        }
      >
        {channelDrawerState.open && (
          <ChannelForm
            key={channelDrawerState.data?.id ?? 'new-channel'}
            initial={channelDrawerState.data ?? { nvr_id: nvrs[0]?.id, property_id: nvrs[0]?.property_id }}
            nvrs={nvrs}
            saving={saving}
            setSaving={setSaving}
            onClose={() => setChannelDrawerState({ open: false })}
            onSave={async (d) => {
              if (channelDrawerState.data) {
                await channelAPI.updateChannel(channelDrawerState.data.id, d)
              } else {
                await channelAPI.createChannel(d)
              }
              await loadAll()
            }}
          />
        )}
      </Drawer>

      {/* NVR Import Drawer — discover channels from NVR and batch create */}
      <Drawer
        open={importDrawer.open}
        onClose={() => setImportDrawer(p => ({ ...p, open: false }))}
        title={t('从 NVR 导入通道')}
        description={importDrawer.nvr ? `${importDrawer.nvr.name} · ${importDrawer.nvr.ip_address} · ${ACCESS_TYPE_LABELS[importDrawer.nvr.access_type ?? 'rtsp']}` : ''}
        footer={
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {importDrawer.selected.size} / {importDrawer.channels.length} {t('选中')}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setImportDrawer(p => ({ ...p, open: false }))}>{t('取消')}</Button>
              <Button
                disabled={importDrawer.importing || importDrawer.selected.size === 0 || importDrawer.loading}
                onClick={async () => {
                  if (!importDrawer.nvr) return
                  setImportDrawer(p => ({ ...p, importing: true }))
                  try {
                    const nvr = importDrawer.nvr!
                    const toImport = importDrawer.channels.filter(c => importDrawer.selected.has(c.channel_number))
                    await Promise.all(toImport.map(ch =>
                      channelAPI.createChannel({
                        nvr_id: nvr.id,
                        property_id: nvr.property_id,
                        channel_number: ch.channel_number,
                        name: ch.name,
                        access_type: nvr.access_type,
                        main_stream_encoding: ch.encoding || 'H.264',
                        main_stream_resolution: ch.resolution || '',
                        is_online: ch.is_online,
                        status: 'active',
                      }),
                    ))
                    setImportDrawer(p => ({ ...p, open: false }))
                    await loadAll()
                  } finally {
                    setImportDrawer(p => ({ ...p, importing: false }))
                  }
                }}
              >
                {importDrawer.importing ? t('导入中...') : t('导入选中 ({{n}})', { n: importDrawer.selected.size })}
              </Button>
            </div>
          </div>
        }
      >
        {importDrawer.loading && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('正在从 NVR 发现通道...')}
          </div>
        )}
        {importDrawer.error && !importDrawer.loading && (
          <div className="flex items-start gap-2 rounded-md bg-red-400/10 px-3 py-2 text-xs text-red-400">
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {importDrawer.error}
          </div>
        )}
        {!importDrawer.loading && importDrawer.channels.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between pb-2 text-xs text-muted-foreground">
              <span>{t('发现 {{n}} 个通道', { n: importDrawer.channels.length })}</span>
              <button
                type="button"
                className="hover:text-foreground"
                onClick={() => setImportDrawer(p => ({
                  ...p,
                  selected: p.selected.size === p.channels.length
                    ? new Set()
                    : new Set(p.channels.map(c => c.channel_number)),
                }))}
              >
                {importDrawer.selected.size === importDrawer.channels.length ? t('全不选') : t('全选')}
              </button>
            </div>
            {importDrawer.channels.map(ch => (
              <label key={ch.channel_number} className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 hover:bg-muted/40">
                <input
                  type="checkbox"
                  className="mt-0.5 shrink-0"
                  checked={importDrawer.selected.has(ch.channel_number)}
                  onChange={e => setImportDrawer(p => {
                    const next = new Set(p.selected)
                    if (e.target.checked) next.add(ch.channel_number)
                    else next.delete(ch.channel_number)
                    return { ...p, selected: next }
                  })}
                />
                <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', ch.is_online ? 'bg-emerald-400' : 'bg-slate-500')} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{ch.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">CH {ch.channel_number}</span>
                  </div>
                  {(ch.ip_address || ch.model || ch.encoding || ch.resolution) && (
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-[10px] text-muted-foreground">
                      {ch.ip_address && <span>{ch.ip_address}</span>}
                      {ch.model && <span>{ch.model}</span>}
                      {ch.encoding && <span className="font-semibold text-foreground/60">{ch.encoding}</span>}
                      {ch.resolution && <span>{ch.resolution}</span>}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </Drawer>

      {/* Delete ConfirmDialog */}
      <ConfirmDialog
        open={delTarget !== null}
        title={t('确认删除')}
        message={t('确认删除「{{n}}」？此操作不可撤销。', { n: delTarget?.label ?? '' })}
        confirmLabel={t('确认删除')}
        variant="destructive"
        onConfirm={async () => {
          if (!delTarget) return
          if (delTarget.type === 'nvr') await nvrAPI.deleteNVR(delTarget.id)
          else await channelAPI.deleteChannel(delTarget.id)
          setDelTarget(null)
          await loadAll()
        }}
        onCancel={() => setDelTarget(null)}
      />
    </>
  )
}

export default DeviceInventoryPage
