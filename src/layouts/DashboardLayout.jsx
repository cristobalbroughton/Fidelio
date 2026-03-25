import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  PlusCircle,
  Users,
  Gift,
  Settings,
  Star,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'

const NAV_ITEMS = [
  { to: '/dashboard',                    icon: LayoutDashboard, label: 'Dashboard',      end: true  },
  { to: '/dashboard/nueva-compra',       icon: PlusCircle,      label: 'Nueva Compra',   end: false },
  { to: '/dashboard/clientes',           icon: Users,           label: 'Clientes',       end: false },
  { to: '/dashboard/recompensas',        icon: Gift,            label: 'Recompensas',    end: false },
  { to: '/dashboard/configuracion',      icon: Settings,        label: 'Configuración',  end: false },
]

export default function DashboardLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const businessName =
    user?.user_metadata?.business_name ??
    user?.email?.split('@')[0] ??
    'Mi Negocio'

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

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside className="w-60 shrink-0 fixed inset-y-0 left-0 flex flex-col bg-dark border-r border-white/[0.06] z-40">

        {/* Logo */}
        <div className="px-5 pt-7 pb-6">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/15 shrink-0">
              <Star className="w-3.5 h-3.5 text-primary fill-primary" />
            </span>
            <span
              className="text-primary text-[22px] leading-none tracking-[0.08em]"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
            >
              Fidelio
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-white/[0.06] mb-4" />

        {/* Navigation */}
        <nav className="flex-1 px-2.5 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
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
          ))}

          {/* Admin link — solo visible para el superadmin */}
          {user?.email === 'cristobal.broughton@gmail.com' && (
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

      {/* ── Main content ──────────────────────────────────────── */}
      <main className="ml-60 flex-1 min-h-screen bg-cream">
        <Outlet />
      </main>

    </div>
  )
}
