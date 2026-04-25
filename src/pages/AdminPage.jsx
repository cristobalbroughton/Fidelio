import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Loader2, Building2, Users, Zap,
  CalendarPlus, Activity, Percent, Star,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// ── Constantes ────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

const TICK = { fontSize: 11, fill: 'rgba(15,15,15,0.4)' }
const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#1a1a1a',
    border: 'none',
    borderRadius: 8,
    color: '#f4f1ea',
    fontSize: 12,
  },
  cursor: { stroke: 'rgba(201,168,76,0.15)', strokeWidth: 8 },
}

const STATUS_STYLE = {
  green:  { dot: 'bg-emerald-400', text: 'Activo',  row: '' },
  yellow: { dot: 'bg-amber-400',   text: '7–30d',   row: 'bg-amber-50/40' },
  red:    { dot: 'bg-red-400',     text: '+30d',    row: 'bg-red-50/60' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function getActivityStatus(lastActivityAt) {
  if (!lastActivityAt) return 'red'
  const d = new Date(lastActivityAt)
  if (d >= new Date(Date.now() - 7  * 86400000)) return 'green'
  if (d >= new Date(Date.now() - 30 * 86400000)) return 'yellow'
  return 'red'
}

function buildPlatformLineData(txs) {
  const counts = {}
  for (const tx of txs) {
    const day = tx.created_at.slice(0, 10)
    counts[day] = (counts[day] ?? 0) + 1
  }
  const result = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const key = d.toISOString().slice(0, 10)
    result.push({
      date: d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }),
      transacciones: counts[key] ?? 0,
    })
  }
  return result
}

