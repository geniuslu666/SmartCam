import React, { useEffect, useState } from 'react'
import {
  BookOpen, Check, ChevronDown, ChevronRight,
  Copy, Edit2, Info, Lock, Plus, RefreshCw, Trash2,
} from 'lucide-react'
import { Button, ConfirmDialog, Drawer, PageHeader, cn } from '../components/ui'
import { brandTemplateAPI } from '../services/api'
import { useI18n } from '../i18n'

export type BrandTemplate = {
  id: string
  name: string
  brand: string
  description?: string
  rtsp_main_url_template: string
  rtsp_sub_url_template: string
  default_rtsp_port: number
  default_http_port: number
  default_username: string
  notes?: string
  is_system: boolean
}

// ── Brand metadata ─────────────────────────────────────────────────────────────
const BRANDS: Record<string, { label: string; color: string; accent: string }> = {
  hikvision: { label: '海康威视', color: 'bg-red-500/10 text-red-300 border-red-500/30', accent: 'bg-red-500' },
  dahua:     { label: '大华',     color: 'bg-orange-500/10 text-orange-300 border-orange-500/30', accent: 'bg-orange-500' },
  uniview:   { label: '宇视',     color: 'bg-blue-500/10 text-blue-300 border-blue-500/30', accent: 'bg-blue-500' },
  axis:      { label: 'Axis',    color: 'bg-purple-500/10 text-purple-300 border-purple-500/30', accent: 'bg-purple-500' },
  hanwha:    { label: 'Hanwha',  color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30', accent: 'bg-cyan-500' },
  reolink:   { label: 'Reolink', color: 'bg-green-500/10 text-green-300 border-green-500/30', accent: 'bg-green-500' },
  onvif:     { label: 'ONVIF',   color: 'bg-slate-500/10 text-slate-300 border-slate-500/30', accent: 'bg-slate-400' },
  other:     { label: '其他',     color: 'bg-muted text-muted-foreground border-border', accent: 'bg-muted-foreground' },
}

const inputCls = 'w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring'

function Field({ label, required, children, hint }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label}{required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground italic">{hint}</p>}
    </div>
  )
}

// ── Copy button ────────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      title="复制"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

