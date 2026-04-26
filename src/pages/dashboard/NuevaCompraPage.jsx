import { useState, useEffect, useRef } from 'react'
import { Loader2, Search, CheckCircle2, Star, X, QrCode, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  PLAN_LIMITS, WA_UPGRADE_LINK,
  getEffectivePlan, getPlanLimits, getUpgradeMessage,
} from '../../lib/planLimits'
import { normalizePhone, INPUT_CLASS, LABEL_CLASS } from '../../lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCLP(value) {
  const digits = value.replace(/\D/g, '')
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Tokens ────────────────────────────────────────────────────────────────────

const BTN_PRIMARY =
  'w-full bg-primary text-[#0f0f0f] font-semibold py-3 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2'

// ── Component ─────────────────────────────────────────────────────────────────

export default function NuevaCompraPage() {
  const { user } = useAuth()

  // Business (loaded on mount)
  const [business, setBusiness] = useState(null)
  const [loadingBusiness, setLoadingBusiness] = useState(true)

  // UI state machine
  const [view, setView] = useState('search') // 'search' | 'new-customer' | 'purchase' | 'success'

  // Search
  const [phone, setPhone] = useState('')

  // New customer
  const [customerName, setCustomerName] = useState('')

  // Existing customer
  const [customer, setCustomer] = useState(null)
  const [recentVisits, setRecentVisits] = useState([])

  // Purchase
  const [amount, setAmount] = useState('')

  // Operations
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // { pointsEarned, newBalance }

  // Rewards & redeem
  const [rewards, setRewards]           = useState([])
  const [redeemTarget, setRedeemTarget] = useState(null)
  const [redeeming, setRedeeming]       = useState(false)

  // QR scanner
  const [qrOpen, setQrOpen] = useState(false)

  // Plan limit
  const [limitError, setLimitError] = useState(null)

  // Derived
  const amountRaw = Number(amount.replace(/\./g, ''))
  const pointsPreview =
    business && amountRaw > 0 ? Math.floor(amountRaw / business.points_per_clp) : 0

  // ── Load business on mount ─────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('businesses')
      .select('id, name, points_per_clp, welcome_points, plan, pro_expires_at')
      .eq('owner_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) toast.error('Error cargando datos del negocio')
        else setBusiness(data)
        setLoadingBusiness(false)
      })
  }, [user?.id])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSearch = async () => {
    if (!business || !phone.trim()) return
    setLoading(true)
    try {
      const normalizedPhone = normalizePhone(phone)

      const { data, error } = await supabase
        .from('loyalty_customers')
        .select('*')
        .eq('phone', normalizedPhone)
        .eq('business_id', business.id)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setCustomer(data)

        const [{ data: visits }, { data: rewardsData }] = await Promise.all([
          supabase.from('transactions')
            .select('created_at, points_delta, type, rewards(name)')
            .eq('customer_id', data.id)
            .eq('business_id', business.id)
            .order('created_at', { ascending: false })
            .limit(3),
          supabase.from('rewards')
            .select('id, name, points_required')
            .eq('business_id', business.id)
            .eq('is_active', true)
            .is('deleted_at', null)
            .order('points_required', { ascending: true }),
        ])

        setRecentVisits(visits ?? [])
        setRewards(rewardsData ?? [])
        setView('purchase')
      } else {
        setView('new-customer')
      }
    } catch (err) {
      toast.error(err.message ?? 'Error al buscar cliente')
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterNew = async () => {
    if (!business) return
    setLoading(true)
    try {
      // Check plan limits
      const effective = getEffectivePlan(business)
      if (!effective.isGrace) {
        const limits = getPlanLimits(effective.plan)
        if (limits.maxCustomers !== Infinity) {
          const { count } = await supabase
            .from('loyalty_customers')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', business.id)
          if (count >= limits.maxCustomers) {
            const upgradeMsg = getUpgradeMessage(effective.plan)
            setLimitError(
              `Has alcanzado el límite de ${limits.maxCustomers} clientes en tu plan ` +
              `${PLAN_LIMITS[effective.plan].label}. ${upgradeMsg} para continuar.`
            )
            setLoading(false)
            return
          }
        }
      }
      setLimitError(null)

      const normalizedPhone = normalizePhone(phone)

      const { data: newCustomer, error: custError } = await supabase
        .from('loyalty_customers')
        .insert({
          business_id: business.id,
          phone: normalizedPhone,
          name: customerName.trim() || null,
          points_balance: business.welcome_points,
          visits_count: 1,
          last_visit_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (custError) throw custError

      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          business_id: business.id,
          customer_id: newCustomer.id,
          type: 'welcome',
          points_delta: business.welcome_points,
          amount_clp: 0,
        })

      if (txError) throw txError

      setResult({ type: 'earn', pointsEarned: business.welcome_points, newBalance: business.welcome_points })
      setView('success')
    } catch (err) {
      toast.error(err.message ?? 'Error al registrar cliente')
    } finally {
      setLoading(false)
    }
  }

  const handleCredit = async () => {
    if (!business || !customer) return
    const points = Math.floor(amountRaw / business.points_per_clp)
    if (points < 1) {
      toast.error(
        `El monto no alcanza para generar puntos. Mínimo: $${business.points_per_clp.toLocaleString('es-CL')} CLP`
      )
      return
    }

    setLoading(true)
    try {
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          business_id: business.id,
          customer_id: customer.id,
          type: 'earn',
          points_delta: points,
          amount_clp: amountRaw,
        })

      if (txError) throw txError

      const { error: updError } = await supabase
        .from('loyalty_customers')
        .update({
          points_balance: customer.points_balance + points,
          visits_count: customer.visits_count + 1,
          last_visit_at: new Date().toISOString(),
        })
        .eq('id', customer.id)

      if (updError) throw updError

      await supabase
        .from('businesses')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', business.id)

      setResult({ type: 'earn', pointsEarned: points, newBalance: customer.points_balance + points })
      setView('success')
    } catch (err) {
      toast.error(err.message ?? 'Error al acreditar puntos')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setView('search')
    setPhone('')
    setCustomerName('')
    setCustomer(null)
    setRecentVisits([])
    setRewards([])
    setAmount('')
    setResult(null)
    setRedeemTarget(null)
  }

  const handleQrFound = async (foundCustomer) => {
    setQrOpen(false)
    setCustomer(foundCustomer)
    try {
      const [{ data: visits }, { data: rewardsData }] = await Promise.all([
        supabase.from('transactions')
          .select('created_at, points_delta, type, rewards(name)')
          .eq('customer_id', foundCustomer.id)
          .eq('business_id', business.id)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase.from('rewards')
          .select('id, name, points_required')
          .eq('business_id', business.id)
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('points_required', { ascending: true }),
      ])
      setRecentVisits(visits ?? [])
      setRewards(rewardsData ?? [])
      setView('purchase')
    } catch {
      toast.error('Error cargando datos del cliente')
    }
  }

  const handleRedeem = async () => {
    if (!customer || !redeemTarget) return
    setRedeeming(true)
    try {
      const { data: fresh, error: fetchErr } = await supabase
        .from('loyalty_customers')
        .select('points_balance')
        .eq('id', customer.id)
        .single()
      if (fetchErr) throw fetchErr

      if (fresh.points_balance < redeemTarget.points_required) {
        toast.error('El cliente no tiene suficientes puntos')
        setRedeemTarget(null)
        return
      }

      const newBalance = fresh.points_balance - redeemTarget.points_required

      const { error: txErr } = await supabase.from('transactions').insert({
        business_id:  business.id,
        customer_id:  customer.id,
        type:         'redeem',
        points_delta: -redeemTarget.points_required,
        amount_clp:   0,
        reward_id:    redeemTarget.id,
      })
      if (txErr) throw txErr

      const { error: updErr } = await supabase.from('loyalty_customers')
        .update({ points_balance: newBalance })
        .eq('id', customer.id)
      if (updErr) throw updErr

      await supabase.from('businesses')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', business.id)

      setResult({ type: 'redeem', rewardName: redeemTarget.name, pointsSpent: redeemTarget.points_required, newBalance })
      setRedeemTarget(null)
      setView('success')
    } catch (err) {
      toast.error(err.message ?? 'Error al procesar canje')
    } finally {
      setRedeeming(false)
    }
  }

  // ── Loading business ───────────────────────────────────────────────────────

  if (loadingBusiness) {
    return (
      <div className="p-8 lg:p-10 flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  if (!business) {
    return (
      <div className="p-8 lg:p-10">
        <p className="text-dark/40 text-sm">No se encontró un negocio asociado a tu cuenta.</p>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 lg:p-10 max-w-2xl pb-24 md:pb-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[26px] font-semibold text-dark tracking-tight leading-snug">
          Nueva Compra
        </h1>
        <p className="text-dark/45 text-sm mt-1.5">
          Registra una compra y acredita puntos al cliente.
        </p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-black/[0.05] shadow-sm p-6">

        {/* ── VIEW: search ─────────────────────────────────────────────────── */}
        {view === 'search' && (
          <div className="space-y-4">
            <div>
              <label className={LABEL_CLASS}>Teléfono del cliente</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && phone.trim() && handleSearch()}
                placeholder="+56 9 1234 5678"
                className={INPUT_CLASS}
                autoFocus
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={!phone.trim() || loading}
              className={BTN_PRIMARY}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Buscar cliente
            </button>
            <button
              onClick={() => setQrOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dark/[0.12] text-dark/55 hover:text-dark hover:border-dark/25 text-sm font-medium transition-all"
            >
              <QrCode className="w-4 h-4" />
              Escanear QR del cliente
            </button>

            {!phone.trim() && (
              <div className="mt-4 bg-dark/[0.02] border border-black/[0.05] rounded-2xl p-5 text-center">
                <div className="w-10 h-10 rounded-xl bg-primary/[0.08] flex items-center justify-center mx-auto mb-3">
                  <ShoppingBag className="w-4.5 h-4.5 text-primary" />
                </div>
                <p className="text-dark font-semibold text-[14px] mb-1">Registra la primera compra</p>
                <p className="text-dark/45 text-[13px] leading-relaxed mb-3">
                  Busca al cliente por teléfono o escanea su QR, ingresa el monto y los puntos se acumulan automáticamente.
                </p>
                <p className="text-[11px] text-dark/30 flex items-center justify-center gap-1.5">
                  <QrCode className="w-3 h-3" />
                  También puedes escanear el QR del cliente con la cámara
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── VIEW: new-customer ────────────────────────────────────────────── */}
        {view === 'new-customer' && (
          <div className="space-y-5">
            {/* Phone chip + change */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-dark/50">Teléfono</span>
                <span className="bg-dark/[0.06] text-dark text-[13px] font-semibold px-3 py-1 rounded-full">
                  {normalizePhone(phone)}
                </span>
              </div>
              <button
                onClick={handleReset}
                className="text-[13px] text-dark/40 hover:text-dark/70 transition-colors flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Cambiar
              </button>
            </div>

            {/* Badge */}
            <div className="flex items-center gap-2">
              <span className="bg-primary/[0.08] text-primary text-[12px] font-semibold px-2.5 py-1 rounded-full">
                Cliente nuevo
              </span>
            </div>

            <div>
              <label className={LABEL_CLASS}>
                Nombre del cliente{' '}
                <span className="text-dark/25 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ej: María González"
                className={INPUT_CLASS}
                autoFocus
              />
            </div>

            <p className="text-[13px] text-dark/40">
              Se acreditarán{' '}
              <span className="text-primary font-semibold">
                {business.welcome_points} puntos
              </span>{' '}
              de bienvenida.
            </p>

            {limitError && (
              <div className="rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 text-sm text-orange-800">
                <p>{limitError}</p>
                <a
                  href={WA_UPGRADE_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline mt-1 inline-block"
                >
                  Contactar para mejorar →
                </a>
              </div>
            )}

            <button
              onClick={handleRegisterNew}
              disabled={loading}
              className={BTN_PRIMARY}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Registrar y acreditar {business.welcome_points} puntos
            </button>
          </div>
        )}

        {/* ── VIEW: purchase ────────────────────────────────────────────────── */}
        {view === 'purchase' && customer && (
          <div className="space-y-5">
            {/* Customer info */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px] font-semibold text-dark">
                  {customer.name ?? customer.phone}
                </p>
                <p className="text-[13px] text-dark/45 mt-0.5">{customer.phone}</p>
              </div>
              <div className="flex items-center gap-1.5 bg-primary/[0.08] text-primary text-[13px] font-semibold px-3 py-1.5 rounded-lg">
                <Star className="w-3.5 h-3.5 fill-primary" />
                {customer.points_balance.toLocaleString('es-CL')} pts
              </div>
            </div>

            {/* Recent transactions */}
            <div>
              <p className="text-[12px] font-medium text-dark/35 uppercase tracking-[0.08em] mb-2">
                Últimas transacciones
              </p>
              {recentVisits.length === 0 ? (
                <p className="text-[13px] text-dark/35 italic">Sin transacciones previas</p>
              ) : (
                <div className="space-y-1.5">
                  {recentVisits.map((v, i) => {
                    const isRedeem = v.type === 'redeem'
                    return (
                      <div key={i} className="flex items-start justify-between gap-2 text-[13px]">
                        <div className="min-w-0">
                          <span className="text-dark/55">{formatDate(v.created_at)}</span>
                          {isRedeem && v.rewards?.name && (
                            <p className="text-[11px] text-dark/35 mt-0.5 truncate">{v.rewards.name}</p>
                          )}
                        </div>
                        <span className={`font-medium shrink-0 tabular-nums ${isRedeem ? 'text-red-500' : 'text-primary'}`}>
                          {isRedeem
                            ? `−${Math.abs(v.points_delta).toLocaleString('es-CL')} pts`
                            : `+${v.points_delta.toLocaleString('es-CL')} pts`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="h-px bg-black/[0.06]" />

            {/* Amount input */}
            <div>
              <label className={LABEL_CLASS}>Monto de la compra</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/40 font-medium text-[15px]">
                  $
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(formatCLP(e.target.value))}
                  placeholder="0"
                  className={INPUT_CLASS + ' pl-8'}
                  autoFocus
                />
              </div>
              {pointsPreview > 0 && (
                <p className="text-[13px] text-primary font-medium mt-2">
                  = {pointsPreview.toLocaleString('es-CL')} {pointsPreview === 1 ? 'punto' : 'puntos'}
                </p>
              )}
            </div>

            <button
              onClick={handleCredit}
              disabled={pointsPreview < 1 || loading}
              className={BTN_PRIMARY}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Acreditar puntos
            </button>

            <button
              onClick={handleReset}
              className="w-full text-center text-[13px] text-dark/35 hover:text-dark/60 transition-colors py-1"
            >
              Cancelar
            </button>

            {/* Rewards */}
            {rewards.length > 0 && (
              <>
                <div className="h-px bg-black/[0.06]" />
                <div>
                  <p className="text-[12px] font-medium text-dark/35 uppercase tracking-[0.08em] mb-3">
                    Canjear recompensa
                  </p>
                  <div className="space-y-2">
                    {rewards.map(r => {
                      const canRedeem = customer.points_balance >= r.points_required
                      const missing = r.points_required - customer.points_balance
                      return (
                        <div
                          key={r.id}
                          className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl bg-dark/[0.02] border border-black/[0.05]"
                        >
                          <div className="min-w-0">
                            <p className={`text-[13px] font-medium truncate ${canRedeem ? 'text-dark' : 'text-dark/35'}`}>
                              {r.name}
                            </p>
                            <p className="text-[11px] text-dark/35 mt-0.5 tabular-nums">
                              {r.points_required.toLocaleString('es-CL')} pts
                            </p>
                          </div>
                          {canRedeem ? (
                            <button
                              onClick={() => setRedeemTarget(r)}
                              className="shrink-0 flex items-center gap-1.5 bg-primary/[0.08] text-primary text-[12px] font-semibold px-3 py-1.5 rounded-lg hover:bg-primary/[0.14] transition-colors"
                            >
                              <Star className="w-3 h-3 fill-primary" />
                              Canjear
                            </button>
                          ) : (
                            <span className="shrink-0 text-[11px] text-dark/30 tabular-nums whitespace-nowrap">
                              Faltan {missing.toLocaleString('es-CL')} pts
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── VIEW: success ─────────────────────────────────────────────────── */}
        {view === 'success' && result && result.type === 'earn' && (
          <div className="text-center py-4 space-y-5">
            <div className="flex items-center justify-center">
              <CheckCircle2 className="w-14 h-14 text-primary" strokeWidth={1.5} />
            </div>
            <p className="text-[22px] font-semibold text-dark" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              ¡Puntos acreditados!
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-cream rounded-xl p-4">
                <p className="text-[12px] text-dark/40 font-medium mb-1">Puntos ganados</p>
                <p className="text-[32px] leading-none text-primary tabular-nums" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  +{result.pointsEarned.toLocaleString('es-CL')}
                </p>
              </div>
              <div className="bg-cream rounded-xl p-4">
                <p className="text-[12px] text-dark/40 font-medium mb-1">Nuevo balance</p>
                <p className="text-[32px] leading-none text-dark tabular-nums" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  {result.newBalance.toLocaleString('es-CL')}
                </p>
              </div>
            </div>
            <button onClick={handleReset} className={BTN_PRIMARY}>Nueva compra</button>
          </div>
        )}

        {view === 'success' && result && result.type === 'redeem' && (
          <div className="text-center py-4 space-y-5">
            <div className="flex items-center justify-center">
              <CheckCircle2 className="w-14 h-14 text-primary" strokeWidth={1.5} />
            </div>
            <p className="text-[22px] font-semibold text-dark" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              ¡Canje exitoso!
            </p>
            <div className="bg-primary/[0.06] border border-primary/[0.12] rounded-xl p-4 text-left">
              <p className="text-[11px] text-dark/40 font-medium uppercase tracking-wider mb-1">Recompensa canjeada</p>
              <p className="text-[15px] font-semibold text-dark">{result.rewardName}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-cream rounded-xl p-4">
                <p className="text-[12px] text-dark/40 font-medium mb-1">Puntos descontados</p>
                <p className="text-[32px] leading-none text-red-500 tabular-nums" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  −{result.pointsSpent.toLocaleString('es-CL')}
                </p>
              </div>
              <div className="bg-cream rounded-xl p-4">
                <p className="text-[12px] text-dark/40 font-medium mb-1">Nuevo balance</p>
                <p className="text-[32px] leading-none text-dark tabular-nums" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  {result.newBalance.toLocaleString('es-CL')}
                </p>
              </div>
            </div>
            <button onClick={handleReset} className={BTN_PRIMARY}>Nueva operación</button>
          </div>
        )}

      </div>

      {redeemTarget && customer && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => !redeeming && setRedeemTarget(null)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">

              <div>
                <p className="text-[11px] font-medium text-dark/35 uppercase tracking-wider mb-1">
                  Confirmar canje
                </p>
                <p className="text-[18px] font-semibold text-dark leading-snug">
                  {redeemTarget.name}
                </p>
              </div>

              <div className="bg-cream rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between text-[13px]">
                  <span className="text-dark/55">Cliente</span>
                  <span className="font-medium text-dark">{customer.name ?? customer.phone}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-dark/55">Puntos actuales</span>
                  <span className="font-medium text-dark tabular-nums">
                    {customer.points_balance.toLocaleString('es-CL')}
                  </span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-dark/55">Se descontarán</span>
                  <span className="font-semibold text-red-500 tabular-nums">
                    −{redeemTarget.points_required.toLocaleString('es-CL')} pts
                  </span>
                </div>
                <div className="h-px bg-black/[0.06]" />
                <div className="flex justify-between text-[13px]">
                  <span className="text-dark/55">Nuevo balance</span>
                  <span className="font-semibold text-primary tabular-nums">
                    {(customer.points_balance - redeemTarget.points_required).toLocaleString('es-CL')} pts
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <button onClick={handleRedeem} disabled={redeeming} className={BTN_PRIMARY}>
                  {redeeming && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirmar canje
                </button>
                <button
                  onClick={() => setRedeemTarget(null)}
                  disabled={redeeming}
                  className="w-full text-center text-[13px] text-dark/35 hover:text-dark/60 transition-colors py-1"
                >
                  Cancelar
                </button>
              </div>

            </div>
          </div>
        </>
      )}

      {qrOpen && business && (
        <QrScannerModal
          business={business}
          onClose={() => setQrOpen(false)}
          onFound={handleQrFound}
        />
      )}
    </div>
  )
}

// ── QrScannerModal ─────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function QrScannerModal({ business, onClose, onFound }) {
  const [fallback, setFallback] = useState(false)
  const [manualId, setManualId] = useState('')
  const [querying, setQuerying] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const detectedRef = useRef(false)

  const queryCustomer = async (uuid) => {
    const { data, error } = await supabase
      .from('loyalty_customers')
      .select('id, phone, name, points_balance, visits_count, last_visit_at')
      .eq('id', uuid)
      .eq('business_id', business.id)
      .maybeSingle()

    if (error || !data) {
      toast.error('Cliente no encontrado en este negocio')
      onClose()
      return
    }
    onFound(data)
  }

  useEffect(() => {
    if (!('BarcodeDetector' in window)) {
      setFallback(true)
      return
    }

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        streamRef.current = stream
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        video.play()

        const detector = new window.BarcodeDetector({ formats: ['qr_code'] })

        const scan = async () => {
          if (detectedRef.current) return
          try {
            if (video.readyState >= 2) {
              const barcodes = await detector.detect(video)
              if (barcodes.length > 0) {
                const raw = barcodes[0].rawValue
                if (UUID_RE.test(raw)) {
                  detectedRef.current = true
                  await queryCustomer(raw)
                  return
                }
              }
            }
          } catch { /* ignorar errores por frame */ }
          rafRef.current = requestAnimationFrame(scan)
        }
        rafRef.current = requestAnimationFrame(scan)
      })
      .catch(() => {
        setFallback(true)
      })

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleManualSubmit = async () => {
    const trimmed = manualId.trim()
    if (!UUID_RE.test(trimmed)) {
      toast.error('El ID ingresado no es un UUID válido')
      return
    }
    setQuerying(true)
    await queryCustomer(trimmed)
    setQuerying(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06]">
          <p className="text-[14px] font-semibold text-dark">Escanear QR del cliente</p>
          <button onClick={onClose} className="text-dark/35 hover:text-dark transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cámara o fallback manual */}
        {!fallback ? (
          <>
            <video
              ref={videoRef}
              className="w-full aspect-square object-cover bg-black"
              muted
              playsInline
            />
            <p className="text-center text-dark/35 text-[12px] px-5 pt-3">
              Apunta la cámara al código QR del cliente
            </p>
          </>
        ) : (
          <div className="px-5 py-4 space-y-3">
            <p className="text-[13px] text-dark/55">
              Ingresa o pega el ID del cliente:
            </p>
            <input
              type="text"
              value={manualId}
              onChange={e => setManualId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !querying && handleManualSubmit()}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className={INPUT_CLASS + ' font-mono text-[12px]'}
              autoFocus
            />
            <button
              onClick={handleManualSubmit}
              disabled={querying || !manualId.trim()}
              className={BTN_PRIMARY}
            >
              {querying && <Loader2 className="w-4 h-4 animate-spin" />}
              Buscar cliente
            </button>
          </div>
        )}


      </div>
    </div>
  )
}
