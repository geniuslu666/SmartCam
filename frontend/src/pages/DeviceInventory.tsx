import React from 'react'
import { Camera, FileKey2, Network, Plus, Search } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, PageHeader } from '../components/ui'
import { cameraRows, nvrRows } from '../data/mock'
import { useI18n } from '../i18n'

type Mode = 'nvrs' | 'channels' | 'streams'

const titleMap: Record<Mode, string> = {
  nvrs: 'NVR 设备',
  channels: '摄像头通道',
  streams: '流地址模板',
}

const descriptionMap: Record<Mode, string> = {
  nvrs: '维护 NVR 品牌、型号、内网地址、通道数和在线状态。',
  channels: '维护通道名称、区域、主/子码流编码和码率。',
  streams: '统一管理海康 RTSP 主/子码流模板，避免直接明文散落配置。',
}

const DeviceInventoryPage: React.FC<{ mode: Mode }> = ({ mode }) => {
  const { t } = useI18n()

  return (
    <>
      <PageHeader
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Search className="h-4 w-4" />
              {t('筛选')}
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              {t('新增')}
            </Button>
          </div>
        }
        description={t(descriptionMap[mode])}
        title={t(titleMap[mode])}
      />

      <div className="space-y-4 p-6">
        {mode === 'nvrs' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('设备清单')}</CardTitle>
              <Network className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t('名称')}</th>
                    <th className="px-4 py-3 font-medium">{t('品牌/型号')}</th>
                    <th className="px-4 py-3 font-medium">{t('内网地址')}</th>
                    <th className="px-4 py-3 font-medium">{t('通道')}</th>
                    <th className="px-4 py-3 font-medium">{t('状态')}</th>
                    <th className="px-4 py-3 font-medium">{t('最后心跳')}</th>
                  </tr>
                </thead>
                <tbody>
                  {nvrRows.map((nvr) => (
                    <tr className="border-b border-border last:border-0" key={nvr.id}>
                      <td className="px-4 py-3 font-medium">{t(nvr.name)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{nvr.brand} / {nvr.model}</td>
                      <td className="px-4 py-3 font-mono text-xs">{nvr.ip}</td>
                      <td className="px-4 py-3">{nvr.channels}</td>
                      <td className="px-4 py-3">
                        <Badge variant={nvr.status === 'online' ? 'success' : 'warning'}>
                          {nvr.status === 'online' ? t('在线') : t('待接入')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{t(nvr.lastSeen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {mode === 'channels' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('通道清单')}</CardTitle>
              <Camera className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {cameraRows.map((camera) => (
                <div className="rounded-md border border-border bg-background p-3" key={camera.id}>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{t(camera.name)}</div>
                    <Badge variant={camera.status === 'online' ? 'success' : 'destructive'}>
                      {camera.status === 'online' ? t('在线') : t('离线')}
                    </Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>{t('区域：{{area}}', { area: camera.area })}</span>
                    <span>{t('通道：{{channel}}', { channel: camera.channel })}</span>
                    <span>{t(camera.stream)}</span>
                    <span>{camera.bitrate}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {mode === 'streams' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('RTSP 模板')}</CardTitle>
              <FileKey2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border border-border bg-background p-4">
                <div className="text-sm font-medium">{t('海康主码流')}</div>
                <code className="mt-2 block rounded bg-muted p-3 text-xs text-muted-foreground">
                  rtsp://{'{username}'}:{'{password}'}@{'{ip}'}:{'{port}'}/Streaming/channels/{'{channel_number}'}01
                </code>
              </div>
              <div className="rounded-md border border-border bg-background p-4">
                <div className="text-sm font-medium">{t('海康子码流')}</div>
                <code className="mt-2 block rounded bg-muted p-3 text-xs text-muted-foreground">
                  rtsp://{'{username}'}:{'{password}'}@{'{ip}'}:{'{port}'}/Streaming/channels/{'{channel_number}'}02
                </code>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}

export default DeviceInventoryPage
