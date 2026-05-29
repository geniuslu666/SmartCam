import React from 'react'
import { Activity, AlertTriangle, CheckCircle2, Play, RadioTower, RotateCw } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, PageHeader, StatCard } from '../components/ui'
import { useI18n } from '../i18n'

type Mode = 'diagnostics' | 'patrol'

const OperationsPage: React.FC<{ mode: Mode }> = ({ mode }) => {
  const isPatrol = mode === 'patrol'
  const { t } = useI18n()

  return (
    <>
      <PageHeader
        action={
          <Button size="sm">
            {isPatrol ? <Play className="h-4 w-4" /> : <RotateCw className="h-4 w-4" />}
            {isPatrol ? t('启动轮巡') : t('开始诊断')}
          </Button>
        }
        description={isPatrol ? t('控制轮巡并发，不一次拉满所有物业。') : t('检查 NVR 连通性、RTSP 拉流和 ZLM 代理状态。')}
        title={isPatrol ? t('大屏轮巡') : t('运维诊断')}
      />

      <div className="space-y-4 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard detail={t('ZLM / DB / Redis 正常')} icon={<CheckCircle2 className="h-5 w-5" />} label={t('核心服务')} value="3/3" />
          <StatCard detail={t('限制单物业 16 路')} icon={<RadioTower className="h-5 w-5" />} label={t('并发策略')} value={t('已启用')} />
          <StatCard detail={t('通道 8 拉流失败')} icon={<AlertTriangle className="h-5 w-5" />} label={t('待处理')} value="1" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isPatrol ? t('轮巡计划') : t('诊断项目')}</CardTitle>
            <Badge variant="outline">{t('测试物业 A')}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              ['NVR 管理端口', '10.60.1.10:80', 'success'],
              ['RTSP 子码流探测', '通道 1-16 / 554', 'success'],
              ['ZLM addStreamProxy', 'live/cam-001-sub', 'success'],
              ['无人观看释放', '20 秒 none_reader', 'warning'],
            ].map(([name, target, status]) => (
              <div className="flex items-center justify-between rounded-md border border-border px-4 py-3" key={name}>
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">{t(name)}</div>
                    <div className="text-xs text-muted-foreground">{t(target)}</div>
                  </div>
                </div>
                <Badge variant={status === 'success' ? 'success' : 'warning'}>
                  {status === 'success' ? t('正常') : t('观察中')}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default OperationsPage