function buildBizGrowthData(businesses) {
  const counts = {}
  for (const b of businesses) {
    const month = b.created_at.slice(0, 7)
    counts[month] = (counts[month] ?? 0) + 1
  }
  let cumulative = 0
  return Object.keys(counts).sort().map(key => {
    cumulative += counts[key]
    const [y, m] = key.split('-')
    return {
      mes: new Date(y, m - 1, 1).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' }),
      negocios: cumulative,
    }
  })
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()

  const [stats, setStats]                   = useState(null)
  const [businesses, setBusinesses]         = useState([])
  const [platformLineData, setPlatformLineData] = useState([])
  const [bizGrowthData, setBizGrowthData]   = useState([])
  const [loading, setLoading]               = useState(true)

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

    const now = new Date()
    const startOfMonth   = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const thirtyDaysAgo  = new Date(now - 30 * 86400000).toISOString()
    const sevenDaysAgo   = new Date(now - 7  * 86400000).toISOString()
    const startOfToday   = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

    Promise.all([
      /* Q1 */ supabase.from('businesses')
                 .select('id, name, plan, last_activity_at, created_at')
                 .order('created_at', { ascending: false }),

      /* Q2 */ supabase.from('loyalty_customers')
                 .select('*', { count: 'exact', head: true }),

      /* Q3 */ supabase.from('transactions')
                 .select('*', { count: 'exact', head: true })
                 .gte('created_at', startOfToday),

      /* Q4 */ supabase.from('loyalty_customers')
                 .select('business_id, visits_count'),

      /* Q5 */ supabase.from('transactions')
                 .select('business_id'),

      /* Q6 */ supabase.from('transactions')
                 .select('created_at')
                 .gte('created_at', thirtyDaysAgo),

      /* Q7 */ supabase.from('transactions')
                 .select('points_delta')
                 .in('type', ['earn', 'welcome']),

      /* Q8 */ supabase.from('rewards')
                 .select('business_id'),

    ]).then(([q1, q2, q3, q4, q5, q6, q7, q8]) => {
      if (q1.error) { toast.error('Error cargando datos'); setLoading(false); return }

      const allBizs = q1.data ?? []

      // custMap + retentionMap
      const custMap     = {}
      const retainedMap = {}
      for (const c of q4.data ?? []) {
        custMap[c.business_id] = (custMap[c.business_id] ?? 0) + 1
        if (c.visits_count >= 2)
          retainedMap[c.business_id] = (retainedMap[c.business_id] ?? 0) + 1
      }

      // txMap
      const txMap = {}
      for (const t of q5.data ?? []) txMap[t.business_id] = (txMap[t.business_id] ?? 0) + 1

      // rewardsMap
      const rewardsMap = {}
      for (const r of q8.data ?? []) rewardsMap[r.business_id] = (rewardsMap[r.business_id] ?? 0) + 1

      setStats({
        totalNegocios:     allBizs.length,
        totalClientes:     q2.count ?? 0,
        txHoy:             q3.count ?? 0,
        negociosEsteMes:   allBizs.filter(b => b.created_at >= startOfMonth).length,
        negociosActivos7d: allBizs.filter(b => b.last_activity_at && b.last_activity_at >= sevenDaysAgo).length,
        tasaActivacion:    allBizs.length > 0
          ? Math.round(allBizs.filter(b => (txMap[b.id] ?? 0) > 0).length / allBizs.length * 100)
          : 0,
        puntosHistorico:   (q7.data ?? []).reduce((s, t) => s + t.points_delta, 0),
      })

      setBusinesses(allBizs.map(b => ({
        ...b,
        totalClientes:      custMap[b.id] ?? 0,
        totalTransacciones: txMap[b.id]   ?? 0,
        totalRecompensas:   rewardsMap[b.id] ?? 0,
        tasaRetencion: custMap[b.id]
          ? Math.round((retainedMap[b.id] ?? 0) / custMap[b.id] * 100)
          : 0,
      })))

      setPlatformLineData(buildPlatformLineData(q6.data ?? []))
      setBizGrowthData(buildBizGrowthData(allBizs))
      setLoading(false)
    })
  }, [user])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 lg:p-10 max-w-7xl">

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

      {/* ── Fila 1: stats principales ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {[
          { label: 'Negocios activos',    value: stats?.totalNegocios, icon: Building2 },
          { label: 'Clientes plataforma', value: stats?.totalClientes, icon: Users     },
          { label: 'Transacciones hoy',   value: stats?.txHoy,         icon: Zap       },
        ].map(({ label, value, icon: Icon }) => (
          <StatCard key={label} label={label} value={value} icon={Icon} loading={loading} />
        ))}
      </div>

      {/* ── Fila 2: stats secundarios ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Nuevos este mes',    value: stats?.negociosEsteMes,  icon: CalendarPlus, suffix: ''  },
          { label: 'Activos últimos 7d', value: stats?.negociosActivos7d, icon: Activity,    suffix: ''  },
          { label: 'Tasa de activación', value: stats?.tasaActivacion,   icon: Percent,      suffix: '%' },
          { label: 'Puntos histórico',   value: stats?.puntosHistorico,  icon: Star,         suffix: ''  },
        ].map(({ label, value, icon: Icon, suffix }) => (
          <StatCard key={label} label={label} value={value} icon={Icon} loading={loading} suffix={suffix} small />
        ))}
      </div>

      {/* ── Gráficos ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-8">

        {/* LineChart — transacciones diarias plataforma */}
        <div className="bg-white rounded-2xl border border-black/[0.05] shadow-sm p-6">
          <p className="text-[13px] font-medium text-dark/55 mb-5">
            Transacciones diarias — plataforma completa (30 días)
          </p>
          {loading ? (
            <div className="h-48 bg-dark/[0.04] rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={192}>
              <LineChart data={platformLineData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="date"          tick={TICK} axisLine={false} tickLine={false} interval={4} />
                <YAxis                         tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE.contentStyle}
                  cursor={TOOLTIP_STYLE.cursor}
                  formatter={v => [v, 'Transacciones']}
                />
                <Line
                  type="monotone"
                  dataKey="transacciones"
                  stroke="#c9a84c"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#c9a84c' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* LineChart — crecimiento acumulado de negocios */}
        <div className="bg-white rounded-2xl border border-black/[0.05] shadow-sm p-6">
          <p className="text-[13px] font-medium text-dark/55 mb-5">
            Crecimiento de negocios — acumulado por mes
          </p>
          {loading ? (
            <div className="h-48 bg-dark/[0.04] rounded-xl animate-pulse" />
          ) : bizGrowthData.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-dark/25 text-sm">Sin datos de crecimiento aún</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={192}>
              <LineChart data={bizGrowthData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="mes"           tick={TICK} axisLine={false} tickLine={false} />
                <YAxis                         tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE.contentStyle}
                  cursor={TOOLTIP_STYLE.cursor}
                  formatter={v => [v, 'Negocios']}
                />
                <Line
                  type="monotone"
                  dataKey="negocios"
                  stroke="#c9a84c"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#c9a84c' }}
                  activeDot={{ r: 5, fill: '#c9a84c' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Tabla de negocios ── */}
      <div className="bg-white rounded-2xl border border-black/[0.05] shadow-sm overflow-hidden">

        <div className="flex items-center gap-4 px-6 py-4 border-b border-black/[0.06] flex-wrap">
          <p className="text-[13px] font-semibold text-dark">Todos los negocios</p>
          <div className="flex items-center gap-3 ml-auto text-[11px] font-medium">
            {['green', 'yellow', 'red'].map(s => (
              <span key={s} className="flex items-center gap-1.5 text-dark/40">
                <span className={`w-2 h-2 rounded-full inline-block ${STATUS_STYLE[s].dot}`} />
                {STATUS_STYLE[s].text}
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/[0.06]">
                {['Estado', 'Negocio', 'Plan', 'Clientes', 'Retención', 'Recompensas', 'Transacciones', 'Última actividad'].map(col => (
                  <th
                    key={col}
                    className="px-4 py-3.5 text-left text-[11px] font-medium text-dark/35 uppercase tracking-[0.08em] whitespace-nowrap"
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
                  {[15, 40, 20, 15, 15, 15, 18, 25].map((w, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-3 bg-dark/[0.06] rounded-full animate-pulse" style={{ width: `${w}%` }} />
                    </td>
                  ))}
                </tr>
              ))}

              {/* Empty */}
              {!loading && businesses.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <p className="text-dark/35 text-sm">Sin negocios registrados aún.</p>
                  </td>
                </tr>
              )}

              {/* Filas */}
              {!loading && businesses.map(b => {
                const status = getActivityStatus(b.last_activity_at)
                const st = STATUS_STYLE[status]
                return (
                  <tr
                    key={b.id}
                    className={`border-b border-black/[0.04] last:border-0 ${st.row}`}
                  >
                    {/* Estado */}
                    <td className="px-4 py-4">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${st.dot}`} />
                        <span className="text-[11px] text-dark/45 font-medium whitespace-nowrap">{st.text}</span>
                      </span>
                    </td>

                    {/* Negocio + fecha registro */}
                    <td className="px-4 py-4 min-w-[140px]">
                      <p className="text-[13px] font-semibold text-dark leading-tight">{b.name}</p>
                      <p className="text-[11px] text-dark/30 mt-0.5">{formatDate(b.created_at)}</p>
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-4">
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
                    <td className="px-4 py-4 text-right">
                      <span className="text-[13px] text-dark tabular-nums">
                        {b.totalClientes.toLocaleString('es-CL')}
                      </span>
                    </td>

                    {/* Retención */}
                    <td className="px-4 py-4 text-right">
                      <span className={`text-[13px] font-medium tabular-nums ${
                        b.totalClientes === 0 ? 'text-dark/25' :
                        b.tasaRetencion >= 50 ? 'text-emerald-600' :
                        b.tasaRetencion >= 20 ? 'text-amber-600' :
                        'text-dark/45'
                      }`}>
                        {b.totalClientes === 0 ? '—' : `${b.tasaRetencion}%`}
                      </span>
                    </td>

                    {/* Recompensas */}
                    <td className="px-4 py-4 text-right">
                      <span className="text-[13px] text-dark tabular-nums">
                        {b.totalRecompensas}
                      </span>
                    </td>

                    {/* Transacciones */}
                    <td className="px-4 py-4 text-right">
                      <span className="text-[13px] text-dark tabular-nums">
                        {b.totalTransacciones.toLocaleString('es-CL')}
                      </span>
                    </td>

                    {/* Última actividad */}
                    <td className="px-4 py-4 text-right">
                      {b.last_activity_at ? (
                        <span className={`text-[12px] whitespace-nowrap ${
                          status === 'red' ? 'text-red-500' :
                          status === 'yellow' ? 'text-amber-600' :
                          'text-dark/45'
                        }`}>
                          {formatDate(b.last_activity_at)}
                        </span>
                      ) : (
                        <span className="text-[12px] text-red-400">Sin actividad</span>
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

// ── StatCard helper ───────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, loading, suffix = '', small = false }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-black/[0.05] shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-5">
        <span className="text-[13px] font-medium text-dark/55 leading-snug">{label}</span>
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/[0.08] shrink-0">
          <Icon className="w-[15px] h-[15px] text-primary" strokeWidth={1.9} />
        </span>
      </div>
      {loading ? (
        <div className={`${small ? 'h-9 w-16' : 'h-10 w-20'} bg-dark/[0.06] rounded-lg animate-pulse`} />
      ) : (
        <p
          className={`${small ? 'text-[36px]' : 'text-[44px]'} leading-none text-primary tabular-nums`}
          style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
        >
          {(value ?? 0).toLocaleString('es-CL')}{suffix}
        </p>
      )}
    </div>
  )
}
