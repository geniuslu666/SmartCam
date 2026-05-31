import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight,
  Pause, Play, RadioTower, RefreshCw, RotateCw, XCircle,
} from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, PageHeader, StatCard, cn } from '../components/ui'
import { channelAPI, healthAPI, sessionAPI } from '../services/api'
import VideoPlayer from '../components/VideoPlayer'
import { useI18n } from '../i18n'

type Mode = 'diagnostics' | 'patrol'

// ── Diagnostics ───────────────────────────────────────────────────────────────
function DiagnosticsView() {
  const { t } = useI18n()
  const [data, setData] = useState<{
    services: { name: string; ok: boolean; detail?: string }[]
    active_sessions: number
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const run = async () => {
    setLoading(true)
    try {
      const res = await healthAPI.getDetailed()
      setData(res.data.data)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { run() }, [])

  const allOK = data?.services.every((s) => s.ok) ?? false

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <StatCard
          detail={data ? (allOK ? t('全部正常') : t('有服务异常')) : t('检查中...')}
          icon={allOK ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          label={t('核心服务')}
          value={data ? `${data.services.filter((s) => s.ok).length}/${data.services.length}` : '-'}
        />
        <StatCard
          detail={t('活跃播放 session')}
          icon={<RadioTower className="h-5 w-5" />}
          label={t('当前并发')}
          value={data ? String(data.active_sessions) : '-'}
        />
        <StatCard
          detail={t('最近一次诊断')}
          icon={<Activity className="h-5 w-5" />}
          label={t('诊断状态')}
          value={loading ? t('检测中') : data ? t('完成') : t('未知')}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('服务健康')}</CardTitle>
          <Button size="sm" variant="outline" onClick={run} disabled={loading}>
            <RotateCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            {t('重新检测')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {!data && (
            <div className="py-6 text-center text-sm text-muted-foreground">{loading ? t('检测中...') : t('点击「重新检测」开始')}</div>
          )}
          {data?.services.map((svc) => (
            <div key={svc.name} className="flex items-center justify-between rounded-md border border-border px-4 py-3">
              <div className="flex items-center gap-3">
                {svc.ok
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  : <XCircle className="h-4 w-4 text-red-400" />}
                <div>
                  <div className="text-sm font-medium">{svc.name}</div>
                  {svc.detail && <div className="text-xs text-muted-foreground">{svc.detail}</div>}
                </div>
              </div>
              <Badge variant={svc.ok ? 'success' : 'destructive'}>{svc.ok ? t('正常') : t('异常')}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Patrol ────────────────────────────────────────────────────────────────────
type ChannelItem = { id: string; name: string; location?: string; is_online: boolean }
type ActiveStream = { sessionId: string; streamUrl: string }

const INTERVALS = [5, 10, 15, 30, 60]

function PatrolView() {
  const { t } = useI18n()
  const [channels, setChannels] = useState<ChannelItem[]>([])
  const [index, setIndex] = useState(0)
  const [running, setRunning] = useState(false)
  const [interval, setInterval2] = useState(10)
  const [stream, setStream] = useState<ActiveStream | null>(null)
  const [layout, setLayout] = useState<1 | 4>(1)
  const sessionRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    channelAPI.getChannels({ limit: 200 }).then((r) => {
      setChannels((r.data.data ?? []).filter((c: ChannelItem) => c.is_online))
    }).catch(() => {})
    return () => { stopStream(); stopTimer() }
  }, [])

  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }

  const stopStream = async () => {
    if (sessionRef.current) {
      await sessionAPI.endSession(sessionRef.current).catch(() => undefined)
      sessionRef.current = null
    }
    setStream(null)
  }

  const startStream = async (ch: ChannelItem) => {
    await stopStream()
    try {
      const res = await sessionAPI.createSession({ channel_id: ch.id, stream_type: 'sub', protocol: 'http-flv' })
      const d = res.data.data
      sessionRef.current = d.session_id
      setStream({ sessionId: d.session_id, streamUrl: d.stream_url })
    } catch { /* ignore */ }
  }

  const goTo = async (idx: number) => {
    const ch = channels[idx]
    if (!ch) return
    setIndex(idx)
    await startStream(ch)
  }

  const startPatrol = () => {
    if (channels.length === 0) return
    setRunning(true)
    goTo(index)
    timerRef.current = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % channels.length
        goTo(next)
        return next
      })
    }, interval * 1000)
  }

  const stopPatrol = () => {
    setRunning(false)
    stopTimer()
    stopStream()
  }

  const current = channels[index]

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Controls */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 pt-4">
          <Button onClick={running ? stopPatrol : startPatrol} variant={running ? 'destructive' : 'default'} disabled={channels.length === 0}>
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {running ? t('停止轮巡') : t('启动轮巡')}
          </Button>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t('切换间隔')}</span>
            <div className="flex rounded-md border border-border bg-background p-0.5">
              {INTERVALS.map((s) => (
                <button key={s} type="button"
                  className={cn('rounded px-2 py-1 text-xs transition-colors', interval === s ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground')}
                  onClick={() => setInterval2(s)}>{s}s</button>
              ))}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t('{{n}} 路在线', { n: channels.length })}</span>
            {running && current && (
              <Badge variant="success">{t('轮巡中')} · {current.name}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_240px]">
        {/* Video */}
        <div className="space-y-2">
          <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-black">
            {stream ? (
              <VideoPlayer protocol="http-flv" streamUrl={stream.streamUrl} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {channels.length === 0 ? t('无在线通道') : t('点击启动轮巡')}
              </div>
            )}
            {current && (
              <div className="absolute bottom-3 left-3 rounded bg-black/70 px-2 py-1 text-xs text-white">
                {current.name}{current.location ? ` · ${current.location}` : ''}
              </div>
            )}
          </div>
          {/* manual prev/next */}
          <div className="flex items-center justify-center gap-3">
            <Button size="sm" variant="outline" onClick={() => goTo((index - 1 + channels.length) % channels.length)} disabled={channels.length === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">{channels.length > 0 ? `${index + 1} / ${channels.length}` : '-'}</span>
            <Button size="sm" variant="outline" onClick={() => goTo((index + 1) % channels.length)} disabled={channels.length === 0}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Channel list */}
        <Card>
          <CardHeader><CardTitle>{t('通道列表')}</CardTitle></CardHeader>
          <CardContent className="p-0 max-h-[calc(100vh-20rem)] overflow-y-auto">
            {channels.map((ch, i) => (
              <button key={ch.id} type="button"
                className={cn('flex w-full items-center gap-2 border-b border-border px-3 py-2.5 text-left text-sm last:border-0 hover:bg-muted/30 transition-colors',
                  i === index && 'bg-accent/30')}
                onClick={() => goTo(i)}>
                <span className={cn('h-2 w-2 shrink-0 rounded-full', i === index && running ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-400/50')} />
                <div className="min-w-0">
                  <div className="truncate font-medium">{ch.name}</div>
                  {ch.location && <div className="truncate text-xs text-muted-foreground">{ch.location}</div>}
                </div>
              </button>
            ))}
            {channels.length === 0 && (
              <div className="p-4 text-center text-xs text-muted-foreground">{t('暂无在线通道')}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
const OperationsPage: React.FC<{ mode: Mode }> = ({ mode }) => {
  const { t } = useI18n()
  const isPatrol = mode === 'patrol'

  return (
    <>
      <PageHeader
        description={isPatrol ? t('自动轮巡在线通道，可调节切换间隔。') : t('检查 ZLM 和数据库连通性，查看活跃 session 数量。')}
        title={isPatrol ? t('大屏轮巡') : t('运维诊断')}
      />
      {isPatrol ? <PatrolView /> : <DiagnosticsView />}
    </>
  )
}

export default OperationsPage
