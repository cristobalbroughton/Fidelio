import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2, Building2, Users, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// ── Constante ─────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = 'cristobal.broughton@gmail.com'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

// ── Componente ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()

  const [stats, setStats]           = useState(null)
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading]       = useState(true)

  // ── Guard de email ──────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  if (user && user.email !== ADMIN_EMAIL) {
    return <Navigate to="/dashboard" replace />
  }

  // ── Carga datos ─────────────────────────────────────────────────────────────

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!user) return
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    Promise.all([
      // Q1: todos los negocios
      supabase.from('businesses')
        .select('id, name, plan, last_activity_at, created_at')
        .order('created_at', { ascending: false }),

      // Q2: total clientes plataforma
      supabase.from('loyalty_customers')
        .select('*', { count: 'exact', head: true }),

      // Q3: transacciones hoy
      supabase.from('transactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfToday.toISOString()),

      // Q4: clientes por negocio
      supabase.from('loyalty_customers').select('business_id'),

      // Q5: transacciones por negocio
      supabase.from('transactions').select('business_id'),

    ]).then(([q1, q2, q3, q4, q5]) => {
      if (q1.error) { toast.error('Error cargando negocios'); setLoading(false); return }

      const custMap = {}
      for (const c of q4.data ?? []) custMap[c.business_id] = (custMap[c.business_id] ?? 0) + 1
      const txMap = {}
      for (const t of q5.data ?? []) txMap[t.business_id] = (txMap[t.business_id] ?? 0) + 1

      setStats({
        totalNegocios: (q1.data ?? []).length,
        totalClientes: q2.count ?? 0,
        txHoy:         q3.count ?? 0,
      })
      setBusinesses((q1.data ?? []).map(b => ({
        ...b,
        totalClientes:      custMap[b.id] ?? 0,
        totalTransacciones: txMap[b.id] ?? 0,
      })))
      setLoading(false)
    })
  }, [user])

  // ── Render ──────────────────────────────────────────────────────────────────

  const hasInactive = businesses.some(
    b => !b.last_activity_at || new Date(b.last_activity_at) < THIRTY_DAYS_AGO
  )

  return (
    <div className="p-8 lg:p-10 max-w-6xl">

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1
            className="text-[26px] font-semibold text-dark tracking-tight"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Panel Admin
          </h1>
          <p className="text-dark/45 text-sm mt-1">Vista de plataforma — solo acceso interno</p>
        </div>
        <span className="text-[11px] font-mono text-dark/30 bg-dark/[0.04] px-3 py-1.5 rounded-lg">
          {ADMIN_EMAIL}
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Negocios activos',      value: stats?.totalNegocios, icon: Building2 },
          { label: 'Clientes plataforma',   value: stats?.totalClientes, icon: Users     },
          { label: 'Transacciones hoy',     value: stats?.txHoy,         icon: Zap       },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl p-6 border border-black/[0.05] shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-5">
              <span className="text-[13px] font-medium text-dark/55">{label}</span>
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/[0.08] shrink-0">
                <Icon className="w-[15px] h-[15px] text-primary" strokeWidth={1.9} />
              </span>
            </div>
            {loading ? (
              <div className="h-10 w-20 bg-dark/[0.06] rounded-lg animate-pulse" />
            ) : (
              <p
                className="text-[44px] leading-none text-primary tabular-nums"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
              >
                {(value ?? 0).toLocaleString('es-CL')}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Tabla negocios */}
      <div className="bg-white rounded-2xl border border-black/[0.05] shadow-sm overflow-hidden">

        {/* Header tabla */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06]">
          <p className="text-[13px] font-semibold text-dark">Todos los negocios</p>
          {hasInactive && (
            <span className="flex items-center gap-1.5 text-[11px] text-red-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              Inactivo +30 días
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/[0.06]">
                {['Negocio', 'Plan', 'Clientes', 'Transacciones', 'Última actividad'].map(col => (
                  <th
                    key={col}
                    className="px-5 py-3.5 text-left text-[11px] font-medium text-dark/35 uppercase tracking-[0.08em] whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Skeleton */}
              {loading && Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-black/[0.04]">
                  {[55, 25, 20, 25, 35].map((w, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-3 bg-dark/[0.06] rounded-full animate-pulse" style={{ width: `${w}%` }} />
                    </td>
                  ))}
                </tr>
              ))}

              {/* Empty */}
              {!loading && businesses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <p className="text-dark/35 text-sm">Sin negocios registrados aún.</p>
                  </td>
                </tr>
              )}

              {/* Filas */}
              {!loading && businesses.map(b => {
                const inactive = !b.last_activity_at || new Date(b.last_activity_at) < THIRTY_DAYS_AGO
                return (
                  <tr
                    key={b.id}
                    className={[
                      'border-b border-black/[0.04] last:border-0',
                      inactive ? 'bg-red-50/60' : '',
                    ].join(' ')}
                  >
                    {/* Negocio */}
                    <td className="px-5 py-4">
                      <p className={`text-[14px] font-semibold leading-tight ${inactive ? 'text-red-600' : 'text-dark'}`}>
                        {b.name}
                      </p>
                      <p className="text-[11px] text-dark/30 mt-0.5 font-mono">
                        {b.id.slice(0, 8)}…
                      </p>
                    </td>

                    {/* Plan */}
                    <td className="px-5 py-4">
                      {b.plan ? (
                        <span className={`inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-md uppercase tracking-wide ${
                          b.plan === 'pro'
                            ? 'bg-primary/[0.08] text-primary'
                            : 'bg-dark/[0.05] text-dark/45'
                        }`}>
                          {b.plan}
                        </span>
                      ) : (
                        <span className="text-dark/25 text-sm">—</span>
                      )}
                    </td>

                    {/* Clientes */}
                    <td className="px-5 py-4 text-right">
                      <span className="text-[14px] text-dark tabular-nums">
                        {b.totalClientes.toLocaleString('es-CL')}
                      </span>
                    </td>

                    {/* Transacciones */}
                    <td className="px-5 py-4 text-right">
                      <span className="text-[14px] text-dark tabular-nums">
                        {b.totalTransacciones.toLocaleString('es-CL')}
                      </span>
                    </td>

                    {/* Última actividad */}
                    <td className="px-5 py-4 text-right">
                      {b.last_activity_at ? (
                        <span className={`text-sm whitespace-nowrap ${inactive ? 'text-red-500' : 'text-dark/45'}`}>
                          {formatDate(b.last_activity_at)}
                        </span>
                      ) : (
                        <span className="text-sm text-red-400">Sin actividad</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
