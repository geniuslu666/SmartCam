import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Activity,
  BookOpen,
  Building2,
  Camera,
  ClipboardList,
  Gauge,
  KeyRound,
  LayoutDashboard,
  MapPin,
  MonitorPlay,
  Network,
  RadioTower,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  Video,
} from 'lucide-react'
import { cn } from './ui'
import LanguageSwitcher from './LanguageSwitcher'
import { useI18n } from '../i18n'
import { useSidebar } from '../App'

type MenuItem = { label: string; path: string; icon: React.ElementType }
type MenuGroup = { title: string; icon: React.ElementType; items: MenuItem[] }

const menuGroups: MenuGroup[] = [
  {
    title: '监控工作台',
    icon: LayoutDashboard,
    items: [
      { label: '物业总览', path: '/properties', icon: Building2 },
      { label: '设备地图', path: '/map', icon: MapPin },
      { label: '实时预览', path: '/preview', icon: MonitorPlay },
      { label: '录像查询', path: '/recordings', icon: Video },
      { label: '大屏轮巡', path: '/patrol', icon: RadioTower },
    ],
  },
  {
    title: '设备台账',
    icon: ClipboardList,
    items: [
      { label: '品牌模板', path: '/inventory/brand-templates', icon: BookOpen },
      { label: 'NVR 设备', path: '/inventory/nvrs', icon: Network },
      { label: '摄像头通道', path: '/inventory/channels', icon: Camera },
      { label: '流地址模板', path: '/inventory/streams', icon: KeyRound },
    ],
  },
  {
    title: '运维安全',
    icon: ShieldCheck,
    items: [
      { label: '运维诊断', path: '/ops/diagnostics', icon: Activity },
      { label: '用户权限', path: '/security/users', icon: Users },
      { label: '审计日志', path: '/security/audit', icon: ScrollText },
      { label: '系统配置', path: '/config', icon: Settings },
    ],
  },
]

const Sidebar: React.FC = () => {
  const location = useLocation()
  const { t } = useI18n()
  const { open, close } = useSidebar()

  const allItems = menuGroups.flatMap((g) => g.items)

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-transform duration-200',
          // Width: mobile drawer (w-72), tablet icon-only (w-16), desktop full (w-64)
          'w-72 md:w-16 lg:w-64',
          // Visibility: mobile hidden unless open, tablet/desktop always visible
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Gauge className="h-5 w-5" />
          </div>
          {/* Label: visible on mobile drawer and desktop, hidden on tablet icon-only */}
          <div className="md:hidden lg:block">
            <div className="text-sm font-semibold text-foreground">SmartCam</div>
            <div className="text-xs text-muted-foreground">{t('安防运维控制台')}</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {menuGroups.map((group) => {
            const GroupIcon = group.icon
            const hasActive = group.items.some((item) => location.pathname.startsWith(item.path))

            return (
              <div className="mb-4" key={group.title}>
                {/* Group label: visible on mobile drawer and desktop, hidden on tablet */}
                <div className={cn(
                  'mb-1 flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground',
                  'md:hidden lg:flex',
                )}>
                  <GroupIcon className="h-3.5 w-3.5" />
                  {t(group.title)}
                </div>

                {/* Tablet: group divider icon */}
                <div className={cn(
                  'mb-1 hidden items-center justify-center py-1 md:flex lg:hidden',
                  hasActive ? 'text-primary' : 'text-muted-foreground/40',
                )}>
                  <GroupIcon className="h-4 w-4" />
                </div>

                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={close}
                        className={({ isActive }) =>
                          cn(
                            'group flex h-9 items-center gap-2.5 rounded-md px-2 text-sm transition-colors',
                            isActive
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            // Tablet: center icon
                            'md:justify-center lg:justify-start',
                          )
                        }
                        title={t(item.label)}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {/* Label: visible on mobile and desktop, hidden on tablet */}
                        <span className="truncate md:hidden lg:block">{t(item.label)}</span>
                      </NavLink>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-border p-3">
          {/* Language switcher: visible on mobile and desktop only */}
          <div className="md:hidden lg:block">
            <LanguageSwitcher className="mb-2" />
          </div>
          <div className={cn(
            'rounded-md border border-border bg-background px-3 py-2',
            'md:flex md:items-center md:justify-center md:px-0 lg:block lg:px-3',
          )}>
            <div className="md:hidden lg:flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t('当前并发')}</span>
              <span className="font-medium text-foreground">3 / 16</span>
            </div>
            {/* Tablet: just a dot indicator */}
            <div className="hidden md:block lg:hidden">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted md:hidden lg:block">
              <div className="h-1.5 w-[19%] rounded-full bg-primary" />
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
