import { useEffect, useState } from 'react'
import { sessionAPI } from '../services/api'
import { useI18n } from '../i18n'

interface StreamInfo {
  protocol: StreamProtocol
  sessionId: string
  streamUrl: string
}

export type StreamProtocol = 'http-flv' | 'hls'
export type StreamType = 'main' | 'sub'

interface StreamState {
  error: string
  loading: boolean
  stream: StreamInfo | null
}

export const useStreams = (
  channelId: string | null,
  enabled = true,
  protocol: StreamProtocol = 'http-flv',
  streamType: StreamType = 'sub',
): StreamState => {
  const { t } = useI18n()
  const [stream, setStream] = useState<StreamInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!channelId || !enabled) {
      setStream(null)
      setLoading(false)
      setError(enabled ? '' : t('通道离线'))
      return
    }

    let disposed = false
    let sessionId: string | null = null

    const createSession = async () => {
      setLoading(true)
      setError('')
      setStream(null)
      try {
        const response = await sessionAPI.createSession({
          channel_id: channelId,
          stream_type: streamType,
          protocol,
        })
        const data = response.data.data
        sessionId = data.session_id
        if (!disposed) {
          setStream({
            protocol,
            sessionId: data.session_id,
            streamUrl: data.stream_url,
          })
        }
      } catch (error) {
        console.error('Create stream session failed:', error)
        if (!disposed) {
          setError(t('拉流失败，请检查后端日志或 ZLM 状态'))
          setStream(null)
        }
      } finally {
        if (!disposed) {
          setLoading(false)
        }
      }
    }

    createSession()

    return () => {
      disposed = true
      if (sessionId) {
        sessionAPI.endSession(sessionId).catch(() => undefined)
      }
      setStream(null)
    }
  }, [channelId, enabled, protocol, streamType, t])

  return { error, loading, stream }
}
