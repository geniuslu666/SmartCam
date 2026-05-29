import React, { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import mpegts from 'mpegts.js'
import { useI18n } from '../i18n'

interface VideoPlayerProps {
  onPlaybackError?: (message: string) => void
  protocol: 'http-flv' | 'hls'
  streamUrl: string
}

type Translate = ReturnType<typeof useI18n>['t']

const getPlaybackMessage = (t: Translate, errorType: unknown, errorDetail?: unknown, errorInfo?: { msg?: string }) => {
  const type = String(errorType ?? '')
  const detail = String(errorDetail ?? '')
  const info = errorInfo?.msg ?? ''
  const raw = [detail || type, info].filter(Boolean).join(' / ')

  if (type === '1') {
    return t('播放错误：视频加载被中断')
  }
  if (type === '2') {
    return t('播放错误：流地址无法访问，请检查 ZLM 地址、端口和跨域配置')
  }
  if (type === '3') {
    return t('播放错误：浏览器无法解码当前视频流，请检查 H.264 子码流参数')
  }
  if (type === '4') {
    return t('播放错误：当前流地址或编码不受浏览器支持，请检查 HLS 分片和 H.264 子码流参数')
  }
  if ([type, detail, info].some((item) => item.includes('MediaMSEError'))) {
    return t('播放错误：浏览器 MSE 无法解码当前流，请确认子码流为 H.264/AAC，或尝试 HLS')
  }
  if ([type, detail, info].some((item) => item.includes('NetworkError') || item.includes('MEDIA_ERR_NETWORK'))) {
    return t('播放错误：流地址无法访问，请检查 ZLM 地址、端口和跨域配置')
  }
  if ([type, detail, info].some((item) => item.includes('MEDIA_ERR_SRC_NOT_SUPPORTED'))) {
    return t('播放错误：当前浏览器不支持该流编码')
  }
  return t('播放错误：{{reason}}', { reason: raw || t('未知错误') })
}

const getPlayStartMessage = (t: Translate, error: unknown) => {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return t('播放启动失败：浏览器阻止了自动播放，请点击画面后重试')
    }
    if (error.name === 'NotSupportedError') {
      return t('播放启动失败：流地址或编码不受当前浏览器支持')
    }
    return t('播放启动失败：{{reason}}', { reason: error.message || error.name })
  }

  if (error instanceof Error) {
    return t('播放启动失败：{{reason}}', { reason: error.message })
  }

  return t('播放启动失败：请检查流地址、ZLM 端口和跨域配置')
}

const isAutoplayBlocked = (error: unknown) => error instanceof DOMException && error.name === 'NotAllowedError'
const isPlayStartAborted = (error: unknown) => error instanceof DOMException && error.name === 'AbortError'
const getVideoDimensionMessage = (t: Translate, video: HTMLVideoElement) => {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA && (!video.videoWidth || !video.videoHeight)) {
    return t('码流元数据异常：未读取到有效视频分辨率，请检查 NVR 子码流编码参数')
  }

  if (video.videoWidth < 160 || video.videoHeight < 90) {
    return t('码流分辨率异常：{{width}}x{{height}}，请在 NVR 将子码流调整为 H.264 且至少 320x180', {
      height: video.videoHeight,
      width: video.videoWidth,
    })
  }

  return ''
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ onPlaybackError, protocol, streamUrl }) => {
  const { t } = useI18n()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const playerRef = useRef<mpegts.Player | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  const hasStartedRef = useRef(false)
  const [error, setError] = useState('')
  const [needsGesture, setNeedsGesture] = useState(false)

  const reportError = (message: string) => {
    setError(message)
    onPlaybackError?.(message)
  }

  const handlePlayStartError = (err: unknown) => {
    if (isPlayStartAborted(err)) {
      return
    }
    setNeedsGesture(isAutoplayBlocked(err))
    reportError(getPlayStartMessage(t, err))
  }

  const handleManualPlay = () => {
    setNeedsGesture(false)
    const start = playerRef.current ? playerRef.current.play() : videoRef.current?.play()
    start?.catch(handlePlayStartError)
  }

  useEffect(() => {
    hasStartedRef.current = false
    setError('')
    setNeedsGesture(false)
    const video = videoRef.current
    if (!streamUrl || !video) {
      return
    }
    video.muted = true
    video.defaultMuted = true

    const showError = (message: string) => {
      setNeedsGesture(false)
      setError(message)
      onPlaybackError?.(message)
    }

    const startPlayback = () => {
      if (hasStartedRef.current) {
        return
      }
      hasStartedRef.current = true
      const start = playerRef.current ? playerRef.current.play() : video.play()
      start?.catch((err) => {
        hasStartedRef.current = false
        handlePlayStartError(err)
      })
    }

    const checkVideoDimensions = () => {
      const message = getVideoDimensionMessage(t, video)
      if (message) {
        showError(message)
      }
    }

    video.oncanplay = startPlayback
    video.onloadeddata = checkVideoDimensions
    video.onloadedmetadata = checkVideoDimensions

    if (protocol === 'hls') {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl
        video.onerror = () => showError(getPlaybackMessage(t, video.error?.code, video.error?.message))
        return () => {
          video.onerror = null
          video.oncanplay = null
          video.onloadeddata = null
          video.onloadedmetadata = null
          video.removeAttribute('src')
          video.load()
        }
      }

      if (!Hls.isSupported()) {
        showError(t('当前浏览器不支持 HLS 播放'))
        return
      }

      const hls = new Hls({
        backBufferLength: 30,
        enableWorker: true,
        liveSyncDurationCount: 2,
        lowLatencyMode: false,
      })
      hlsRef.current = hls
      hls.attachMedia(video)
      hls.loadSource(streamUrl)
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          showError(getPlaybackMessage(t, data.type, data.details))
        }
      })

      return () => {
        video.oncanplay = null
        video.onloadeddata = null
        video.onloadedmetadata = null
        hlsRef.current?.destroy()
        hlsRef.current = null
      }
    }

    if (!mpegts.isSupported()) {
      showError(t('当前浏览器不支持 HTTP-FLV 播放'))
      return
    }

    const player = mpegts.createPlayer(
      {
        type: 'flv',
        isLive: true,
        url: streamUrl,
      },
      {
        enableStashBuffer: false,
        enableWorker: true,
        fixAudioTimestampGap: true,
        liveBufferLatencyChasing: true,
        liveBufferLatencyMaxLatency: 1.5,
        liveBufferLatencyMinRemain: 0.3,
        reuseRedirectedURL: true,
      },
    )

    playerRef.current = player
    player.attachMediaElement(video)
    player.load()
    player.on(mpegts.Events.ERROR, (type, detail, info) => {
      showError(getPlaybackMessage(t, type, detail, info))
    })

    return () => {
      video.oncanplay = null
      video.onloadeddata = null
      video.onloadedmetadata = null
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [onPlaybackError, protocol, streamUrl, t])

  return (
    <div className="relative h-full w-full bg-black">
      <video className="h-full w-full object-contain" muted playsInline ref={videoRef} />
      {needsGesture && (
        <button
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-white/90 px-3 py-1.5 text-xs font-medium text-black shadow"
          onClick={handleManualPlay}
          type="button"
        >
          {t('点击播放')}
        </button>
      )}
      {error && (
        <div className="absolute inset-x-2 bottom-2 rounded bg-black/70 px-2 py-1 text-xs text-red-300">
          {error}
        </div>
      )}
    </div>
  )
}

export default VideoPlayer
