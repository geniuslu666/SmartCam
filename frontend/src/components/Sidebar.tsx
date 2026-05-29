import React, { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Activity,
  Building2,
  Camera,
  ChevronDown,
  ClipboardList,
  Gauge,
  KeyRound,
  LayoutDashboard,
  MonitorPlay,
  Network,
  RadioTower,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { cn } from './ui'
import LanguageSwitcher from './LanguageSwitcher'
import { useI18n } from '../i18n'

type MenuItem = {
  label: string
  path: string
  icon: React.ElementType
}

type MenuGroup = {
  title: string
  icon: React.ElementType
  items: MenuItem[]
}

const menuGroups: MenuGroup[] = [
  {
    title: '监控工作台',
    icon: LayoutDashboard,
    items: [
      { label: '物业总览', path: '/properties', icon: Building2 },
      { label: '实时预览', path: '/preview', icon: MonitorPlay },
      { label: '大屏轮巡', path: '/patrol', icon: RadioTower },
    ],
  },
  {
    title: '设备台账',
    icon: ClipboardList,
    items: [
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
  const initialOpen = useMemo(
    () => menuGroups.map((group) => group.items.some((item) => location.pathname.startsWith(item.path))),
    [location.pathname],
  )
  const [openGroups, setOpenGroups] = useState<boolean[]>(initialOpen)

  const toggleGroup = (index: number) => {
    setOpenGroups((groups) => groups.map((open, groupIndex) => (groupIndex === index ? !open : open)))
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Gauge className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base font-semibold text-foreground">SmartCam</div>
          <div className="text-xs text-muted-foreground">{t('安防运维控制台')}</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {menuGroups.map((group, groupIndex) => {
          const GroupIcon = group.icon
          const isOpen = openGroups[groupIndex]
          return (
            <section className="mb-3" key={group.title}>
              <button
                className="flex h-9 w-full items-center justify-between rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => toggleGroup(groupIndex)}
                type="button"
              >
                <span className="flex items-center gap-2">
                  <GroupIcon className="h-4 w-4" />
                  {t(group.title)}
                </span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <div className="mt-1 space-y-1">
                  {group.items.map((item) => {
                    const ItemIcon = item.icon
                    return (
                      <NavLink
                        className={({ isActive }) =>
                          cn(
                            'flex h-9 items-center gap-2 rounded-md px-3 text-sm transition-colors',
                            isActive
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          )
                        }
                        key={item.path}
                        to={item.path}
                      >
                        <ItemIcon className="h-4 w-4" />
                        <span>{t(item.label)}</span>
                      </NavLink>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </nav>

      <div className="border-t border-border p-4">
        <LanguageSwitcher className="mb-3" />
        <div className="rounded-md border border-border bg-background p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t('当前并发')}</span>
            <span className="font-medium text-foreground">3 / 16</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted">
            <div className="h-2 w-[19%] rounded-full bg-primary" />
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
