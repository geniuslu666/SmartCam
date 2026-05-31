import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Building2,
  Camera,
  ChevronLeft,
  ChevronRight,
  Expand,
  Grid2X2,
  Grid3X3,
  ImageDown,
  LayoutGrid,
  Minimize,
  MonitorPlay,
  Play,
  RotateCw,
  Square,
} from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, PageHeader, cn } from '../components/ui'
import { channelAPI, propertyAPI } from '../services/api'
import { StreamProtocol, StreamType, useStreams } from '../hooks/useStreams'
import VideoPlayer from '../components/VideoPlayer'
import { useI18n } from '../i18n'

type ChannelRow = {
  id: string
  name: string
  location?: string
  channel_number: number
  sub_stream_encoding?: string
  main_stream_encoding?: string
  sub_stream_resolution?: string
  main_stream_resolution?: string
  is_online: boolean
}

const layouts = [
  { value: 1, label: '1', icon: MonitorPlay },
  { value: 4, label: '4', icon: Grid2X2 },
  { value: 9, label: '9', icon: Grid3X3 },
  { value: 16, label: '16', icon: LayoutGrid },
]

function VideoTile({
  channel,
  compact = false,
  fillHeight = false,
  isPlaying,
  onDoubleClick,
  streamType,
}: {
  channel: ChannelRow
  compact?: boolean
  fillHeight?: boolean
  isPlaying: boolean
  onDoubleClick: () => void
  streamType: StreamType
}) {
  const { t } = useI18n()
  const [protocol, setProtocol] = useState<StreamProtocol>('http-flv')
  const [playbackError, setPlaybackError] = useState('')
  const { error, loading, stream } = useStreams(channel.id, channel.is_online && isPlaying, protocol, streamType)
  const activeEncoding = streamType === 'main' ? channel.main_stream_encoding : channel.sub_stream_encoding
  const activeResolution = streamType === 'main' ? channel.main_stream_resolution : channel.sub_stream_resolution

  useEffect(() => {
    setPlaybackError('')
  }, [channel.id, isPlaying, protocol, stream?.streamUrl, streamType])

  const handlePlaybackError = useCallback((message: string) => {
    if (protocol === 'http-flv' && message.includes('MSE')) {
      setProtocol('hls')
      return
    }
    setPlaybackError(message)
  }, [protocol])

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md border border-border bg-black',
        fillHeight ? 'min-h-[40vh]' : 'aspect-video',
      )}
      onDoubleClick={onDoubleClick}
    >
      {stream?.streamUrl ? (
        <VideoPlayer onPlaybackError={handlePlaybackError} protocol={stream.protocol} streamUrl={stream.streamUrl} />
      ) : (
        <div className="flex h-full min-h-0 items-center justify-center bg-[radial-gradient(circle_at_center,hsl(199_89%_16%),hsl(222_26%_5%))]">
          <Camera className={cn('text-muted-foreground', compact ? 'h-5 w-5' : 'h-8 w-8')} />
        </div>
      )}
      <div className={cn('absolute left-2 top-2 flex items-center gap-2 rounded bg-black/70 px-2 py-1 text-xs text-white', compact && 'max-w-[calc(100%-1rem)] truncate px-1.5 py-0.5 text-[10px]')}>
        <span className={cn('h-2 w-2 rounded-full', channel.is_online ? 'bg-emerald-400' : 'bg-red-400')} />
        <span className="truncate">{channel.name}</span>
      </div>
      <div className={cn('absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-xs text-white/70', compact && 'px-1.5 py-0.5 text-[10px]')}>
        {stream?.streamUrl
          ? (playbackError || `${streamType === 'main' ? t('主码流') : t('子码流')} / ${stream.protocol.toUpperCase()}`)
          : !isPlaying ? t('已停止') : error || (loading ? t('拉流中') : t('待连接'))}
      </div>
      <div className={cn('absolute right-2 top-2 rounded bg-black/60 px-2 py-1 text-xs text-white/70', compact && 'hidden')}>
        {activeEncoding || '-'}{activeResolution ? ` / ${activeResolution}` : ''}
      </div>
    </div>
  )
}

