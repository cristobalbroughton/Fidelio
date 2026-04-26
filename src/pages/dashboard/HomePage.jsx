import { useState, useEffect } from 'react'
import { Users, Star, ShoppingBag, TrendingUp, Loader2, AlertTriangle, X, CheckCircle2 } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { WA_UPGRADE_LINK } from '../../lib/planLimits'

// ── Helpers de datos ──────────────────────────────────────────────────────────

function buildLineData(earnTxs) {
  const counts = {}
  for (const tx of earnTxs) {
    const day = tx.created_at.slice(0, 10)
    counts[day] = (counts[day] ?? 0) + 1
  }
  const result = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const key = d.toISOString().slice(0, 10)
    result.push({
      date: d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }),
      visitas: counts[key] ?? 0,
    })
  }
  return result
}

function buildBarData(customers) {
  const ranges = [
    { rango: '0–100',     min: 0,    max: 100      },
    { rango: '101–500',   min: 101,  max: 500      },
    { rango: '501–1.000', min: 501,  max: 1000     },
    { rango: '1.000+',    min: 1001, max: Infinity  },
  ]
  return ranges.map(r => ({
    rango: r.rango,
    clientes: customers.filter(c => c.points_balance >= r.min && c.points_balance <= r.max).length,
  }))
}

// ── Constantes recharts ───────────────────────────────────────────────────────

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

