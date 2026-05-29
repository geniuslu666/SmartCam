import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import LoginPage from './pages/Login'
import PropertyListPage from './pages/PropertyList'
import PreviewPage from './pages/Preview'
import ConfigPanelPage from './pages/ConfigPanel'
import DeviceInventoryPage from './pages/DeviceInventory'
import OperationsPage from './pages/Operations'
import SecurityPage from './pages/Security'
import { useAuth } from './hooks/useAuth'
import { I18nProvider, useI18n } from './i18n'

const queryClient = new QueryClient()

type AuthenticatedRouteProps = {
  children: React.ReactNode
}

const AuthenticatedRoute = ({ children }: AuthenticatedRouteProps) => {
  const { isAuthenticated, loading } = useAuth()
  const { t } = useI18n()

  if (loading) {
    return <div className="min-h-screen bg-gray-900 p-6 text-gray-200">{t('加载中...')}</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return children
}

function App() {
  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={
              <AuthenticatedRoute>
                <div className="min-h-screen bg-background text-foreground">
                  <Sidebar />
                  <main className="ml-72 min-h-screen">
                    <Routes>
                      <Route path="/properties" element={<PropertyListPage />} />
                      <Route path="/preview" element={<PreviewPage />} />
                      <Route path="/patrol" element={<OperationsPage mode="patrol" />} />
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
              </AuthenticatedRoute>
            } />
          </Routes>
        </Router>
      </QueryClientProvider>
    </I18nProvider>
  )
}

export default App
