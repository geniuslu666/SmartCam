import React from 'react'
import { AlertTriangle, Building2, Camera, Plus, Radio, RefreshCw } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, PageHeader, StatCard } from '../components/ui'
import { propertyRows } from '../data/mock'
import { useI18n } from '../i18n'

const PropertyListPage: React.FC = () => {
  const { t } = useI18n()

  return (
    <>
      <PageHeader
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
              {t('刷新')}
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              {t('新增物业')}
            </Button>
          </div>
        }
        description={t('按物业查看 NVR、通道、异常和实时并发，默认只做按需拉流。')}
        title={t('物业总览')}
      />

      <div className="space-y-4 p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard detail={t('1 个试点在线')} icon={<Building2 className="h-5 w-5" />} label={t('物业数量')} value="2" />
          <StatCard detail={t('含 1 台海康 NVR')} icon={<Camera className="h-5 w-5" />} label={t('摄像头通道')} value="16" />
          <StatCard detail={t('上限 16 路子码流')} icon={<Radio className="h-5 w-5" />} label={t('当前并发')} value="3" />
          <StatCard detail={t('1 路通道离线待查')} icon={<AlertTriangle className="h-5 w-5" />} label={t('异常事项')} value="1" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('物业列表')}</CardTitle>
            <Badge variant="outline">{t('H.264 子码流优先')}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t('物业')}</th>
                    <th className="px-4 py-3 font-medium">{t('状态')}</th>
                    <th className="px-4 py-3 font-medium">NVR</th>
                    <th className="px-4 py-3 font-medium">{t('通道')}</th>
                    <th className="px-4 py-3 font-medium">{t('在线率')}</th>
                    <th className="px-4 py-3 font-medium">{t('并发')}</th>
                    <th className="px-4 py-3 font-medium">{t('上行')}</th>
                    <th className="px-4 py-3 font-medium">{t('操作')}</th>
                  </tr>
                </thead>
                <tbody>
                  {propertyRows.map((property) => (
                    <tr className="border-b border-border last:border-0" key={property.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{t(property.name)}</div>
                        <div className="text-xs text-muted-foreground">{t(property.address)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={property.status === 'active' ? 'success' : 'warning'}>
                          {property.status === 'active' ? t('在线') : t('待维护')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{property.nvrCount}</td>
                      <td className="px-4 py-3">{property.channelCount}</td>
                      <td className="px-4 py-3">
                        {property.channelCount > 0 ? `${property.onlineChannels}/${property.channelCount}` : '-'}
                      </td>
                      <td className="px-4 py-3">{property.activeSessions}</td>
                      <td className="px-4 py-3">{property.uplink}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">{t('详情')}</Button>
                          <Button variant="secondary" size="sm">{t('预览')}</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default PropertyListPage
