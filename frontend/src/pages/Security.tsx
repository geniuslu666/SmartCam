import React, { useEffect, useState } from 'react'
import { Download, Edit2, Plus, RefreshCw, Trash2, Users } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, ConfirmDialog, Drawer, PageHeader, cn } from '../components/ui'
import { userAPI, auditAPI } from '../services/api'
import { useI18n } from '../i18n'

type Mode = 'users' | 'audit'

type UserRow = {
  id: string; username: string; email?: string
  role: 'admin' | 'manager' | 'operator' | 'viewer'
  status: 'active' | 'inactive'
  created_at: string
}
type AuditRow = {
  id: string; action: string; resource_type?: string
  status: 'success' | 'failure'; ip_address?: string
  created_at: string; user_id?: string; details?: string
}

const roleVariant = (r: string) =>
  r === 'admin' ? 'destructive' : r === 'manager' ? 'warning' : 'outline'

const roleLabel = (r: string, t: (k: string) => string) =>
  ({ admin: t('管理员'), manager: t('经理'), operator: t('操作员'), viewer: t('只读') }[r] ?? r)

const inputCls = 'w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">{label}{required && <span className="ml-0.5 text-red-400">*</span>}</label>
      {children}
    </div>
  )
}

// ── Security page ──────────────────────────────────────────────────────────────
const SecurityPage: React.FC<{ mode: Mode }> = ({ mode }) => {
  const { t } = useI18n()
  const isUsers = mode === 'users'

  const [users, setUsers] = useState<UserRow[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(false)
  const [userDrawer, setUserDrawer] = useState<{ open: boolean; user?: UserRow }>({ open: false })
  const [delTarget, setDelTarget] = useState<UserRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')

  // Form state
  const emptyForm = { username: '', email: '', role: 'viewer' as UserRow['role'], status: 'active' as UserRow['status'], password: '' }
  const [form, setForm] = useState(emptyForm)
  const setField = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }))

  const openAdd = () => {
    setForm(emptyForm)
    setFormErr('')
    setUserDrawer({ open: true })
  }

  const openEdit = (u: UserRow) => {
    setForm({ username: u.username, email: u.email ?? '', role: u.role, status: u.status, password: '' })
    setFormErr('')
    setUserDrawer({ open: true, user: u })
  }

  const closeDrawer = () => setUserDrawer({ open: false })

  const load = async () => {
    setLoading(true)
    try {
      if (isUsers) {
        const r = await userAPI.getUsers({ page: 1, limit: 100 })
        setUsers(r.data.data?.items ?? [])
      } else {
        const r = await auditAPI.getLogs({ page: 1, limit: 100 })
        setAuditLogs(r.data.data?.items ?? [])
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [mode])

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const isEdit = !!userDrawer.user
    if (!form.username && !isEdit) { setFormErr(t('用户名不能为空')); return }
    if (!form.password && !isEdit) { setFormErr(t('密码不能为空')); return }
    setSaving(true); setFormErr('')
    try {
      if (isEdit) {
        await userAPI.updateUser(userDrawer.user!.id, {
          role: form.role, email: form.email, status: form.status, password: form.password,
        })
      } else {
        await userAPI.createUser({ username: form.username, password: form.password, role: form.role, email: form.email || undefined })
      }
      closeDrawer()
      await load()
    } catch {
      setFormErr(t('保存失败'))
    } finally {
      setSaving(false)
    }
  }

  const exportCSV = () => {
    const rows = [[t('时间'), t('动作'), t('资源类型'), t('结果'), 'IP'], ...auditLogs.map((r) => [r.created_at, r.action, r.resource_type ?? '', r.status, r.ip_address ?? ''])]
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'audit-logs.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHeader
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            {isUsers ? (
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t('新增用户')}</span>
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={exportCSV}>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">{t('导出 CSV')}</span>
              </Button>
            )}
          </div>
        }
        description={isUsers ? t('管理系统账号和角色权限。') : t('记录用户的关键操作行为。')}
        title={isUsers ? t('用户权限') : t('审计日志')}
      />

      <div className="p-4 md:p-6">
        {isUsers ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('账号列表')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">{t('加载中...')}</div>
              ) : users.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">{t('暂无用户')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[400px] text-sm">
                    <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">{t('用户名')}</th>
                        <th className="hidden sm:table-cell px-4 py-3 text-left font-medium">{t('邮箱')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('角色')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('状态')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('操作')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr className="border-b border-border last:border-0 hover:bg-muted/20" key={u.id}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                                {u.username.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium">{u.username}</span>
                            </div>
                          </td>
                          <td className="hidden sm:table-cell px-4 py-3 text-muted-foreground">{u.email || '-'}</td>
                          <td className="px-4 py-3">
                            <Badge variant={roleVariant(u.role)}>{roleLabel(u.role, t)}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={u.status === 'active' ? 'success' : 'secondary'}>
                              {u.status === 'active' ? t('正常') : t('禁用')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="outline" onClick={() => openEdit(u)} title={t('编辑')}>
                                <Edit2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline ml-1">{t('编辑')}</span>
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-400/10" onClick={() => setDelTarget(u)} title={t('删除')}>
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
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t('操作记录')}</CardTitle>
              <Badge variant="outline">{t('最近 {{n}} 条', { n: auditLogs.length })}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">{t('加载中...')}</div>
              ) : auditLogs.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">{t('暂无审计记录')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">{t('时间')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('动作')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('资源类型')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('结果')}</th>
                        <th className="hidden md:table-cell px-4 py-3 text-left font-medium">IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((row) => (
                        <tr className="border-b border-border last:border-0 hover:bg-muted/20" key={row.id}>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(row.created_at).toLocaleString('zh-CN')}
                          </td>
                          <td className="px-4 py-3 font-medium">{row.action}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.resource_type || '-'}</td>
                          <td className="px-4 py-3">
                            <Badge variant={row.status === 'success' ? 'success' : 'destructive'}>
                              {row.status === 'success' ? t('成功') : t('失败')}
                            </Badge>
                          </td>
                          <td className="hidden md:table-cell px-4 py-3 font-mono text-xs text-muted-foreground">{row.ip_address || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* User Drawer */}
      <Drawer
        open={userDrawer.open}
        onClose={closeDrawer}
        title={userDrawer.user ? t('编辑用户') : t('新增用户')}
        description={t('配置账号和角色权限')}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeDrawer}>{t('取消')}</Button>
            <Button form="user-form" type="submit" disabled={saving}>
              {saving ? t('保存中...') : t('保存')}
            </Button>
          </div>
        }
      >
        <form id="user-form" onSubmit={handleUserSubmit} className="space-y-4">
          {!userDrawer.user && (
            <Field label={t('用户名')} required>
              <input
                className={inputCls}
                value={form.username}
                onChange={(e) => setField('username', e.target.value)}
                autoComplete="off"
                placeholder={t('用户名')}
              />
            </Field>
          )}
          <Field label={t('邮箱')}>
            <input
              type="email"
              className={inputCls}
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              placeholder="user@example.com"
            />
          </Field>
          <Field label={t('角色')} required>
            <select className={inputCls} value={form.role} onChange={(e) => setField('role', e.target.value)}>
              <option value="admin">{t('管理员')}</option>
              <option value="manager">{t('经理')}</option>
              <option value="operator">{t('操作员')}</option>
              <option value="viewer">{t('只读')}</option>
            </select>
          </Field>
          {userDrawer.user && (
            <Field label={t('状态')}>
              <select className={inputCls} value={form.status} onChange={(e) => setField('status', e.target.value)}>
                <option value="active">{t('正常')}</option>
                <option value="inactive">{t('禁用')}</option>
              </select>
            </Field>
          )}
          <Field label={userDrawer.user ? t('新密码（留空不修改）') : t('密码')} required={!userDrawer.user}>
            <input
              type="password"
              className={inputCls}
              value={form.password}
              onChange={(e) => setField('password', e.target.value)}
              autoComplete="new-password"
              placeholder={userDrawer.user ? t('留空则不修改密码') : ''}
            />
          </Field>
          {formErr && <p className="text-xs text-red-400">{formErr}</p>}
        </form>
      </Drawer>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!delTarget}
        title={t('删除确认')}
        message={delTarget ? t('确认删除用户「{{n}}」？', { n: delTarget.username }) : ''}
        confirmLabel={t('确认删除')}
        onConfirm={async () => {
          if (!delTarget) return
          await userAPI.deleteUser(delTarget.id)
          setDelTarget(null)
          await load()
        }}
        onCancel={() => setDelTarget(null)}
      />
    </>
  )
}

export default SecurityPage