function EmptyTile({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n()

  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted/20">
      <Camera className={cn('text-muted-foreground/50', compact ? 'h-5 w-5' : 'h-8 w-8')} />
      <div className={cn('absolute bottom-2 right-2 rounded bg-black/30 px-2 py-1 text-xs text-muted-foreground', compact && 'px-1.5 py-0.5 text-[10px]')}>
        {t('无通道')}
      </div>
    </div>
  )
}

const PreviewPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const urlPropertyId = searchParams.get('property_id')
  const [layout, setLayout] = useState(4)
  const [streamType, setStreamType] = useState<StreamType>('sub')
  const [channels, setChannels] = useState<ChannelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([])
  const [activePropertyId, setActivePropertyId] = useState<string | null>(urlPropertyId)
  const [pageOffset, setPageOffset] = useState(0)

  // ── Fullscreen ──────────────────────────────────────────────────────────────
  const gridRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [overlayVisible, setOverlayVisible] = useState(true)
  const overlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const resetOverlayTimer = useCallback(() => {
    setOverlayVisible(true)
    if (overlayTimer.current) clearTimeout(overlayTimer.current)
    overlayTimer.current = setTimeout(() => setOverlayVisible(false), 3000)
  }, [])

  useEffect(() => {
    if (isFullscreen) {
      resetOverlayTimer()
      return () => { if (overlayTimer.current) clearTimeout(overlayTimer.current) }
    } else {
      setOverlayVisible(true)
      if (overlayTimer.current) clearTimeout(overlayTimer.current)
    }
  }, [isFullscreen, resetOverlayTimer])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      gridRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }, [])
  const [error, setError] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [maximizedChannelId, setMaximizedChannelId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const { t } = useI18n()

  // ── Load properties ─────────────────────────────────────────────────────────
  useEffect(() => {
    propertyAPI.getProperties({ page: 1, limit: 200 }).then(res => {
      const props: { id: string; name: string }[] = res.data.data?.items ?? []
      setProperties(props)
      if (props.length > 0 && !activePropertyId) {
        setActivePropertyId(props[0].id)
      }
    }).catch(() => {})
  }, [])

  // ── Load channels ───────────────────────────────────────────────────────────
  const loadChannels = async () => {
    setLoading(true)
    setError('')
    try {
      const params = activePropertyId ? { property_id: activePropertyId } : {}
      const response = await channelAPI.getChannels(params)
      setChannels(response.data.data ?? [])
    } catch {
      setError(t('通道加载失败'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadChannels()
    setPageOffset(0)
    setSelectedIndex(0)
  }, [activePropertyId])

  useEffect(() => {
    if (selectedIndex >= channels.length) {
      setSelectedIndex(0)
    }
  }, [channels.length, selectedIndex])

  useEffect(() => {
    setMaximizedChannelId(null)
    setPageOffset(0)
  }, [layout])

  const maximizedChannel = maximizedChannelId ? channels.find((channel) => channel.id === maximizedChannelId) : null
  const activeLayout = maximizedChannel ? 1 : layout
  const visibleChannels = useMemo(() => {
    if (maximizedChannel) {
      return [maximizedChannel]
    }
    if (layout === 1) {
      return channels[selectedIndex] ? [channels[selectedIndex]] : []
    }
    return channels.slice(pageOffset, pageOffset + layout)
  }, [channels, layout, maximizedChannel, selectedIndex, pageOffset])
  const channelSlots = useMemo(() => Array.from({ length: activeLayout }, (_, index) => visibleChannels[index] ?? null), [activeLayout, visibleChannels])
  const hasH265MainStream = visibleChannels.some((channel) => channel.main_stream_encoding === 'H.265')
  const isDenseLayout = activeLayout >= 9

  // ── Channel / page navigation ───────────────────────────────────────────────
  const totalPages = layout === 1 ? channels.length : Math.ceil(channels.length / layout)
  const currentPage = layout === 1 ? selectedIndex : Math.floor(pageOffset / layout)
  const canGoPrev = layout === 1 ? selectedIndex > 0 : pageOffset > 0
  const canGoNext = layout === 1
    ? selectedIndex < channels.length - 1
    : pageOffset + layout < channels.length

  const switchToPrev = () => {
    if (layout === 1) setSelectedIndex(i => Math.max(0, i - 1))
    else setPageOffset(o => Math.max(0, o - layout))
  }
  const switchToNext = () => {
    if (layout === 1) setSelectedIndex(i => Math.min(channels.length - 1, i + 1))
    else setPageOffset(o => Math.min(Math.max(0, channels.length - layout), o + layout))
  }
  const switchToChannel = (idx: number) => {
    if (layout === 1) {
      setSelectedIndex(idx)
    } else {
      setPageOffset(Math.floor(idx / layout) * layout)
    }
  }

  // Responsive columns: mobile=1, tablet=min(2,layout), desktop=sqrt(layout)
  const windowWidth = useSyncExternalStore(
    (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) },
    () => window.innerWidth,
  )
  const gridSide = Math.sqrt(activeLayout)
  // mobile: 1 col for 1/4, 2 cols for 9/16 — tablet: max 2 — desktop: layout selector value
  const responsiveCols = windowWidth < 768
    ? (activeLayout >= 9 ? 2 : 1)
    : windowWidth < 1024
      ? Math.min(2, gridSide)
      : gridSide

  const activeProperty = properties.find(p => p.id === activePropertyId)

  const handleTileDoubleClick = (channelId: string) => {
    setMaximizedChannelId((current) => (current === channelId ? null : channelId))
  }

  return (
    <>
      <PageHeader
        action={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border bg-card p-1">
              {[
                { value: 'sub' as const, label: '子码流' },
                { value: 'main' as const, label: '主码流' },
              ].map((item) => (
                <button
                  className={cn(
                    'flex h-8 min-w-16 items-center justify-center rounded px-2 text-xs text-muted-foreground',
                    streamType === item.value && 'bg-accent text-accent-foreground',
                  )}
                  key={item.value}
                  onClick={() => setStreamType(item.value)}
                  type="button"
                >
                  {t(item.label)}
                </button>
              ))}
            </div>
            <div className="flex rounded-md border border-border bg-card p-1">
              {layouts.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    className={cn(
                      'flex h-8 items-center justify-center gap-1 rounded px-2 text-xs text-muted-foreground',
                      layout === item.value && 'bg-accent text-accent-foreground',
                    )}
                    key={item.value}
                    onClick={() => setLayout(item.value)}
                    title={item.label}
                    type="button"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                )
              })}
            </div>
            <Button onClick={loadChannels} variant="outline" size="sm" title={t('重连')}>
              <RotateCw className="h-4 w-4" />
              <span className="hidden sm:inline">{t('重连')}</span>
            </Button>
          </div>
        }
        description={t('可在主码流和子码流之间切换，页面关闭会释放播放会话。')}
        title={t('实时预览')}
      />

      <div className="grid gap-4 p-4 md:p-6 xl:grid-cols-[1fr_300px]">
        {/* ── Fullscreen wrapper ─────────────────────────────────────── */}
        <div
          ref={gridRef}
          className={cn(
            'relative',
            isFullscreen && 'flex flex-col bg-black',
          )}
          onMouseMove={isFullscreen ? resetOverlayTimer : undefined}
          onTouchStart={isFullscreen ? resetOverlayTimer : undefined}
        >
        <Card className={cn(isFullscreen && 'flex flex-col flex-1 rounded-none border-0')}>
          <CardHeader className={cn(isFullscreen && 'hidden')}>
            <CardTitle>{activeProperty?.name ?? t('全部物业')} / {streamType === 'main' ? t('主码流') : t('子码流')}</CardTitle>
            <div className="flex items-center gap-2">
              {!maximizedChannel && channels.length > (layout === 1 ? 1 : layout) && (
                <div className="mr-1 flex items-center gap-1">
                  <Button aria-label={t('上一页')} onClick={switchToPrev} size="icon" variant="outline" disabled={!canGoPrev}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground tabular-nums">{currentPage + 1}/{totalPages}</span>
                  <Button aria-label={t('下一页')} onClick={switchToNext} size="icon" variant="outline" disabled={!canGoNext}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <Badge variant={streamType === 'main' && hasH265MainStream ? 'warning' : 'success'}>
                {streamType === 'main' && hasH265MainStream ? 'H.265' : 'H.264'}
              </Badge>
              <Badge variant="outline">{maximizedChannel ? t('最大化') : t('{{count}} 路', { count: activeLayout })}</Badge>
            </div>
          </CardHeader>
          <CardContent className={cn(isFullscreen && 'flex-1 p-1')}>
            {loading && <div className="rounded-md border border-border p-6 text-sm text-muted-foreground">{t('正在加载通道...')}</div>}
            {error && <div className="rounded-md border border-border p-6 text-sm text-red-300">{error}</div>}
            {!loading && !error && (
              <div
                className={cn('grid', isDenseLayout ? 'gap-1' : 'gap-2')}
                style={{ gridTemplateColumns: `repeat(${responsiveCols}, minmax(0, 1fr))` }}
              >
                {channelSlots.map((channel, index) => (
                  channel ? (
                    <VideoTile
                      channel={channel}
                      compact={isDenseLayout}
                      fillHeight={activeLayout === 1}
                      isPlaying={isPlaying}
                      key={channel.id}
                      onDoubleClick={() => handleTileDoubleClick(channel.id)}
                      streamType={maximizedChannel ? 'main' : streamType}
                    />
                  ) : (
                    <EmptyTile compact={isDenseLayout} key={`empty-${index}`} />
                  )
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Fullscreen overlay ── semi-transparent bottom bar, auto-hides ── */}
        {isFullscreen && (
          <div
            className={cn(
              'pointer-events-none absolute inset-x-0 bottom-0 z-10 transition-opacity duration-500',
              overlayVisible ? 'opacity-100' : 'opacity-0',
            )}
          >
            <div className="pointer-events-auto bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-4 pt-20 space-y-2">

              {/* Row 1: Property switcher */}
              {properties.length > 1 && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-white/40" />
                  <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    {properties.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setActivePropertyId(p.id)}
                        className={cn(
                          'shrink-0 rounded-full px-3 py-0.5 text-xs font-medium transition-colors whitespace-nowrap',
                          activePropertyId === p.id
                            ? 'bg-white/25 text-white ring-1 ring-white/30'
                            : 'text-white/50 hover:bg-white/10 hover:text-white/80',
                        )}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 2: Camera switcher */}
              {channels.length > 0 && (
                <div className="flex items-center gap-2">
                  <Camera className="h-3.5 w-3.5 shrink-0 text-white/40" />
                  <div className="flex flex-1 gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    {channels.map((ch, idx) => {
                      const isActive = layout === 1
                        ? selectedIndex === idx
                        : idx >= pageOffset && idx < pageOffset + layout
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => switchToChannel(idx)}
                          className={cn(
                            'flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors whitespace-nowrap',
                            isActive
                              ? 'bg-white/25 text-white'
                              : 'text-white/50 hover:bg-white/10 hover:text-white/80',
                          )}
                        >
                          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', ch.is_online ? 'bg-emerald-400' : 'bg-red-400')} />
                          {ch.name}
                        </button>
                      )
                    })}
                  </div>
                  {/* Prev / next page */}
                  {channels.length > layout && (
                    <div className="flex shrink-0 items-center gap-1 pl-1 border-l border-white/10">
                      <button
                        type="button"
                        onClick={switchToPrev}
                        disabled={!canGoPrev}
                        className="flex h-6 w-6 items-center justify-center rounded bg-white/10 text-white/70 disabled:opacity-25 hover:bg-white/20"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-[2.5rem] text-center text-[10px] text-white/40 tabular-nums">
                        {currentPage + 1}/{totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={switchToNext}
                        disabled={!canGoNext}
                        className="flex h-6 w-6 items-center justify-center rounded bg-white/10 text-white/70 disabled:opacity-25 hover:bg-white/20"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Row 3: Controls */}
              <div className="flex items-center gap-3">
                {/* Left: codec + count badges */}
                <Badge variant={streamType === 'main' && hasH265MainStream ? 'warning' : 'success'} className="shrink-0">
                  {streamType === 'main' && hasH265MainStream ? 'H.265' : 'H.264'}
                </Badge>
                <Badge variant="outline" className="shrink-0 border-white/20 text-white/70">
                  {activeLayout} {t('路')}
                </Badge>

                {/* Center: stream type + layout picker + play/stop */}
                <div className="flex flex-1 items-center justify-center gap-2">
                  <div className="flex rounded-md border border-white/20 bg-black/40 p-0.5">
                    {(['sub', 'main'] as StreamType[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStreamType(s)}
                        className={cn(
                          'rounded px-3 py-1 text-xs font-medium transition-colors',
                          streamType === s ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80',
                        )}
                      >
                        {s === 'main' ? t('主码流') : t('子码流')}
                      </button>
                    ))}
                  </div>

                  <div className="flex rounded-md border border-white/20 bg-black/40 p-0.5">
                    {layouts.map(item => {
                      const Icon = item.icon
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setLayout(item.value)}
                          title={`${item.label} ${t('路')}`}
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded transition-colors',
                            layout === item.value ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80',
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </button>
                      )
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPlaying((v) => !v)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
                  >
                    {isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                </div>

                {/* Right: exit fullscreen */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-black/40 text-white/80 hover:bg-black/60 hover:text-white"
                  title={t('退出全屏')}
                >
                  <Minimize className="h-4 w-4" />
                </button>
              </div>

            </div>
          </div>
        )}
        </div>{/* end gridRef */}

        {/* Mobile-only bottom control bar */}
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 xl:hidden">
          <Button
            size="sm"
            variant={isPlaying ? 'destructive' : 'secondary'}
            onClick={() => setIsPlaying((v) => !v)}
          >
            {isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? t('全部停止') : t('全部启动')}
          </Button>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn('h-2 w-2 rounded-full', isPlaying ? 'bg-emerald-400' : 'bg-slate-500')} />
            {isPlaying ? t('播放中') : t('已停止')}
            <span className="ml-1">{channels.filter(c => c.is_online).length}/{channels.length} {t('在线')}</span>
          </div>
        </div>

        <div className="hidden space-y-4 xl:block">
          <Card>
            <CardHeader>
              <CardTitle>{t('播放控制')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" onClick={() => setIsPlaying((current) => !current)} variant={isPlaying ? 'destructive' : 'secondary'}>
                {isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlaying ? t('全部停止') : t('全部启动')}
              </Button>
              <Button className="w-full" variant="secondary">
                <ImageDown className="h-4 w-4" />
                {t('截图')}
              </Button>
              <Button className="w-full" variant="outline" onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
                {isFullscreen ? t('退出全屏') : t('全屏')}
              </Button>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md border border-border p-3">
                  <div className="text-muted-foreground">{t('协议')}</div>
                  <div className="mt-1 font-medium">HLS</div>
                </div>
                <div className="rounded-md border border-border p-3">
                  <div className="text-muted-foreground">{t('码流')}</div>
                  <div className="mt-1 font-medium">{streamType === 'main' ? t('主码流') : t('子码流')}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('通道状态')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {channels.map((channel) => (
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2" key={channel.id}>
                  <div>
                    <div className="text-sm font-medium">{channel.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t('{{location}} / 主 {{main}} / 子 {{sub}}', {
                        location: channel.location,
                        main: channel.main_stream_encoding,
                        sub: channel.sub_stream_encoding,
                      })}
                    </div>
                  </div>
                  <Badge variant={channel.is_online ? 'success' : 'destructive'}>
                    {channel.is_online ? t('在线') : t('离线')}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

export default PreviewPage
