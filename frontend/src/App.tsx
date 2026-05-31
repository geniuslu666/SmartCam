import React, { createContext, useContext, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import LoginPage from './pages/Login'
import PropertyListPage from './pages/PropertyList'
import PreviewPage from './pages/Preview'
import ConfigPanelPage from './pages/ConfigPanel'
import DeviceInventoryPage from './pages/DeviceInventory'
import BrandTemplatesPage from './pages/BrandTemplates'
import DeviceMapPage from './pages/DeviceMap'
import RecordingsPage from './pages/Recordings'
import OperationsPage from './pages/Operations'
import SecurityPage from './pages/Security'
import { useAuth } from './hooks/useAuth'
import { I18nProvider, useI18n } from './i18n'

const queryClient = new QueryClient()

// ─── Sidebar context ──────────────────────────────────────────────────────────
export type SidebarContextType = {
  open: boolean
  toggle: () => void
  close: () => void
}
export const SidebarContext = createContext<SidebarContextType>({
  open: false,
  toggle: () => {},
  close: () => {},
})
export const useSidebar = () => useContext(SidebarContext)

// ─── Auth guard ───────────────────────────────────────────────────────────────
const AuthenticatedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth()
  const { t } = useI18n()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        {t('加载中...')}
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

// ─── Authenticated shell ──────────────────────────────────────────────────────
function AppShell() {
  const [open, setOpen] = useState(false)

  return (
    <SidebarContext.Provider value={{ open, toggle: () => setOpen((v) => !v), close: () => setOpen(false) }}>
      <div className="flex h-full bg-background text-foreground">
        <Sidebar />

        {/* Content wrapper — offset matches sidebar width per breakpoint */}
        <div className="flex min-w-0 flex-1 flex-col md:ml-16 lg:ml-64">
          {/* Mobile top header */}
          <MobileHeader />

          {/* Page content — scrollable */}
          <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
            <Routes>
              <Route path="/properties" element={<PropertyListPage />} />
              <Route path="/map" element={<DeviceMapPage />} />
              <Route path="/preview" element={<PreviewPage />} />
              <Route path="/recordings" element={<RecordingsPage />} />
              <Route path="/patrol" element={<OperationsPage mode="patrol" />} />
              <Route path="/inventory/brand-templates" element={<BrandTemplatesPage />} />
              <Route path="/inventory/nvrs" element={<DeviceInventoryPage mode="nvrs" />} />
              <Route path="/inventory/channels" element={<DeviceInventoryPage mode="channels" />} />
              <Route path="/inventory/streams" element={<DeviceInventoryPage mode="streams" />} />
              <Route path="/ops/diagnostics" element={<OperationsPage mode="diagnostics" />} />
              <Route path="/security/users" element={<SecurityPage mode="users" />} />
              <Route path="/security/audit" element={<SecurityPage mode="audit" />} />
              <Route path="/config" element={<ConfigPanelPage />} />
              <Route path="/" element={<Navigate to="/properties" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  )
}

// ─── Mobile header (visible only on <md) ─────────────────────────────────────
function MobileHeader() {
  const { toggle } = useSidebar()
  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-4 md:hidden">
      <button
        aria-label="Open menu"
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={toggle}
        type="button"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.362a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span className="text-sm font-semibold text-foreground">SmartCam</span>
    </header>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
function App() {
  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={
              <AuthenticatedRoute>
                <AppShell />
              </AuthenticatedRoute>
            } />
          </Routes>
        </Router>
      </QueryClientProvider>
    </I18nProvider>
  )
}

export default App
