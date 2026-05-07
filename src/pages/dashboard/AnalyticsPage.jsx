import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle2 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { getEffectivePlan } from '../../lib/planLimits'
import { useBusinessContext } from '../../contexts/BusinessContext'
import { fmtCLP } from '../../lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const DOW_LABELS   = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const DOW_ORDER    = [1, 2, 3, 4, 5, 6, 0] // Mon → Sun
function fmtPct(n)  { return Math.round(n) + '%' }
function fmtNum(n)  { return Math.round(n).toLocaleString('es-CL') }

const TOOLTIP = {
  contentStyle: { background: '#1a1a1a', color: '#f4f1ea', border: 'none', borderRadius: 8, fontSize: 11 },
  cursor: { fill: 'rgba(201,168,76,0.06)' },
}
const AXIS_STYLE = { fontSize: 11, fill: '#0f0f0f', opacity: 0.35 }

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, action, children }) {
  return (
    <div className="bg-white rounded-2xl border border-black/[0.05] shadow-sm p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-[14px] font-semibold text-dark">{title}</h3>
          {subtitle && <p className="text-[12px] text-dark/40 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function KPICard({ label, curr, prev, fmt, type = 'count' }) {
  const diff = curr - prev
  const improved = diff > 0.005
  const worse = diff < -0.005

  let badge = null
  if (improved || worse) {
    const color = improved ? 'text-emerald-600' : 'text-red-500'
    const arrow = improved ? '↑' : '↓'
    const sign  = improved ? '' : '-'
    const abs   = Math.abs(diff)
    let text = ''

    if (type === 'clp') {
      const pct = prev !== 0 ? ` (${sign}${(abs / prev * 100).toFixed(1)}%)` : ''
      text = `${arrow} ${sign}${fmtCLP(abs)}${pct} vs periodo anterior`
    } else if (type === 'pp') {
      const ppStr = abs % 1 === 0 ? Math.round(abs).toString() : abs.toFixed(1)
      text = `${arrow} ${sign}${ppStr}pp vs periodo anterior`
    } else {
      const pct = prev !== 0 ? ` (${sign}${(abs / prev * 100).toFixed(1)}%)` : ''
      text = `${arrow} ${sign}${Math.round(abs)}${pct} vs periodo anterior`
    }
    badge = <span className={`text-[11px] font-medium ${color}`}>{text}</span>
  } else {
    badge = <span className="text-[11px] text-dark/30">Sin cambios vs periodo anterior</span>
  }

  return (
    <div className="bg-white rounded-2xl border border-black/[0.05] shadow-sm p-5">
      <p className="text-[11px] font-medium text-dark/35 uppercase tracking-[0.08em] mb-3">{label}</p>
      <p className="text-[30px] font-semibold text-dark leading-none tabular-nums mb-2">{fmt(curr)}</p>
      {badge}
    </div>
  )
}

function SkeletonCard({ h = 'h-32' }) {
  return (
    <div className={`bg-white rounded-2xl border border-black/[0.05] shadow-sm p-6 ${h} flex items-center justify-center`}>
      <Loader2 className="w-5 h-5 text-primary animate-spin opacity-40" />
    </div>
  )
}

function PillToggle({ value, options, onChange }) {
  return (
    <div className="flex gap-1 bg-dark/[0.04] rounded-lg p-0.5">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={[
            'px-3 py-1.5 rounded-md text-[12px] font-medium transition-all',
            value === o.value
              ? 'bg-primary text-[#0f0f0f] shadow-sm'
              : 'text-dark/50 hover:text-dark/70',
          ].join(' ')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { business, loadingBusiness } = useBusinessContext()
  const navigate = useNavigate()

  const [staticData, setStaticData]   = useState(null)
  const [loadingStatic, setLS]        = useState(false)

  const [periodData, setPeriodData]   = useState(null)
  const [loadingPeriod, setLP]        = useState(false)

  const [period, setPeriod]           = useState(30)
  const [topTab, setTopTab]           = useState('points')

  // ── 1. Plan check ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!business) return
    const effective = getEffectivePlan(business)
    if (effective.plan !== 'pro') navigate('/dashboard', { replace: true })
  }, [business?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 2. Static queries (period-independent) ────────────────────────────────

  useEffect(() => {
    if (!business?.id) return
    setLS(true)

    const now       = new Date()
    const thirtyAgo = new Date(now - 30 * 86400000)
    const ninetyAgo = new Date(now - 90 * 86400000)

    Promise.all([
      // Q5: all customers for monthly chart (grouped in JS)
      supabase.from('loyalty_customers').select('joined_at')
        .eq('business_id', business.id),

      // Q6: top 10 by points
      supabase.from('loyalty_customers').select('id, name, phone, points_balance')
        .eq('business_id', business.id)
        .order('points_balance', { ascending: false })
        .limit(10),

      // Q7: all-time earn txs for top spend
      supabase.from('transactions').select('customer_id, amount_clp')
        .eq('business_id', business.id).eq('type', 'earn'),

      // Q8: all customers for name lookup
      supabase.from('loyalty_customers').select('id, name, phone')
        .eq('business_id', business.id).limit(1000),

      // Q9: rewards (not soft-deleted)
      supabase.from('rewards').select('id, name, is_active')
        .eq('business_id', business.id).is('deleted_at', null),

      // Q10: all-time redeem txs
      supabase.from('transactions').select('reward_id')
        .eq('business_id', business.id).eq('type', 'redeem')
        .not('reward_id', 'is', null),

      // Q11: at-risk clients
      supabase.from('loyalty_customers')
        .select('id, name, phone, last_visit_at, visits_count')
        .eq('business_id', business.id)
        .gte('visits_count', 5)
        .not('last_visit_at', 'is', null)
        .lt('last_visit_at', thirtyAgo.toISOString())
        .gte('last_visit_at', ninetyAgo.toISOString())
        .order('last_visit_at', { ascending: true }),
    ]).then(([r5, r6, r7, r8, r9, r10, r11]) => {
      const monthlyCustomers = r5.data ?? []
      const topByPointsRaw   = r6.data ?? []
      const allEarnTxs       = r7.data ?? []
      const allCustomers     = r8.data ?? []
      const rewards          = r9.data ?? []
      const redeemTxs        = r10.data ?? []
      const atRiskRaw        = r11.data ?? []

      // Monthly chart: last 12 months, all grouping in JS
      const now2 = new Date()
      const months = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now2.getFullYear(), now2.getMonth() - 11 + i, 1)
        return { month: MONTH_LABELS[d.getMonth()], year: d.getFullYear(), monthIdx: d.getMonth(), value: 0 }
      })
      monthlyCustomers.forEach(c => {
        if (!c.joined_at) return
        const d = new Date(c.joined_at)
        const entry = months.find(m => m.monthIdx === d.getMonth() && m.year === d.getFullYear())
        if (entry) entry.value++
      })
      const monthlyData = months

      // Top by points
      const topByPoints = topByPointsRaw.map(c => ({
        id: c.id, name: c.name, phone: c.phone, value: c.points_balance,
      }))

      // Top by spend
      const spendMap    = {}
      allEarnTxs.forEach(tx => {
        spendMap[tx.customer_id] = (spendMap[tx.customer_id] ?? 0) + (tx.amount_clp ?? 0)
      })
      const custMap  = Object.fromEntries(allCustomers.map(c => [c.id, c]))
      const topBySpend = Object.entries(spendMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([id, total]) => ({
          id,
          name:  custMap[id]?.name  ?? null,
          phone: custMap[id]?.phone ?? id,
          value: total,
        }))

      // Reward performance
      const redeemCount = {}
      redeemTxs.forEach(tx => {
        redeemCount[tx.reward_id] = (redeemCount[tx.reward_id] ?? 0) + 1
      })
      const rewardPerf = rewards
        .map(r => ({ ...r, canjes: redeemCount[r.id] ?? 0 }))
        .sort((a, b) => b.canjes - a.canjes)
        .slice(0, 10)

      // At-risk with daysAgo
      const atRisk = atRiskRaw.map(c => ({
        ...c,
        daysAgo: Math.floor((Date.now() - new Date(c.last_visit_at)) / 86400000),
      }))

      setStaticData({ monthlyData, topByPoints, topBySpend, rewardPerf, atRisk })
      setLS(false)
    }).catch(() => { toast.error('Error cargando datos'); setLS(false) })
  }, [business?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 3. Period queries ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!business?.id) return
    setLP(true)

    const now         = new Date()
    const periodStart = new Date(now - period * 86400000)
    const prevStart   = new Date(now - period * 2 * 86400000)

    Promise.all([
      // Q0: current period earn txs
      supabase.from('transactions').select('amount_clp, customer_id, created_at')
        .eq('business_id', business.id).eq('type', 'earn')
        .gte('created_at', periodStart.toISOString()),

      // Q1: previous period earn txs
      supabase.from('transactions').select('amount_clp, customer_id')
        .eq('business_id', business.id).eq('type', 'earn')
        .gte('created_at', prevStart.toISOString())
        .lt('created_at', periodStart.toISOString()),

      // Q2: new customers current period (count)
      supabase.from('loyalty_customers').select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .gte('joined_at', periodStart.toISOString())
        .lte('joined_at', now.toISOString()),

      // Q3: new customers previous period (count)
      supabase.from('loyalty_customers').select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .gte('joined_at', prevStart.toISOString())
        .lt('joined_at', periodStart.toISOString()),

      // Q4: customers visits_count >= 2 (for retention)
      supabase.from('loyalty_customers').select('id')
        .eq('business_id', business.id)
        .gte('visits_count', 2),
    ]).then(([r0, r1, r2, r3, r4]) => {
      const currTxs  = r0.data ?? []
      const prevTxs  = r1.data ?? []
      const newCurr  = r2.count ?? 0
      const newPrev  = r3.count ?? 0
      const frequent = r4.data ?? []

      // Ticket promedio
      const ticketCurr = currTxs.length > 0
        ? currTxs.reduce((s, t) => s + (t.amount_clp ?? 0), 0) / currTxs.length : 0
      const ticketPrev = prevTxs.length > 0
        ? prevTxs.reduce((s, t) => s + (t.amount_clp ?? 0), 0) / prevTxs.length : 0

      // Retención
      const activeNow  = new Set(currTxs.map(t => t.customer_id))
      const activePrev = new Set(prevTxs.map(t => t.customer_id))
      const retCurr = frequent.length > 0
        ? (frequent.filter(c => activeNow.has(c.id)).length / frequent.length) * 100 : 0
      const retPrev = frequent.length > 0
        ? (frequent.filter(c => activePrev.has(c.id)).length / frequent.length) * 100 : 0

      // Hora pico (promedio por día del período)
      const hourCounts = Array(24).fill(0)
      currTxs.forEach(tx => hourCounts[new Date(tx.created_at).getHours()]++)
      const hourData = hourCounts.map((n, h) => ({
        hour: `${h}h`,
        value: parseFloat((n / Math.max(period, 1)).toFixed(2)),
      }))

      // Día más activo (promedio por semana)
      const dowCounts = Array(7).fill(0)
      currTxs.forEach(tx => dowCounts[new Date(tx.created_at).getDay()]++)
      const weeks = Math.max(period / 7, 1)
      const dowData = DOW_ORDER.map((dow, i) => ({
        day: DOW_LABELS[i],
        value: parseFloat((dowCounts[dow] / weeks).toFixed(2)),
      }))

      setPeriodData({ ticketCurr, ticketPrev, retCurr, retPrev, newCurr, newPrev, hourData, dowData })
      setLP(false)
    }).catch(() => { toast.error('Error cargando métricas'); setLP(false) })
  }, [business?.id, period]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Guards ────────────────────────────────────────────────────────────────

  if (loadingBusiness) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  if (!business) return null

  const loading = loadingStatic || loadingPeriod

  // ── Render ────────────────────────────────────────────────────────────────

  const pd = periodData
  const sd = staticData

  return (
    <div className="p-6 lg:p-10 max-w-6xl pb-24 md:pb-10 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold text-dark tracking-tight leading-snug">
            Analytics
          </h1>
          <p className="text-dark/45 text-sm mt-1">Métricas avanzadas de tu programa de fidelización.</p>
        </div>
        <PillToggle
          value={period}
          onChange={setPeriod}
          options={[
            { value: 30, label: '30 días' },
            { value: 60, label: '60 días' },
            { value: 90, label: '90 días' },
          ]}
        />
      </div>

      {/* ── Bloque 1 — KPIs ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loadingPeriod ? (
          <>
            <SkeletonCard h="h-28" />
            <SkeletonCard h="h-28" />
            <SkeletonCard h="h-28" />
          </>
        ) : pd ? (
          <>
            <KPICard
              label="Ticket promedio"
              curr={pd.ticketCurr}
              prev={pd.ticketPrev}
              fmt={fmtCLP}
              type="clp"
            />
            <KPICard
              label="Tasa de retención"
              curr={pd.retCurr}
              prev={pd.retPrev}
              fmt={fmtPct}
              type="pp"
            />
            <KPICard
              label="Clientes nuevos"
              curr={pd.newCurr}
              prev={pd.newPrev}
              fmt={fmtNum}
              type="count"
            />
          </>
        ) : null}
      </div>

      {/* ── Bloques 2 + 3 — Hora pico + Día activo ─────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loadingPeriod ? (
          <>
            <SkeletonCard h="h-64" />
            <SkeletonCard h="h-64" />
          </>
        ) : pd ? (
          <>
            <SectionCard
              title="Hora pico de ventas"
              subtitle="Promedio de transacciones por hora del día"
            >
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pd.hourData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    tick={AXIS_STYLE}
                    tickLine={false}
                    axisLine={false}
                    interval={2}
                  />
                  <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={32} />
                  <Tooltip {...TOOLTIP} formatter={v => [v, 'promedio']} />
                  <Bar dataKey="value" fill="#c9a84c" radius={[3, 3, 0, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard
              title="Día más activo"
              subtitle="Promedio de transacciones por día de la semana"
            >
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pd.dowData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="day" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                  <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={32} />
                  <Tooltip {...TOOLTIP} formatter={v => [v, 'promedio']} />
                  <Bar dataKey="value" fill="#c9a84c" radius={[3, 3, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </>
        ) : null}
      </div>

      {/* ── Bloque 4 — Nuevos clientes por mes ─────────────────────────── */}
      {loadingStatic ? (
        <SkeletonCard h="h-64" />
      ) : sd ? (
        <SectionCard
          title="Nuevos clientes por mes"
          subtitle="Crecimiento de tu base de clientes (últimos 12 meses)"
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sd.monthlyData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="month" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
              <Tooltip {...TOOLTIP} formatter={v => [v, 'clientes']} />
              <Bar dataKey="value" fill="#c9a84c" radius={[3, 3, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      ) : null}

      {/* ── Bloques 5 + 6 — Top clientes + Reward performance ───────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loadingStatic ? (
          <>
            <SkeletonCard h="h-80" />
            <SkeletonCard h="h-80" />
          </>
        ) : sd ? (
          <>
            {/* Bloque 5 — Top clientes */}
            <SectionCard
              title="Top clientes"
              subtitle={topTab === 'points' ? 'Por puntos acumulados' : 'Por gasto total'}
              action={
                <PillToggle
                  value={topTab}
                  onChange={setTopTab}
                  options={[
                    { value: 'points', label: 'Puntos' },
                    { value: 'spend',  label: 'Gasto'  },
                  ]}
                />
              }
            >
              {(topTab === 'points' ? sd.topByPoints : sd.topBySpend).length === 0 ? (
                <p className="text-[13px] text-dark/35 py-4">Sin datos aún</p>
              ) : (
                <div className="space-y-0">
                  {(topTab === 'points' ? sd.topByPoints : sd.topBySpend).map((c, i) => (
                    <div
                      key={c.id ?? i}
                      className="flex items-center gap-3 py-2.5 border-b border-black/[0.04] last:border-0"
                    >
                      <span className="text-[13px] font-semibold text-primary w-5 shrink-0 tabular-nums">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-dark truncate">
                          {c.name ?? c.phone}
                        </p>
                        {c.name && (
                          <p className="text-[11px] text-dark/35 truncate">{c.phone}</p>
                        )}
                      </div>
                      <span className="text-[13px] font-semibold text-dark tabular-nums shrink-0">
                        {topTab === 'points'
                          ? `${fmtNum(c.value)} pts`
                          : fmtCLP(c.value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Bloque 6 — Reward performance */}
            <SectionCard
              title="Performance de recompensas"
              subtitle="Top 10 recompensas por cantidad de canjes"
            >
              {sd.rewardPerf.length === 0 ? (
                <p className="text-[13px] text-dark/35 py-4">Sin recompensas aún</p>
              ) : (
                <>
                  <div className="space-y-0">
                    {sd.rewardPerf.map((r, i) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 py-2.5 border-b border-black/[0.04] last:border-0"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-medium text-dark truncate">{r.name}</p>
                            {!r.is_active && (
                              <span className="shrink-0 text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-md">
                                Inactiva
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`text-[13px] font-semibold shrink-0 tabular-nums ${r.canjes > 0 ? 'text-primary' : 'text-dark/25'}`}>
                          {r.canjes > 0 ? `${r.canjes} canjes` : 'Sin canjes aún'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-dark/30 mt-3">
                    Mostrando top 10 recompensas
                  </p>
                </>
              )}
            </SectionCard>
          </>
        ) : null}
      </div>

      {/* ── Bloque 7 — Clientes en riesgo ──────────────────────────────── */}
      {loadingStatic ? (
        <SkeletonCard h="h-48" />
      ) : sd ? (
        <SectionCard
          title="Clientes frecuentes en riesgo"
          subtitle="Con 5+ visitas que no regresaron en 30-90 días"
          action={
            sd.atRisk.length > 0 ? (
              <div className="flex items-center gap-2 text-[12px] text-dark/45 shrink-0">
                <span>
                  🟡 {sd.atRisk.filter(c => c.daysAgo <= 60).length}
                </span>
                <span>
                  🔴 {sd.atRisk.filter(c => c.daysAgo > 60).length}
                </span>
              </div>
            ) : null
          }
        >
          {sd.atRisk.length === 0 ? (
            <div className="flex items-center gap-3 py-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" strokeWidth={1.5} />
              <p className="text-[14px] font-medium text-dark/60">
                ¡Todos tus clientes frecuentes siguen activos!
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {sd.atRisk.map(c => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 py-3 border-b border-black/[0.04] last:border-0"
                >
                  <span className="text-[14px] shrink-0" title={c.daysAgo <= 60 ? 'Precaución' : 'En riesgo'}>
                    {c.daysAgo <= 60 ? '🟡' : '🔴'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-dark truncate">
                      {c.name ?? c.phone}
                    </p>
                    {c.name && (
                      <p className="text-[11px] text-dark/35 truncate">{c.phone}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[12px] font-medium text-dark/55">
                      Hace {c.daysAgo} días
                    </p>
                    <p className="text-[11px] text-dark/30">{c.visits_count} visitas</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      ) : null}

    </div>
  )
}
