import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

// ── Placeholders ──────────────────────────────────────────────────────────────

function Placeholder({ title }) {
  return (
    <div className="p-8">
      <p className="text-dark/40 text-sm">{title} — próximamente</p>
    </div>
  )
}

function MiniWebAppPage() {
  return (
    <div className="min-h-screen bg-dark flex items-center justify-center">
      <div className="text-center">
        <p
          className="text-primary text-3xl"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
        >
          Fidelio
        </p>
        <p className="text-white/40 text-sm mt-2">Mini-webapp del cliente</p>
      </div>
    </div>
  )
}

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

            {/* Raíz → dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

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
              <Route path="configuracion"   element={<Placeholder title="Configuración" />} />
            </Route>

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
