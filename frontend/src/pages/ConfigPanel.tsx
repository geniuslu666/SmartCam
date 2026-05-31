import React, { useEffect, useState } from 'react'
import { CheckCircle2, RefreshCw, Server, Shield, TimerReset, Wifi, XCircle } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, PageHeader, cn } from '../components/ui'
import { healthAPI } from '../services/api'
import api from '../services/api'
import { useI18n } from '../i18n'

type ConfigData = {
  zlm: { api_url: string; public_url: string; enabled: boolean }
  play: {
    session_timeout_seconds: number
    max_concurrent_streams_per_user: number
    max_concurrent_streams_per_property: number
    stream_idle_timeout_seconds: number
  }
  server: { port: number; mode: string }
}

type HealthData = {
  services: { name: string; ok: boolean; detail?: string }[]
  active_sessions: number
}

function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-medium', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  )
}

const ConfigPanelPage: React.FC = () => {
  const { t } = useI18n()
  const [cfg, setCfg] = useState<ConfigData | null>(null)
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [cfgRes, healthRes] = await Promise.all([
        api.get('/config'),
        healthAPI.getDetailed(),
      ])
      setCfg(cfgRes.data.data)
      setHealth(healthRes.data.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <>
      <PageHeader
        action={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            {t('刷新')}
          </Button>
        }
        description={t('查看当前运行配置和服务健康状态。配置项通过 .env 文件修改后重启生效。')}
        title={t('系统配置')}
      />

      <div className="grid gap-4 p-4 md:p-6 xl:grid-cols-3">
        {/* Play policy */}
        <Card>
          <CardHeader>
            <CardTitle>{t('播放策略')}</CardTitle>
            <TimerReset className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <InfoRow label={t('Session 超时')} value={cfg ? `${cfg.play.session_timeout_seconds}s` : '-'} />
            <InfoRow label={t('无人观看释放')} value={cfg ? `${cfg.play.stream_idle_timeout_seconds}s` : '-'} />
            <InfoRow label={t('单用户并发上限')} value={cfg ? `${cfg.play.max_concurrent_streams_per_user} 路` : '-'} />
            <InfoRow label={t('单物业并发上限')} value={cfg ? `${cfg.play.max_concurrent_streams_per_property} 路` : '-'} />
            <p className="pt-1 text-xs text-muted-foreground">{t('修改请编辑 .env 后重启后端服务')}</p>
          </CardContent>
        </Card>

        {/* ZLM */}
        <Card>
          <CardHeader>
            <CardTitle>ZLMediaKit</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <InfoRow
              label={t('状态')}
              value={
                cfg ? (
                  <Badge variant={cfg.zlm.enabled ? 'success' : 'secondary'}>
                    {cfg.zlm.enabled ? t('已启用') : t('已禁用')}
                  </Badge>
                ) : '-'}
            />
            <InfoRow label={t('内部 API')} value={cfg?.zlm.api_url ?? '-'} mono />
            <InfoRow label={t('浏览器播放地址')} value={cfg?.zlm.public_url ?? '-'} mono />
            <div className="rounded-md border border-border px-3 py-2.5">
              <div className="mb-1.5 text-xs text-muted-foreground">Hooks</div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline">on_stream_not_found</Badge>
                <Badge variant="outline">on_stream_none_reader</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security baseline */}
        <Card>
          <CardHeader>
            <CardTitle>{t('安全基线')}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              t('NVR 不暴露公网，仅内网访问'),
              t('ZLM secret 仅后端持有'),
              t('播放地址含短期 token'),
              t('观看行为写入审计日志'),
              t('NVR 密码后端加密存储'),
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-md border border-border px-3 py-2.5 text-sm">
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Service health */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t('服务状态')}</CardTitle>
            <Badge variant="outline">{t('活跃并发：{{n}} 路', { n: health?.active_sessions ?? '-' })}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {!health && (
              <div className="py-4 text-center text-sm text-muted-foreground">{loading ? t('检测中...') : t('暂无数据')}</div>
            )}
            {health?.services.map((s) => (
              <div key={s.name} className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  {s.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
                  <div>
                    <div className="text-sm font-medium">{s.name}</div>
                    {s.detail && <div className="text-xs text-muted-foreground">{s.detail}</div>}
                  </div>
                </div>
                <Badge variant={s.ok ? 'success' : 'destructive'}>{s.ok ? t('正常') : t('异常')}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Server */}
        <Card>
          <CardHeader>
            <CardTitle>{t('后端服务')}</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <InfoRow label={t('监听端口')} value={cfg ? `:${cfg.server.port}` : '-'} mono />
            <InfoRow label={t('运行模式')} value={cfg ? (
              <Badge variant={cfg.server.mode === 'release' ? 'success' : 'warning'}>{cfg.server.mode}</Badge>
            ) : '-'} />
            <InfoRow label={t('API 前缀')} value="/api" mono />
            <InfoRow label={t('认证方式')} value="JWT Bearer" />
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default ConfigPanelPage
