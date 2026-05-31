import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Building2, MonitorPlay, Wifi, WifiOff } from 'lucide-react'
import { Badge, Button, PageHeader } from '../components/ui'
import { propertyAPI } from '../services/api'
import { useI18n } from '../i18n'
import type { Property } from '../types/index.d.ts'

// Fix leaflet default marker icon broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const activeIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const inactiveIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'leaflet-marker-inactive',
})

const MAP_CENTER: [number, number] = [34.680183544606805, 135.51509753794878]
const MAP_ZOOM = 14

const DeviceMapPage: React.FC = () => {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    propertyAPI.getProperties({ page: 1, limit: 200 })
      .then((res) => setProperties(res.data.data?.items ?? res.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const mapped = properties.filter((p) => p.latitude && p.longitude)
  const unmapped = properties.filter((p) => !p.latitude || !p.longitude)

  return (
    <>
      <PageHeader
        description={t('点击地图标记进入对应物业的实时视频画面')}
        title={t('设备地图')}
        action={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" />
              {t('已标注 {{count}} 处', { count: mapped.length })}
            </span>
            {unmapped.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-full bg-muted-foreground/40" />
                {t('未标注 {{count}} 处', { count: unmapped.length })}
              </span>
            )}
          </div>
        }
      />

      <div className="flex h-[calc(100vh-8rem)] gap-0">
        {/* Map */}
        <div className="relative flex-1">
          {!loading && (
            <MapContainer
              center={MAP_CENTER}
              zoom={MAP_ZOOM}
              className="h-full w-full"
              style={{ zIndex: 0 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {mapped.map((property) => (
                <Marker
                  key={property.id}
                  position={[property.latitude!, property.longitude!]}
                  icon={property.status === 'active' ? activeIcon : inactiveIcon}
                >
                  <Popup minWidth={220}>
                    <div className="space-y-2 py-1">
                      <div className="flex items-center gap-2 font-semibold text-gray-900">
                        <Building2 className="h-4 w-4 shrink-0 text-blue-500" />
                        <span>{property.name}</span>
                      </div>
                      {property.address && (
                        <div className="text-xs text-gray-500">{property.address}</div>
                      )}
                      <div className="flex items-center gap-2 text-xs">
                        {property.status === 'active'
                          ? <Wifi className="h-3 w-3 text-emerald-500" />
                          : <WifiOff className="h-3 w-3 text-red-400" />}
                        <span className={property.status === 'active' ? 'text-emerald-600' : 'text-red-400'}>
                          {property.status === 'active' ? t('正常运行') : t('离线 / 维护中')}
                        </span>
                      </div>
                      {(property.channelCount !== undefined) && (
                        <div className="text-xs text-gray-500">
                          {t('摄像头 {{count}} 路', { count: property.channelCount })}
                        </div>
                      )}
                      <button
                        className="mt-1 flex w-full items-center justify-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                        onClick={() => navigate(`/preview?property_id=${property.id}`)}
                        type="button"
                      >
                        <MonitorPlay className="h-3.5 w-3.5" />
                        {t('查看实时画面')}
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
          {loading && (
            <div className="flex h-full items-center justify-center bg-muted/20 text-sm text-muted-foreground">
              {t('加载中...')}
            </div>
          )}
        </div>

        {/* Sidebar: unmapped properties */}
        {unmapped.length > 0 && (
          <div className="flex w-72 shrink-0 flex-col border-l border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <div className="text-sm font-medium">{t('未设置坐标')}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {t('在物业详情中添加经纬度后显示于地图')}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {unmapped.map((property) => (
                <div key={property.id} className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{property.name}</div>
                      {property.address && (
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">{property.address}</div>
                      )}
                    </div>
                    <Badge variant={property.status === 'active' ? 'success' : 'destructive'} className="shrink-0">
                      {property.status === 'active' ? t('正常') : t('离线')}
                    </Badge>
                  </div>
                  <Button
                    className="mt-2 w-full"
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/preview?property_id=${property.id}`)}
                  >
                    <MonitorPlay className="h-3.5 w-3.5" />
                    {t('查看画面')}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default DeviceMapPage
