import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Expand,
  Grid2X2,
  Grid3X3,
  ImageDown,
  LayoutGrid,
  MonitorPlay,
  Play,
  RotateCw,
  Square,
} from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, PageHeader, cn } from '../components/ui'
import { channelAPI } from '../services/api'
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
  isPlaying,
  onDoubleClick,
  streamType,
}: {
  channel: ChannelRow
  compact?: boolean
  isPlaying: boolean
  onDoubleClick: () => void
  streamType: StreamType
}) {
  const { t } = useI18n()
  const [protocol, setProtocol] = useState<StreamProtocol>('hls')
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
    <div className="relative h-full min-h-0 overflow-hidden rounded-md border border-border bg-black" onDoubleClick={onDoubleClick}>
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
    <div className="relative flex h-full min-h-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted/20">
      <Camera className={cn('text-muted-foreground/50', compact ? 'h-5 w-5' : 'h-8 w-8')} />
      <div className={cn('absolute bottom-2 right-2 rounded bg-black/30 px-2 py-1 text-xs text-muted-foreground', compact && 'px-1.5 py-0.5 text-[10px]')}>
        {t('无通道')}
      </div>
    </div>
  )
}

const PreviewPage: React.FC = () => {
  const [layout, setLayout] = useState(4)
  const [streamType, setStreamType] = useState<StreamType>('sub')
  const [channels, setChannels] = useState<ChannelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [maximizedChannelId, setMaximizedChannelId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const { t } = useI18n()

  const loadChannels = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await channelAPI.getChannels({})
      setChannels(response.data.data ?? [])
    } catch {
      setError(t('通道加载失败'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadChannels()
  }, [])

  useEffect(() => {
    if (selectedIndex >= channels.length) {
      setSelectedIndex(0)
    }
  }, [channels.length, selectedIndex])

  useEffect(() => {
    setMaximizedChannelId(null)
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
    return channels.slice(0, layout)
  }, [channels, layout, maximizedChannel, selectedIndex])
  const channelSlots = useMemo(() => Array.from({ length: activeLayout }, (_, index) => visibleChannels[index] ?? null), [activeLayout, visibleChannels])
  const hasH265MainStream = visibleChannels.some((channel) => channel.main_stream_encoding === 'H.265')
  const gridSide = Math.sqrt(activeLayout)
  const isDenseLayout = activeLayout >= 9

  const moveSelectedChannel = (direction: -1 | 1) => {
    if (channels.length === 0) {
      return
    }
    setSelectedIndex((current) => (current + direction + channels.length) % channels.length)
  }

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
                      'flex h-8 min-w-9 items-center justify-center gap-1 rounded px-2 text-xs text-muted-foreground',
                      layout === item.value && 'bg-accent text-accent-foreground',
                    )}
                    key={item.value}
                    onClick={() => setLayout(item.value)}
                    type="button"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </div>
            <Button onClick={loadChannels} variant="outline" size="sm">
              <RotateCw className="h-4 w-4" />
              {t('重连')}
            </Button>
          </div>
        }
        description={t('可在主码流和子码流之间切换，页面关闭会释放播放会话。')}
        title={t('实时预览')}
      />

      <div className="grid gap-4 p-6 xl:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>{t('测试物业 A')} / {streamType === 'main' ? t('主码流') : t('子码流')}</CardTitle>
            <div className="flex items-center gap-2">
              {layout === 1 && !maximizedChannel && (
                <div className="mr-1 flex items-center gap-1">
                  <Button aria-label={t('上一通道')} onClick={() => moveSelectedChannel(-1)} size="icon" variant="outline">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button aria-label={t('下一通道')} onClick={() => moveSelectedChannel(1)} size="icon" variant="outline">
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
          <CardContent>
            {loading && <div className="rounded-md border border-border p-6 text-sm text-muted-foreground">{t('正在加载通道...')}</div>}
            {error && <div className="rounded-md border border-border p-6 text-sm text-red-300">{error}</div>}
            {!loading && !error && (
              <div
                className="grid aspect-video min-h-80 max-h-[calc(100vh-15rem)] gap-2 overflow-hidden"
                style={{
                  gridTemplateColumns: `repeat(${gridSide}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${gridSide}, minmax(0, 1fr))`,
                }}
              >
                {channelSlots.map((channel, index) => (
                  channel ? (
                    <VideoTile
                      channel={channel}
                      compact={isDenseLayout}
                      isPlaying={isPlaying}
                      key={channel.id}
                      onDoubleClick={() => handleTileDoubleClick(channel.id)}
                      streamType={streamType}
                    />
                  ) : (
                    <EmptyTile compact={isDenseLayout} key={`empty-${index}`} />
                  )
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
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
              <Button className="w-full" variant="outline">
                <Expand className="h-4 w-4" />
                {t('全屏')}
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
