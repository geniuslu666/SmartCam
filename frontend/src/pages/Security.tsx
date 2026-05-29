import React from 'react'
import { Download, Plus, ShieldCheck, Users } from 'lucide-react'
import { auditRows } from '../data/mock'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, PageHeader } from '../components/ui'
import { useI18n } from '../i18n'

type Mode = 'users' | 'audit'

const SecurityPage: React.FC<{ mode: Mode }> = ({ mode }) => {
  const isUsers = mode === 'users'
  const { t } = useI18n()

  return (
    <>
      <PageHeader
        action={
          <Button size="sm">
            {isUsers ? <Plus className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            {isUsers ? t('新增用户') : t('导出')}
          </Button>
        }
        description={isUsers ? t('按物业和摄像头范围授权，ZLM secret 不暴露给前端。') : t('记录谁在什么时间看了哪个摄像头，以及失败原因。')}
        title={isUsers ? t('用户权限') : t('审计日志')}
      />

      <div className="p-6">
        {isUsers ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('账号与角色')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-3">
              {[
                ['admin', '系统管理员', '全部物业'],
                ['manager01', '物业经理', '测试物业 A'],
                ['operator01', '值班员', '测试物业 A / 预览'],
              ].map(([name, role, scope]) => (
                <div className="rounded-md border border-border bg-background p-4" key={name}>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{name}</div>
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">{t(role)}</div>
                  <Badge className="mt-3" variant="outline">{t(scope)}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t('最近记录')}</CardTitle>
              <Badge variant="outline">{t('保留留痕')}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t('时间')}</th>
                    <th className="px-4 py-3 font-medium">{t('用户')}</th>
                    <th className="px-4 py-3 font-medium">{t('动作')}</th>
                    <th className="px-4 py-3 font-medium">{t('对象')}</th>
                    <th className="px-4 py-3 font-medium">{t('结果')}</th>
                  </tr>
                </thead>
                <tbody>
                  {auditRows.map((row) => (
                    <tr className="border-b border-border last:border-0" key={`${row.time}-${row.action}`}>
                      <td className="px-4 py-3 font-mono text-xs">{row.time}</td>
                      <td className="px-4 py-3">{row.user}</td>
                      <td className="px-4 py-3">{t(row.action)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t(row.target)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={row.status === 'success' ? 'success' : 'destructive'}>
                          {row.status === 'success' ? t('成功') : t('失败')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}

export default SecurityPage