// ── Componente ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user } = useAuth()

  const [business, setBusiness]         = useState(null)
  const [loadingBusiness, setLB]        = useState(true)
  const [metrics, setMetrics]           = useState(null)
  const [lineData, setLineData]         = useState([])
  const [barData, setBarData]           = useState([])
  const [loadingData, setLoadingData]   = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  // ── Carga business ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('businesses')
      .select('id, name, failed_registrations, plan, primary_color, logo_url, slug')
      .eq('owner_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) toast.error('Error cargando datos del negocio')
        else {
          setBusiness(data)
          const dismissed = localStorage.getItem(`fidelio_onboarding_v1_${data?.id}`)
          if (dismissed) setBannerDismissed(true)
        }
        setLB(false)
      })
  }, [user?.id])

  // ── Carga métricas ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!business?.id) return
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
    setLoadingData(true)

    Promise.all([
      // Q1: total clientes
      supabase.from('loyalty_customers')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.id),

      // Q2: earn txs este mes → puntos sum + visitas count
      supabase.from('transactions')
        .select('points_delta')
        .eq('business_id', business.id)
        .eq('type', 'earn')
        .gte('created_at', startOfMonth),

      // Q3: canjes este mes
      supabase.from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .eq('type', 'redeem')
        .gte('created_at', startOfMonth),

      // Q4: earn txs últimos 30 días → line chart
      supabase.from('transactions')
        .select('created_at')
        .eq('business_id', business.id)
        .eq('type', 'earn')
        .gte('created_at', thirtyDaysAgo),

      // Q5: points_balance todos los clientes → bar chart
      supabase.from('loyalty_customers')
        .select('points_balance')
        .eq('business_id', business.id)
        .limit(1000),

      // Q6: total earn txs ever → onboarding step 3
      supabase.from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .eq('type', 'earn'),

    ]).then(([q1, q2, q3, q4, q5, q6]) => {
      if (q1.error || q2.error || q3.error) {
        toast.error('Error cargando métricas')
      } else {
        setMetrics({
          totalClientes:  q1.count ?? 0,
          puntosEsteMes:  (q2.data ?? []).reduce((s, t) => s + t.points_delta, 0),
          visitasEsteMes: (q2.data ?? []).length,
          canjesEsteMes:  q3.count ?? 0,
          earnTxTotal:    q6.count ?? 0,
        })
        setLineData(buildLineData(q4.data ?? []))
        setBarData(buildBarData(q5.data ?? []))
      }
      setLoadingData(false)
    })
  }, [business?.id])

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (loadingBusiness) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  // ── Tarjetas ────────────────────────────────────────────────────────────────

  const CARDS = [
    { label: 'Total clientes',   value: metrics?.totalClientes,  icon: Users       },
    { label: 'Puntos este mes',  value: metrics?.puntosEsteMes,  icon: Star        },
    { label: 'Visitas este mes', value: metrics?.visitasEsteMes, icon: TrendingUp  },
    { label: 'Canjes este mes',  value: metrics?.canjesEsteMes,  icon: ShoppingBag },
  ]

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 lg:p-10 max-w-6xl pb-24 md:pb-8">

      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-[26px] font-semibold text-dark tracking-tight"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
        >
          Dashboard
        </h1>
        <p className="text-dark/45 text-sm mt-1">
          Resumen de {business?.name ?? 'tu programa de fidelización'}.
        </p>
      </div>

      {/* ── Banner de onboarding ──────────────────────────────────────────── */}
      {(() => {
        if (bannerDismissed || !metrics) return null
        const isFree = business?.plan === 'free'
        const step1Done = isFree
          ? !!(business?.name && business?.primary_color)
          : !!(business?.name && business?.primary_color && business?.logo_url)
        const step2Done = (metrics.totalClientes ?? 0) >= 1
        const step3Done = (metrics.earnTxTotal ?? 0) >= 1
        if (step1Done && step2Done && step3Done) return null

        const steps = [
          { label: 'Configura tu negocio',           done: step1Done },
          { label: 'Comparte tu link con tus clientes', done: step2Done },
          { label: 'Registra tu primera compra',     done: step3Done },
        ]

        const handleDismiss = () => {
          localStorage.setItem(`fidelio_onboarding_v1_${business.id}`, '1')
          setBannerDismissed(true)
        }

        return (
          <div className="bg-white rounded-2xl border border-primary/20 shadow-sm p-5 mb-8 relative">
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-dark/20 hover:text-dark/50 transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>

            <p className="text-[13px] font-semibold text-dark/70 mb-4">
              Bienvenido a Fidelio — empieza en 3 pasos
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              {steps.map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 flex-1 px-4 py-3 rounded-xl border transition-colors ${
                    s.done
                      ? 'bg-primary/[0.05] border-primary/20'
                      : 'bg-dark/[0.02] border-black/[0.05]'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${
                      s.done ? 'bg-primary text-[#0f0f0f]' : 'bg-dark/[0.08] text-dark/30'
                    }`}
                  >
                    {s.done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </span>
                  <span
                    className={`text-[13px] font-medium leading-tight ${
                      s.done ? 'text-dark/40 line-through' : 'text-dark/70'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Tarjetas métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {CARDS.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="bg-white rounded-2xl p-6 border border-black/[0.05] shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 mb-5">
              <span className="text-[13px] font-medium text-dark/55 leading-snug">{label}</span>
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/[0.08] shrink-0">
                <Icon className="w-[15px] h-[15px] text-primary" strokeWidth={1.9} />
              </span>
            </div>
            {loadingData || value === undefined ? (
              <div className="h-12 w-24 bg-dark/[0.06] rounded-lg animate-pulse" />
            ) : (
              <p
                className="text-[48px] leading-none text-primary tabular-nums"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
              >
                {value.toLocaleString('es-CL')}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Tarjeta intentos fallidos (solo visible si > 0) */}
      {(business?.failed_registrations ?? 0) > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-orange-200/60 shadow-sm flex items-start gap-4 mb-8">
          <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-50 shrink-0">
            <AlertTriangle className="w-[17px] h-[17px] text-orange-400" strokeWidth={1.9} />
          </span>
          <div>
            <p
              className="text-[32px] leading-none text-orange-500 tabular-nums mb-1"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
            >
              {business.failed_registrations.toLocaleString('es-CL')}
            </p>
            <p className="text-[13px] text-dark/55">
              persona{business.failed_registrations !== 1 ? 's' : ''}{' '}
              no pud{business.failed_registrations !== 1 ? 'ieron' : 'o'} unirse por límite de plan
            </p>
            <a
              href={WA_UPGRADE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] text-primary underline mt-1 inline-block"
            >
              Mejorar plan →
            </a>
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* LineChart — visitas 30 días */}
        <div className="bg-white rounded-2xl border border-black/[0.05] shadow-sm p-6">
          <p className="text-[13px] font-medium text-dark/55 mb-5">Visitas — últimos 30 días</p>
          {loadingData ? (
            <div className="h-48 bg-dark/[0.04] rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={192}>
              <LineChart data={lineData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={TICK}
                  axisLine={false}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  tick={TICK}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE.contentStyle}
                  cursor={TOOLTIP_STYLE.cursor}
                  labelFormatter={v => v}
                  formatter={v => [v, 'Visitas']}
                />
                <Line
                  type="monotone"
                  dataKey="visitas"
                  stroke="#c9a84c"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#c9a84c' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* BarChart — distribución de puntos */}
        <div className="bg-white rounded-2xl border border-black/[0.05] shadow-sm p-6">
          <p className="text-[13px] font-medium text-dark/55 mb-5">Clientes por rango de puntos</p>
          {loadingData ? (
            <div className="h-48 bg-dark/[0.04] rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={192}>
              <BarChart data={barData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis
                  dataKey="rango"
                  tick={TICK}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={TICK}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE.contentStyle}
                  cursor={{ fill: 'rgba(201,168,76,0.06)' }}
                  formatter={v => [v, 'Clientes']}
                />
                <Bar
                  dataKey="clientes"
                  fill="#c9a84c"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  )
}