// ── Template card ──────────────────────────────────────────────────────────────
function TemplateCard({ tmpl, onEdit, onDelete }: {
  tmpl: BrandTemplate
  onEdit: () => void
  onDelete: () => void
}) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const brand = BRANDS[tmpl.brand] ?? BRANDS.other

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md hover:shadow-black/20">
      {/* Brand accent bar */}
      <div className={cn('absolute left-0 inset-y-0 w-1', brand.accent)} />

      <div className="pl-4 pr-3 pt-3 pb-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn('inline-flex rounded border px-1.5 py-0.5 text-xs font-medium', brand.color)}>
                {brand.label}
              </span>
              {tmpl.is_system && (
                <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  {t('内置')}
                </span>
              )}
            </div>
            <h3 className="mt-1.5 font-semibold text-foreground leading-snug">{tmpl.name}</h3>
            {tmpl.description && (
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{tmpl.description}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button size="sm" variant="outline" onClick={onEdit} title={t('编辑')}>
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            {!tmpl.is_system && (
              <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-400/10" onClick={onDelete} title={t('删除')}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Chips */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono">:{tmpl.default_rtsp_port}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono">HTTP:{tmpl.default_http_port}</span>
          <span className="rounded bg-muted px-1.5 py-0.5">{t('用户')}：{tmpl.default_username}</span>
        </div>

        {/* Expand toggle */}
        <button
          type="button"
          className="mt-3 flex w-full items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5" />
            : <ChevronRight className="h-3.5 w-3.5" />}
          {t('RTSP 地址模板')}
        </button>

        {/* RTSP templates */}
        {expanded && (
          <div className="mt-2 space-y-2 rounded-md border border-border bg-background p-3">
            {[
              { label: t('主码流'), value: tmpl.rtsp_main_url_template },
              { label: t('子码流'), value: tmpl.rtsp_sub_url_template },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="mb-0.5 text-xs font-medium text-muted-foreground">{label}</div>
                <div className="flex items-start gap-1.5">
                  <code className="flex-1 break-all text-xs text-foreground/80 leading-relaxed">{value}</code>
                  <CopyBtn text={value} />
                </div>
              </div>
            ))}
            {tmpl.notes && (
              <div className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground italic">
                {tmpl.notes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
const BrandTemplatesPage: React.FC = () => {
  const { t } = useI18n()
  const [templates, setTemplates] = useState<BrandTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [activeBrand, setActiveBrand] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [varOpen, setVarOpen] = useState(false)
  const [templateDrawer, setTemplateDrawer] = useState<{ open: boolean; template?: BrandTemplate }>({ open: false })
  const [delTarget, setDelTarget] = useState<BrandTemplate | null>(null)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')

  const emptyForm = {
    name: '', brand: 'other', description: '',
    rtsp_main_url_template: 'rtsp://{username}:{password}@{ip}:{port}/stream1',
    rtsp_sub_url_template: 'rtsp://{username}:{password}@{ip}:{port}/stream2',
    default_rtsp_port: 554, default_http_port: 80,
    default_username: 'admin', notes: '',
  }
  const [form, setFormState] = useState(emptyForm)
  const setField = (k: string, v: unknown) => setFormState((p) => ({ ...p, [k]: v }))

  const openAdd = () => {
    setFormState(emptyForm)
    setFormErr('')
    setTemplateDrawer({ open: true })
  }

  const openEdit = (tmpl: BrandTemplate) => {
    setFormState({
      name: tmpl.name,
      brand: tmpl.brand,
      description: tmpl.description ?? '',
      rtsp_main_url_template: tmpl.rtsp_main_url_template,
      rtsp_sub_url_template: tmpl.rtsp_sub_url_template,
      default_rtsp_port: tmpl.default_rtsp_port,
      default_http_port: tmpl.default_http_port,
      default_username: tmpl.default_username,
      notes: tmpl.notes ?? '',
    })
    setFormErr('')
    setTemplateDrawer({ open: true, template: tmpl })
  }

  const closeDrawer = () => setTemplateDrawer({ open: false })

  const load = async () => {
    setLoading(true)
    try {
      const r = await brandTemplateAPI.getAll()
      setTemplates(r.data.data?.items ?? [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.rtsp_main_url_template) { setFormErr(t('请填写必填项')); return }
    setSaving(true); setFormErr('')
    try {
      if (templateDrawer.template) {
        await brandTemplateAPI.update(templateDrawer.template.id, form)
      } else {
        await brandTemplateAPI.create(form)
      }
      closeDrawer()
      await load()
    } catch {
      setFormErr(t('保存失败'))
    } finally {
      setSaving(false)
    }
  }

  // Brand counts
  const brandCounts = templates.reduce<Record<string, number>>((acc, tmpl) => {
    acc[tmpl.brand] = (acc[tmpl.brand] ?? 0) + 1
    return acc
  }, {})

  // Filtered templates
  const visible = templates.filter((tmpl) => {
    const matchBrand = activeBrand === 'all' || tmpl.brand === activeBrand
    const matchSearch = !search || tmpl.name.toLowerCase().includes(search.toLowerCase())
    return matchBrand && matchSearch
  })

  const brandsWithCount = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])

  // Template variable reference list
  const VARIABLES = [
    ['{username}', t('NVR 用户名')],
    ['{password}', t('NVR 密码（自动填入）')],
    ['{ip}',       t('NVR 内网 IP')],
    ['{port}',     t('RTSP 端口')],
    ['{channel_number}', t('通道编号，如 1→101')],
  ]

  return (
    <>
      <PageHeader
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('新增模板')}</span>
            </Button>
          </div>
        }
        description={t('预置各品牌 RTSP 地址模板，新增 NVR 时一键套用，自动填充端口和用户名。')}
        title={t('品牌模板')}
      />

      <div className="flex h-[calc(100vh-8.5rem)] overflow-hidden">
        {/* ── Left: brand sidebar ── */}
        <aside className="hidden w-52 shrink-0 flex-col border-r border-border bg-card md:flex">
          {/* Search */}
          <div className="border-b border-border px-3 py-3">
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder={t('搜索模板名称...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* All */}
          <button
            type="button"
            onClick={() => setActiveBrand('all')}
            className={cn(
              'flex items-center justify-between px-4 py-2.5 text-sm transition-colors',
              activeBrand === 'all'
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <span>{t('全部')}</span>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs">{templates.length}</span>
          </button>

          {/* By brand */}
          <div className="flex-1 overflow-y-auto">
            {brandsWithCount.map(([brand, count]) => {
              const meta = BRANDS[brand] ?? BRANDS.other
              return (
                <button
                  key={brand}
                  type="button"
                  onClick={() => setActiveBrand(brand)}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition-colors',
                    activeBrand === brand
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', meta.accent)} />
                  <span className="flex-1 truncate text-left">{meta.label}</span>
                  <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-xs">{count}</span>
                </button>
              )
            })}
          </div>

          {/* Variable reference toggle */}
          <div className="border-t border-border">
            <button
              type="button"
              onClick={() => setVarOpen((v) => !v)}
              className="flex w-full items-center gap-2 px-4 py-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Info className="h-3.5 w-3.5" />
              {t('模板变量说明')}
              {varOpen ? <ChevronDown className="ml-auto h-3.5 w-3.5" /> : <ChevronRight className="ml-auto h-3.5 w-3.5" />}
            </button>
            {varOpen && (
              <div className="border-t border-border bg-background px-4 py-3 space-y-2">
                {VARIABLES.map(([v, desc]) => (
                  <div key={v} className="flex items-start gap-2">
                    <code className="shrink-0 text-xs font-medium text-primary">{v}</code>
                    <span className="text-xs text-muted-foreground">{desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ── Right: template grid ── */}
        <div className="flex-1 overflow-y-auto">
          {/* Mobile search bar */}
          <div className="border-b border-border px-4 py-3 md:hidden">
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder={t('搜索...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Mobile brand filter */}
          <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-2 md:hidden">
            {[['all', t('全部')], ...brandsWithCount.map(([b]) => [b, BRANDS[b]?.label ?? b])].map(([brand, label]) => (
              <button key={brand} type="button"
                onClick={() => setActiveBrand(brand)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1 text-xs transition-colors',
                  activeBrand === brand ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:border-foreground',
                )}>
                {label}
              </button>
            ))}
          </div>

          <div className="p-4 md:p-5">
            {/* Active brand label */}
            <div className="mb-4 flex items-center gap-3">
              {activeBrand !== 'all' && (
                <div className="flex items-center gap-2">
                  <span className={cn('inline-flex h-2 w-2 rounded-full', BRANDS[activeBrand]?.accent)} />
                  <span className="text-sm font-medium">{BRANDS[activeBrand]?.label ?? activeBrand}</span>
                </div>
              )}
              <span className="text-sm text-muted-foreground">{visible.length} {t('个模板')}</span>
              {(activeBrand !== 'all' || search) && (
                <button type="button" onClick={() => { setActiveBrand('all'); setSearch('') }}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground">
                  {t('清除筛选')}
                </button>
              )}
            </div>

            {loading && (
              <div className="py-12 text-center text-sm text-muted-foreground">{t('加载中...')}</div>
            )}
            {!loading && visible.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                <BookOpen className="h-10 w-10 opacity-25" />
                <p className="text-sm">{search ? t('没有匹配的模板') : t('暂无模板，点击「新增模板」')}</p>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((tmpl) => (
                <TemplateCard
                  key={tmpl.id}
                  tmpl={tmpl}
                  onEdit={() => openEdit(tmpl)}
                  onDelete={() => setDelTarget(tmpl)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Template Drawer */}
      <Drawer
        open={templateDrawer.open}
        onClose={closeDrawer}
        title={templateDrawer.template ? t('编辑模板') : t('新增品牌模板')}
        description={t('配置品牌 RTSP 地址模板')}
        width="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeDrawer}>{t('取消')}</Button>
            <Button form="template-form" type="submit" disabled={saving}>
              {saving ? t('保存中...') : t('保存')}
            </Button>
          </div>
        }
      >
        <form id="template-form" onSubmit={handleTemplateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('模板名称')} required>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder={t('海康威视 NVR')}
              />
            </Field>
            <Field label={t('品牌')} required>
              <select className={inputCls} value={form.brand} onChange={(e) => setField('brand', e.target.value)}>
                {Object.entries(BRANDS).map(([v, b]) => <option key={v} value={v}>{b.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label={t('描述')}>
            <input
              className={inputCls}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
            />
          </Field>
          <Field
            label={t('主码流 RTSP 模板')} required
            hint={t('变量：{username} {password} {ip} {port} {channel_number}')}
          >
            <input
              className={cn(inputCls, 'font-mono text-xs')}
              value={form.rtsp_main_url_template}
              onChange={(e) => setField('rtsp_main_url_template', e.target.value)}
            />
          </Field>
          <Field label={t('子码流 RTSP 模板')} required>
            <input
              className={cn(inputCls, 'font-mono text-xs')}
              value={form.rtsp_sub_url_template}
              onChange={(e) => setField('rtsp_sub_url_template', e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('RTSP 端口')}>
              <input
                type="number"
                className={inputCls}
                value={form.default_rtsp_port}
                onChange={(e) => setField('default_rtsp_port', +e.target.value)}
              />
            </Field>
            <Field label={t('HTTP 端口')}>
              <input
                type="number"
                className={inputCls}
                value={form.default_http_port}
                onChange={(e) => setField('default_http_port', +e.target.value)}
              />
            </Field>
          </div>
          <Field label={t('默认用户名')}>
            <input
              className={inputCls}
              value={form.default_username}
              onChange={(e) => setField('default_username', e.target.value)}
            />
          </Field>
          <Field label={t('备注')}>
            <textarea
              className={cn(inputCls, 'h-16 resize-none')}
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder={t('通道编号规则、特殊说明等')}
            />
          </Field>
          {formErr && <p className="text-xs text-red-400">{formErr}</p>}
        </form>
      </Drawer>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!delTarget}
        title={t('删除确认')}
        message={delTarget ? t('确认删除模板「{{n}}」？此操作不可撤销。', { n: delTarget.name }) : ''}
        confirmLabel={t('删除')}
        onConfirm={async () => {
          if (!delTarget) return
          await brandTemplateAPI.delete(delTarget.id)
          setDelTarget(null)
          await load()
        }}
        onCancel={() => setDelTarget(null)}
      />
    </>
  )
}

export default BrandTemplatesPage
