import React from 'react'
import { Save, Server, Shield, TimerReset } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, PageHeader } from '../components/ui'
import { useI18n } from '../i18n'

const ConfigPanelPage: React.FC = () => {
  const { t } = useI18n()

  return (
    <>
      <PageHeader
        action={
          <Button size="sm">
            <Save className="h-4 w-4" />
            {t('保存配置')}
          </Button>
        }
        description={t('第一版保留关键控制项：并发、自动释放、ZLM 地址和播放令牌。')}
        title={t('系统配置')}
      />

      <div className="grid gap-4 p-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('播放策略')}</CardTitle>
            <TimerReset className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              ['默认码流', 'H.264 子码流'],
              ['无人释放', '30 秒'],
              ['单用户并发', '4 路'],
              ['单物业并发', '16 路'],
            ].map(([label, value]) => (
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2" key={label}>
                <span className="text-sm text-muted-foreground">{t(label)}</span>
                <span className="text-sm font-medium">{t(value)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ZLMediaKit</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-border px-3 py-2">
              <div className="text-xs text-muted-foreground">{t('后端内部 API 地址')}</div>
              <div className="mt-1 font-mono text-xs">http://127.0.0.1:8080</div>
            </div>
            <div className="rounded-md border border-border px-3 py-2">
              <div className="text-xs text-muted-foreground">{t('浏览器播放地址')}</div>
              <div className="mt-1 font-mono text-xs">{t('http://服务器IP:8080')}</div>
            </div>
            <div className="rounded-md border border-border px-3 py-2">
              <div className="text-xs text-muted-foreground">Hook</div>
              <div className="mt-2 flex gap-2">
                <Badge variant="success">not_found</Badge>
                <Badge variant="success">none_reader</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('安全基线')}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {['NVR 不暴露公网', 'ZLM secret 仅后端使用', '播放地址短期 token', '观看行为写审计日志'].map((item) => (
              <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2" key={item}>
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {t(item)}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default ConfigPanelPage
