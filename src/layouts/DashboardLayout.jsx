import { useEffect } from 'react'
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  PlusCircle,
  Users,
  Gift,
  Settings,
  Star,
  LogOut,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  BarChart2,
  Lock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { BusinessProvider, useBusinessContext } from '../contexts/BusinessContext'
import {
  WA_UPGRADE_LINK,
  getUpgradeMessage,
} from '../lib/planLimits'
import { getCashierSession, clearCashierSession, isCashierSession } from '../lib/cashierSession'

// ── Plan banner ───────────────────────────────────────────────────────────────

function PlanBanner({ status, className = '' }) {
  if (!status) return null
  const { effective, customerCount, maxCustomers } = status
  const { plan, isGrace, daysLeft } = effective
  const atLimit = maxCustomers !== Infinity && customerCount >= maxCustomers
  const near80  = !atLimit && maxCustomers !== Infinity && customerCount >= maxCustomers * 0.8

  if (!isGrace && !atLimit && !near80) return null

  let bg, textCls, msg
  if (isGrace) {
    bg = 'bg-red-500/[0.15] border-red-500/30'; textCls = 'text-red-400'
    msg = `Tu plan venció. ${daysLeft} día${daysLeft !== 1 ? 's' : ''} para renovar.`
  } else if (atLimit) {
    bg = 'bg-orange-500/[0.12] border-orange-500/25'; textCls = 'text-orange-400'
    msg = 'Alcanzaste el límite de clientes. Sube de plan para continuar.'
  } else {
    bg = 'bg-yellow-500/[0.10] border-yellow-500/20'; textCls = 'text-yellow-500'
    msg = `${customerCount}/${maxCustomers} clientes — acercándote al límite.`
  }

  return (
    <a
      href={WA_UPGRADE_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-[11px] leading-snug hover:opacity-80 transition-opacity ${bg} ${textCls} ${className}`}
    >
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" strokeWidth={2} />
      <span>{msg} →</span>
    </a>
  )
}

// Desktop sidebar items
const NAV_ITEMS = [
  { to: '/dashboard',                    icon: LayoutDashboard, label: 'Dashboard',      end: true  },
  { to: '/dashboard/nueva-compra',       icon: PlusCircle,      label: 'Nueva Compra',   end: false },
  { to: '/dashboard/clientes',           icon: Users,           label: 'Clientes',       end: false },
  { to: '/dashboard/recompensas',        icon: Gift,            label: 'Recompensas',    end: false },
  { to: '/dashboard/analytics',          icon: BarChart2,       label: 'Analytics',      end: false, proOnly: true },
  { to: '/dashboard/configuracion',      icon: Settings,        label: 'Configuración',  end: false },
]

// Mobile bottom nav
const BOTTOM_NAV = [
  { to: '/dashboard',                    icon: LayoutDashboard, label: 'Inicio',    end: true  },
  { to: '/dashboard/nueva-compra',       icon: PlusCircle,      label: 'Compra',    end: false },
  { to: '/dashboard/clientes',           icon: Users,           label: 'Clientes',  end: false },
  { to: '/dashboard/recompensas',        icon: Gift,            label: 'Premios',   end: false },
  { to: '/dashboard/analytics',          icon: BarChart2,       label: 'Analytics', end: false, proOnly: true },
  { to: '/dashboard/configuracion',      icon: Settings,        label: 'Config',    end: false },
  { to: '/ayuda',                        icon: HelpCircle,      label: 'Ayuda',     end: false },
]

// ── Inner layout (requires BusinessContext) ───────────────────────────────────

function DashboardLayoutInner() {
  const { planStatus } = useBusinessContext()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const businessName =
    user?.user_metadata?.business_name ??
    user?.email?.split('@')[0] ??
    'Mi Negocio'

  const isPro = planStatus?.effective?.plan === 'pro'

  const handleAnalyticsLocked = () => {
    toast('Analytics avanzado es exclusivo del plan Pro. Actualiza tu plan para ver tus métricas completas.', {
      icon: '🔒',
      duration: 4000,
    })
  }

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch {
      toast.error('Error al cerrar sesión')
    }
  }

  return (
    <div className="flex min-h-screen">

      {/* ─────────────────────────────────────────────────────────────
          MOBILE — top header (hidden md+)
      ───────────────────────────────────────────────────────────── */}
      <header className="md:hidden fixed top-0 inset-x-0 h-14 z-40 bg-dark border-b border-white/[0.06] flex items-center justify-between px-4">

        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/15 shrink-0">
            <Star className="w-3 h-3 text-primary fill-primary" />
          </span>
          <span
            className="text-primary text-[20px] leading-none tracking-[0.08em]"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Loyia
          </span>
        </Link>

        {/* Business name + logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-white/35 hover:text-red-400 transition-colors duration-150 py-1 pl-2"
        >
          <span className="text-[12px] font-medium truncate max-w-[120px]">{businessName}</span>
          <LogOut className="w-[15px] h-[15px] shrink-0" strokeWidth={1.8} />
        </button>

      </header>

      {/* ─────────────────────────────────────────────────────────────
          DESKTOP — sidebar (hidden below md)
      ───────────────────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-60 shrink-0 fixed inset-y-0 left-0 flex-col bg-dark border-r border-white/[0.06] z-40">

        {/* Logo */}
        <div className="px-5 pt-7 pb-6">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/15 shrink-0">
              <Star className="w-3.5 h-3.5 text-primary fill-primary" />
            </span>
            <span
              className="text-primary text-[22px] leading-none tracking-[0.08em]"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
            >
              Loyia
            </span>
          </Link>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-white/[0.06] mb-4" />

        {/* Plan banner */}
        <div className="px-2.5 mb-2">
          <PlanBanner status={planStatus} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2.5 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end, proOnly }) => {
            if (proOnly && !isPro) {
              return (
                <button
                  key={to}
                  onClick={handleAnalyticsLocked}
                  className="group relative flex items-center gap-3 px-3 rounded-lg text-[13.5px] font-medium transition-all duration-150 select-none min-h-[42px] w-full text-left text-white/30 hover:bg-white/[0.04] cursor-pointer"
                >
                  <Icon className="w-[17px] h-[17px] shrink-0 text-white/20" strokeWidth={1.8} />
                  <span className="flex-1">{label}</span>
                  <Lock className="w-[13px] h-[13px] text-white/20 shrink-0" strokeWidth={1.8} />
                </button>
              )
            }
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  [
                    'group relative flex items-center gap-3 px-3 rounded-lg text-[13.5px] font-medium',
                    'transition-all duration-150 select-none min-h-[42px]',
                    isActive
                      ? 'text-primary bg-primary/[0.08]'
                      : 'text-white/45 hover:text-white/80 hover:bg-white/[0.04]',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary" />
                    )}
                    <Icon
                      className={[
                        'w-[17px] h-[17px] shrink-0 transition-colors duration-150',
                        isActive ? 'text-primary' : 'text-white/35 group-hover:text-white/65',
                      ].join(' ')}
                      strokeWidth={isActive ? 2.1 : 1.8}
                    />
                    {label}
                  </>
                )}
              </NavLink>
            )
          })}

          {/* Admin link — solo visible para el superadmin */}
          {user?.email === import.meta.env.VITE_ADMIN_EMAIL && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                [
                  'group relative flex items-center gap-3 px-3 rounded-lg text-[13.5px] font-medium',
                  'transition-all duration-150 select-none min-h-[42px]',
                  isActive
                    ? 'text-primary bg-primary/[0.08]'
                    : 'text-white/45 hover:text-white/80 hover:bg-white/[0.04]',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary" />
                  )}
                  <ShieldCheck
                    className={[
                      'w-[17px] h-[17px] shrink-0 transition-colors duration-150',
                      isActive ? 'text-primary' : 'text-white/35 group-hover:text-white/65',
                    ].join(' ')}
                    strokeWidth={isActive ? 2.1 : 1.8}
                  />
                  Admin
                </>
              )}
            </NavLink>
          )}
        </nav>

        {/* Bottom: business info + logout */}
        <div className="mx-5 h-px bg-white/[0.06] mt-4" />

        <div className="px-2.5 pb-5 pt-3 space-y-0.5">
          {/* Business identity */}
          <div className="flex items-center gap-3 px-3 py-2.5 min-h-[42px]">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary text-[11px] font-semibold shrink-0 uppercase tracking-wide">
              {businessName.charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] text-white/25 uppercase tracking-[0.1em] font-medium leading-none mb-1">
                Negocio
              </p>
              <p className="text-[13px] text-white/60 font-medium truncate leading-none">
                {businessName}
              </p>
            </div>
          </div>

          {/* Ayuda */}
          <NavLink
            to="/ayuda"
            className={({ isActive }) =>
              [
                'group relative flex items-center gap-3 px-3 rounded-lg text-[13.5px] font-medium',
                'transition-all duration-150 select-none min-h-[42px]',
                isActive
                  ? 'text-primary bg-primary/[0.08]'
                  : 'text-white/45 hover:text-white/80 hover:bg-white/[0.04]',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary" />
                )}
                <HelpCircle
                  className={[
                    'w-[17px] h-[17px] shrink-0 transition-colors duration-150',
                    isActive ? 'text-primary' : 'text-white/35 group-hover:text-white/65',
                  ].join(' ')}
                  strokeWidth={isActive ? 2.1 : 1.8}
                />
                Ayuda
              </>
            )}
          </NavLink>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="group w-full flex items-center gap-3 px-3 rounded-lg text-[13.5px] font-medium text-white/35 hover:text-red-400 hover:bg-red-500/[0.07] transition-all duration-150 min-h-[42px] cursor-pointer"
          >
            <LogOut
              className="w-[17px] h-[17px] shrink-0 text-white/30 group-hover:text-red-400 transition-colors duration-150"
              strokeWidth={1.8}
            />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          Main content
          Mobile:  pt-14 (header) + pb-20 (bottom nav clearance)
          Desktop: ml-60, no top/bottom offsets
      ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 min-h-screen bg-cream pt-14 pb-20 md:pt-0 md:pb-0 md:ml-60">
        <div className="md:hidden px-4 pt-3">
          <PlanBanner status={planStatus} />
        </div>
        <Outlet />
      </main>

      {/* ─────────────────────────────────────────────────────────────
          MOBILE — bottom nav (hidden md+)
      ───────────────────────────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-dark border-t border-white/[0.06]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-stretch">
          {BOTTOM_NAV.map(({ to, icon: Icon, label, end, proOnly }) => {
            if (proOnly && !isPro) {
              return (
                <button key={to} className="flex-1" onClick={handleAnalyticsLocked}>
                  <div className="flex flex-col items-center justify-center gap-1 py-2.5 relative text-white/20">
                    <Icon className="w-5 h-5 shrink-0" strokeWidth={1.7} />
                    <span className="text-[10px] font-medium leading-none tracking-wide flex items-center gap-0.5">
                      {label}
                      <Lock className="w-[9px] h-[9px] shrink-0" strokeWidth={2} />
                    </span>
                  </div>
                </button>
              )
            }
            return (
              <NavLink key={to} to={to} end={end} className="flex-1">
                {({ isActive }) => (
                  <div
                    className={[
                      'flex flex-col items-center justify-center gap-1 py-2.5 transition-colors duration-150 relative',
                      isActive ? 'text-primary' : 'text-white/30',
                    ].join(' ')}
                  >
                    {isActive && (
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full bg-primary" />
                    )}
                    <Icon
                      className="w-5 h-5 shrink-0"
                      strokeWidth={isActive ? 2.1 : 1.7}
                    />
                    <span className="text-[10px] font-medium leading-none tracking-wide">
                      {label}
                    </span>
                  </div>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

    </div>
  )
}

// ── Outer wrapper ─────────────────────────────────────────────────────────────

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  // Redirect cashiers away from non-purchase routes
  useEffect(() => {
    if (isCashierSession() && location.pathname !== '/dashboard/nueva-compra') {
      navigate('/dashboard/nueva-compra', { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cashier layout ─────────────────────────────────────────────────────────
  const cashier = getCashierSession()
  if (cashier) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="fixed top-0 inset-x-0 h-14 z-40 bg-dark border-b border-white/[0.06] flex items-center justify-between px-4">
          <Link to="/dashboard/nueva-compra" className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/15 shrink-0">
              <Star className="w-3 h-3 text-primary fill-primary" />
            </span>
            <span
              className="text-primary text-[20px] leading-none tracking-[0.08em]"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
            >
              Loyia
            </span>
          </Link>

          <span className="absolute left-1/2 -translate-x-1/2 text-[12px] text-white/40 font-medium truncate max-w-[140px]">
            {cashier.business_name}
          </span>

          <button
            onClick={() => { clearCashierSession(); navigate('/login') }}
            className="flex items-center gap-1.5 text-white/35 hover:text-red-400 transition-colors duration-150 py-1 pl-2"
          >
            <span className="text-[12px] font-medium truncate max-w-[100px]">{cashier.cashier_name}</span>
            <LogOut className="w-[15px] h-[15px] shrink-0" strokeWidth={1.8} />
          </button>
        </header>

        <main className="flex-1 min-h-screen bg-cream pt-14 flex justify-center">
          <div className="w-full max-w-xl px-4">
            <Outlet />
          </div>
        </main>
      </div>
    )
  }

  return (
    <BusinessProvider>
      <DashboardLayoutInner />
    </BusinessProvider>
  )
}
