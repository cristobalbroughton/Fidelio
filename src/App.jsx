import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import { AuthProvider } from './contexts/AuthContext'
import PublicRoute from './components/PublicRoute'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './layouts/DashboardLayout'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OnboardingPage from './pages/OnboardingPage'
import HomePage from './pages/dashboard/HomePage'
import NuevaCompraPage from './pages/dashboard/NuevaCompraPage'
import ClientesPage from './pages/dashboard/ClientesPage'
import RecompensasPage from './pages/dashboard/RecompensasPage'
import MiniWebAppPage from './pages/MiniWebAppPage'
import AdminPage from './pages/AdminPage'
import ConfiguracionPage from './pages/dashboard/ConfiguracionPage'
import AnalyticsPage from './pages/dashboard/AnalyticsPage'
import LandingPage from './pages/LandingPage'
import PrivacidadPage from './pages/PrivacidadPage'
import TerminosPage from './pages/TerminosPage'
import AyudaPage from './pages/AyudaPage'

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-dark flex items-center justify-center">
      <div className="text-center">
        <p
          className="text-primary text-7xl leading-none"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
        >
          404
        </p>
        <p className="text-white/40 text-sm mt-3">Página no encontrada</p>
      </div>
    </div>
  )
}

// ── Query client ──────────────────────────────────────────────────────────────

const queryClient = new QueryClient()

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>

            {/* Raíz → landing (redirige a /dashboard si hay sesión) */}
            <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />

            {/* Rutas públicas (redirigen si ya hay sesión) */}
            <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

            {/* Mini-webapp del cliente — pública sin auth */}
            <Route path="/c/:slug" element={<MiniWebAppPage />} />

            {/* Onboarding — protegida, fuera del layout del dashboard */}
            <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

            {/* Dashboard — protegido, con layout y sidebar */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index                  element={<HomePage />} />
              <Route path="nueva-compra"   element={<NuevaCompraPage />} />
              <Route path="clientes"        element={<ClientesPage />} />
              <Route path="recompensas"     element={<RecompensasPage />} />
              <Route path="configuracion"   element={<ConfiguracionPage />} />
              <Route path="analytics"       element={<AnalyticsPage />} />
            </Route>

            {/* Admin — protegida, con DashboardLayout */}
            <Route path="/admin" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<AdminPage />} />
            </Route>

            {/* Páginas legales — públicas */}
            <Route path="/privacidad" element={<PrivacidadPage />} />
            <Route path="/terminos"   element={<TerminosPage />} />

            {/* Ayuda — protegida, standalone (sin DashboardLayout) */}
            <Route path="/ayuda" element={<ProtectedRoute><AyudaPage /></ProtectedRoute>} />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />

          </Routes>

          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1a1a1a',
                color: '#f4f1ea',
                border: '1px solid rgba(255,255,255,0.1)',
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#f4f1ea' },
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
