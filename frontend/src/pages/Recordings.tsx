import React, { useEffect, useRef, useState } from 'react'
import { Calendar, Clock, Film, Play, Search, Square } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, PageHeader, cn } from '../components/ui'
import { channelAPI, recordingAPI, sessionAPI } from '../services/api'
import VideoPlayer from '../components/VideoPlayer'
import { useI18n } from '../i18n'

type ChannelOption = {
  id: string
  name: string
  location?: string
  is_online: boolean
}

type RecordingSegment = {
  track_id: string
  start_time: string
  end_time: string
  codec_type?: string
}

type TileStream = {
  sessionId: string
  streamUrl: string
  protocol: 'http-flv' | 'hls'
}

const formatTime = (iso: string) => {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return iso
  }
}

const durationLabel = (start: string, end: string) => {
  try {
    const sec = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000)
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return m > 0 ? `${m}分${s}秒` : `${s}秒`
  } catch {
    return ''
  }
}

function RecordingTile({
  channel,
  segments,
  loading,
}: {
  channel: ChannelOption
  segments: RecordingSegment[]
  loading: boolean
}) {
  const { t } = useI18n()
  const [stream, setStream] = useState<TileStream | null>(null)
  const [playing, setPlaying] = useState(false)
  const sessionIdRef = useRef<string | null>(null)

  const playSegment = async (seg: RecordingSegment) => {
    // End previous session if any
    if (sessionIdRef.current) {
      await sessionAPI.endSession(sessionIdRef.current).catch(() => undefined)
      sessionIdRef.current = null
      setStream(null)
    }
    try {
      const res = await recordingAPI.createRecordingSession({
        channel_id: channel.id,
        protocol: 'http-flv',
        record_start: seg.start_time,
        record_end: seg.end_time,
      })
      const data = res.data.data
      sessionIdRef.current = data.session_id
      setStream({ sessionId: data.session_id, streamUrl: data.stream_url, protocol: 'http-flv' })
      setPlaying(true)
    } catch (e) {
      console.error('Failed to start recording session', e)
    }
  }

  const stopPlayback = async () => {
    if (sessionIdRef.current) {
      await sessionAPI.endSession(sessionIdRef.current).catch(() => undefined)
      sessionIdRef.current = null
    }
    setStream(null)
    setPlaying(false)
  }

  useEffect(() => {
    return () => {
      if (sessionIdRef.current) {
        sessionAPI.endSession(sessionIdRef.current).catch(() => undefined)
      }
    }
  }, [])

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="shrink-0 pb-2 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="truncate text-sm">{channel.name}</CardTitle>
          <div className="flex items-center gap-1.5">
            {channel.location && (
              <span className="text-xs text-muted-foreground">{channel.location}</span>
            )}
            <Badge variant={channel.is_online ? 'success' : 'destructive'}>
              {channel.is_online ? t('在线') : t('离线')}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-2 pb-3">
        {/* Video player */}
        <div className={cn('relative overflow-hidden rounded bg-black', stream ? 'aspect-video' : 'hidden')}>
          {stream && (
            <>
              <VideoPlayer protocol={stream.protocol} streamUrl={stream.streamUrl} />
              <button
                className="absolute right-2 top-2 rounded bg-black/60 p-1 text-white hover:bg-black/80"
                onClick={stopPlayback}
                type="button"
              >
                <Square className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Recording list */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              {t('查询中...')}
            </div>
          )}
          {!loading && segments.length === 0 && (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              {t('该时段无录像')}
            </div>
          )}
          {!loading && segments.length > 0 && (
            <div className="space-y-1">
              {segments.map((seg, i) => (
                <button
                  key={i}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs transition-colors',
                    playing && stream
                      ? 'border-primary/40 bg-primary/5 hover:bg-primary/10'
                      : 'border-border bg-background hover:bg-muted',
                  )}
                  onClick={() => playSegment(seg)}
                  type="button"
                >
                  <Play className="h-3 w-3 shrink-0 text-primary" />
                  <span className="flex-1 font-medium tabular-nums">
                    {formatTime(seg.start_time)} – {formatTime(seg.end_time)}
                  </span>
                  <span className="shrink-0 text-muted-foreground">{durationLabel(seg.start_time, seg.end_time)}</span>
                  {seg.codec_type && (
                    <Badge variant="outline" className="shrink-0 text-[10px]">{seg.codec_type}</Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const RecordingsPage: React.FC = () => {
  const { t } = useI18n()
  const [channels, setChannels] = useState<ChannelOption[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [timeStart, setTimeStart] = useState('00:00')
  const [timeEnd, setTimeEnd] = useState('23:59')
  const [segmentMap, setSegmentMap] = useState<Record<string, RecordingSegment[]>>({})
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})
  const [hasQueried, setHasQueried] = useState(false)

  useEffect(() => {
    channelAPI.getChannels({}).then((res) => {
      const list: ChannelOption[] = res.data.data ?? []
      setChannels(list)
      setSelectedIds(list.slice(0, 4).map((c) => c.id))
    }).catch(() => {})
  }, [])

  const activeTiles = channels.filter((c) => selectedIds.includes(c.id)).slice(0, 4)

  const handleQuery = async () => {
    setHasQueried(true)
    const start = `${date}T${timeStart}:00+00:00`
    const end = `${date}T${timeEnd}:59+00:00`

    const newLoading: Record<string, boolean> = {}
    selectedIds.forEach((id) => { newLoading[id] = true })
    setLoadingMap(newLoading)
    setSegmentMap({})

    await Promise.all(
      selectedIds.map(async (id) => {
        try {
          const res = await recordingAPI.getRecordings(id, start, end)
          const segs: RecordingSegment[] = res.data.data?.items ?? []
          setSegmentMap((prev) => ({ ...prev, [id]: segs }))
        } catch {
          setSegmentMap((prev) => ({ ...prev, [id]: [] }))
        } finally {
          setLoadingMap((prev) => ({ ...prev, [id]: false }))
        }
      }),
    )
  }

  const toggleChannel = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 4 ? [...prev, id] : prev,
    )
  }

  return (
    <>
      <PageHeader
        title={t('录像查询')}
        description={t('查询 NVR 录像片段并在线回放，最多同时显示 4 路')}
      />

      <div className="space-y-4 p-6">
        {/* Query bar */}
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 pt-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">{t('日期')}</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="h-9 rounded-md border border-border bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">{t('开始时间')}</label>
              <div className="relative">
                <Clock className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="h-9 w-28 rounded-md border border-border bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  type="time"
                  value={timeStart}
                  onChange={(e) => setTimeStart(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">{t('结束时间')}</label>
              <div className="relative">
                <Clock className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="h-9 w-28 rounded-md border border-border bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  type="time"
                  value={timeEnd}
                  onChange={(e) => setTimeEnd(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleQuery} disabled={selectedIds.length === 0}>
              <Search className="h-4 w-4" />
              {t('查询录像')}
            </Button>

            {/* Channel selector */}
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{t('选择通道（最多4路）：')}</span>
              {channels.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleChannel(c.id)}
                  className={cn(
                    'rounded border px-2 py-1 text-xs transition-colors',
                    selectedIds.includes(c.id)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted',
                    !selectedIds.includes(c.id) && selectedIds.length >= 4 && 'cursor-not-allowed opacity-40',
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 4-channel grid */}
        {activeTiles.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2" style={{ minHeight: '28rem' }}>
            {activeTiles.map((channel) => (
              <RecordingTile
                key={channel.id}
                channel={channel}
                segments={hasQueried ? (segmentMap[channel.id] ?? []) : []}
                loading={loadingMap[channel.id] ?? false}
              />
            ))}
            {/* Empty slots */}
            {Array.from({ length: 4 - activeTiles.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/10"
              >
                <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                  <Film className="h-8 w-8" />
                  <span className="text-xs">{t('点击上方选择通道')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
            {t('请先选择通道')}
          </div>
        )}
      </div>
    </>
  )
}

export default RecordingsPage
