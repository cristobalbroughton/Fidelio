import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Loader2, Star, CheckCircle2, Lock, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

// ── Helper ────────────────────────────────────────────────────────────────────

function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('569')) return `+${digits}`
  if (digits.startsWith('9') && digits.length === 9) return `+56${digits}`
  return `+${digits}`
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function MiniWebAppPage() {
  const { slug } = useParams()

  const [view, setView]         = useState('loading_business')
  const [business, setBusiness] = useState(null)
  const [rewards, setRewards]   = useState([])

  const [phone, setPhone]       = useState('')
  const [name, setName]         = useState('')
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading]   = useState(false)

  // ── Carga negocio ───────────────────────────────────────────────────────────

  useEffect(() => {
    supabase
      .from('businesses')
      .select('id, name, slug, program_name, points_per_clp, welcome_points, primary_color, logo_url')
      .eq('slug', slug)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setView('not_found'); return }
        setBusiness(data)
        supabase
          .from('rewards')
          .select('id, name, description, points_required, type')
          .eq('business_id', data.id)
          .eq('is_active', true)
          .order('points_required', { ascending: true })
          .then(({ data: rData }) => setRewards(rData ?? []))
        setView('phone')
      })
  }, [slug])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSearch = async () => {
    if (!phone.trim()) return
    const normalized = normalizePhone(phone)
    setLoading(true)
    try {
      const { data } = await supabase
        .from('loyalty_customers')
        .select('id, name, phone, points_balance, visits_count')
        .eq('phone', normalized)
        .eq('business_id', business.id)
        .maybeSingle()
      if (data) { setCustomer(data); setView('panel') }
      else { setView('registering') }
    } catch { toast.error('Error al buscar cliente') }
    finally { setLoading(false) }
  }

  const handleRegister = async () => {
    const normalized = normalizePhone(phone)
    setLoading(true)
    try {
      const { data: newCustomer, error } = await supabase
        .from('loyalty_customers')
        .insert({
          business_id: business.id,
          phone: normalized,
          name: name.trim() || null,
          points_balance: business.welcome_points,
          visits_count: 1,
          last_visit_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (error) throw error
      await supabase.from('transactions').insert({
        business_id: business.id,
        customer_id: newCustomer.id,
        type: 'welcome',
        points_delta: business.welcome_points,
        amount_clp: 0,
      })
      setCustomer(newCustomer)
      setView('panel')
    } catch (err) {
      toast.error(err.message ?? 'Error al registrar')
    } finally {
      setLoading(false)
    }
  }

  // ── Theming dinámico ────────────────────────────────────────────────────────

  const accent = business?.primary_color || '#c9a84c'

  // ── Derivados (panel) ────────────────────────────────────────────────────────

  const nextReward = rewards.find(r => r.points_required > (customer?.points_balance ?? 0))
  const progress = nextReward
    ? Math.min(100, ((customer?.points_balance ?? 0) / nextReward.points_required) * 100)
    : rewards.length > 0 ? 100 : 0

  // ── Clases reutilizables (dark theme) ───────────────────────────────────────

  const INPUT_DARK =
    'w-full bg-white/[0.06] border border-white/[0.08] text-white placeholder-white/30 ' +
    'rounded-xl px-4 py-3.5 focus:outline-none focus:border-white/30 transition-colors text-[15px]'

  // ── States ──────────────────────────────────────────────────────────────────

  if (view === 'loading_business') {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
      </div>
    )
  }

  if (view === 'not_found') {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-6">
        <div className="text-center">
          <p
            className="text-white/20 text-6xl leading-none mb-4"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            404
          </p>
          <p className="text-white/50 text-sm">Este negocio no existe o el enlace es inválido.</p>
        </div>
      </div>
    )
  }

  // ── Render principal ────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen bg-[#0f0f0f] flex flex-col"
      style={{ '--accent': accent }}
    >
      <div className="max-w-sm mx-auto w-full flex flex-col min-h-screen px-6 pb-10">

        {/* ── Pantalla: phone ── */}
        {view === 'phone' && (
          <>
            {/* Logo / header negocio */}
            <div className="pt-16 pb-10 text-center">
              {business.logo_url && (
                <img
                  src={business.logo_url}
                  alt={business.name}
                  className="w-16 h-16 rounded-full object-cover mx-auto mb-4 border-2"
                  style={{ borderColor: `${accent}40` }}
                />
              )}
              <div
                className="text-3xl font-semibold mb-1"
                style={{ fontFamily: 'var(--font-display)', color: accent, fontWeight: 600 }}
              >
                {business.name}
              </div>
              <p className="text-white/40 text-sm">{business.program_name}</p>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <p className="text-white text-[22px] font-semibold leading-snug mb-1">
                Ingresa tu número
              </p>
              <p className="text-white/45 text-sm mb-8">
                para ver tus puntos o unirte al programa
              </p>

              <div className="space-y-3">
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="+56 9 1234 5678"
                  className={INPUT_DARK}
                  autoFocus
                />
                <button
                  onClick={handleSearch}
                  disabled={loading || !phone.trim()}
                  className="w-full font-semibold py-3.5 rounded-xl transition-opacity disabled:opacity-40 flex items-center justify-center gap-2 text-[15px]"
                  style={{ background: accent, color: '#0f0f0f' }}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Buscando…' : 'Continuar'}
                </button>
              </div>
            </div>

            <p className="text-center text-white/20 text-xs pb-4 pt-8">
              {business.name} · Powered by Fidelio
            </p>
          </>
        )}

        {/* ── Pantalla: registering ── */}
        {view === 'registering' && (
          <>
            <div className="pt-10 pb-6">
              <button
                onClick={() => setView('phone')}
                className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors mb-8"
              >
                <ArrowLeft className="w-4 h-4" />
                Cambiar número
              </button>

              <span
                className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-md mb-6 uppercase tracking-wider"
                style={{ background: `${accent}20`, color: accent }}
              >
                Cliente nuevo
              </span>

              <p className="text-white text-[22px] font-semibold leading-snug mb-1">
                Únete a {business.program_name}
              </p>
              <p className="text-white/45 text-sm mb-6">
                y gana tus primeros puntos de bienvenida
              </p>

              {/* Chip welcome points */}
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl mb-8 border"
                style={{ background: `${accent}12`, borderColor: `${accent}30` }}
              >
                <Star className="w-4 h-4 fill-current" style={{ color: accent }} />
                <span className="text-white/80 text-sm font-medium">
                  {business.welcome_points.toLocaleString('es-CL')} puntos de bienvenida al unirte
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-white/40 text-[12px] font-medium mb-1.5 uppercase tracking-wider">
                    Tu nombre <span className="normal-case">(opcional)</span>
                  </p>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="¿Cómo te llamamos?"
                    className={INPUT_DARK}
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleRegister}
                  disabled={loading}
                  className="w-full font-semibold py-3.5 rounded-xl transition-opacity disabled:opacity-40 flex items-center justify-center gap-2 text-[15px]"
                  style={{ background: accent, color: '#0f0f0f' }}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Registrando…' : 'Unirse al programa'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Pantalla: panel ── */}
        {view === 'panel' && customer && (
          <>
            {/* Header */}
            <div className="pt-10 pb-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {business.logo_url && (
                  <img
                    src={business.logo_url}
                    alt={business.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0 border"
                    style={{ borderColor: `${accent}30` }}
                  />
                )}
                <div className="min-w-0">
                  <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-0.5 truncate">
                    {business.program_name}
                  </p>
                  <p className="text-white text-lg font-semibold">
                    Hola, {customer.name ?? 'cliente'} 👋
                  </p>
                </div>
              </div>
              <div
                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shrink-0"
                style={{ background: `${accent}20`, color: accent }}
              >
                {customer.visits_count} visita{customer.visits_count !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Tarjeta de puntos */}
            <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl p-6 mb-5">

              {/* Balance */}
              <div className="flex items-end gap-2 mb-1">
                <Star
                  className="w-6 h-6 fill-current mb-1"
                  style={{ color: accent }}
                />
                <span
                  className="text-5xl font-semibold leading-none"
                  style={{ fontFamily: 'var(--font-display)', color: accent, fontWeight: 600 }}
                >
                  {customer.points_balance.toLocaleString('es-CL')}
                </span>
              </div>
              <p className="text-white/40 text-sm mb-5">puntos disponibles</p>

              {/* Barra de progreso */}
              {nextReward ? (
                <div>
                  <div className="flex items-center justify-between text-[12px] mb-2">
                    <span className="text-white/40">
                      {customer.points_balance.toLocaleString('es-CL')} pts
                    </span>
                    <span className="text-white/40 text-right">
                      {nextReward.name} · {nextReward.points_required.toLocaleString('es-CL')} pts
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${progress}%`, background: accent }}
                    />
                  </div>
                  <p className="text-white/30 text-[11px] mt-2">
                    Te faltan {(nextReward.points_required - customer.points_balance).toLocaleString('es-CL')} pts para {nextReward.name}
                  </p>
                </div>
              ) : rewards.length > 0 ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" style={{ color: accent }} />
                  <p className="text-[13px]" style={{ color: accent }}>
                    ¡Tienes todos los beneficios disponibles!
                  </p>
                </div>
              ) : null}
            </div>

            {/* Recompensas */}
            {rewards.length > 0 && (
              <div className="mb-5">
                <p className="text-white/40 text-[11px] font-medium uppercase tracking-wider mb-3">
                  Recompensas
                </p>
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-white/[0.05]">
                  {rewards.map(r => {
                    const unlocked = customer.points_balance >= r.points_required
                    const missing = r.points_required - customer.points_balance
                    return (
                      <div key={r.id} className="flex items-center gap-3 px-4 py-3.5">
                        {unlocked ? (
                          <CheckCircle2
                            className="w-5 h-5 flex-shrink-0"
                            style={{ color: accent }}
                          />
                        ) : (
                          <Lock className="w-5 h-5 flex-shrink-0 text-white/20" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-[14px] font-medium truncate ${unlocked ? 'text-white' : 'text-white/50'}`}>
                            {r.name}
                          </p>
                          {r.description && (
                            <p className="text-white/30 text-[12px] truncate">{r.description}</p>
                          )}
                        </div>
                        {unlocked ? (
                          <span
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-md flex-shrink-0"
                            style={{ background: `${accent}20`, color: accent }}
                          >
                            Disponible
                          </span>
                        ) : (
                          <span className="text-[11px] text-white/30 flex-shrink-0 tabular-nums">
                            {missing.toLocaleString('es-CL')} pts
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* QR personal */}
            <div className="mb-5">
              <p className="text-white/40 text-[11px] font-medium uppercase tracking-wider mb-3">
                Tu código QR
              </p>
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-6 flex flex-col items-center">
                <div className="bg-white p-4 rounded-2xl mb-4">
                  <QRCodeSVG
                    value={customer.id}
                    size={168}
                    bgColor="#ffffff"
                    fgColor="#0f0f0f"
                  />
                </div>
                <p className="text-white/40 text-[12px] text-center leading-relaxed">
                  Muestra este código al vendedor para que registre tu compra
                </p>
                <p className="text-white/20 text-[11px] mt-2 font-mono">
                  ···{customer.id.slice(-8)}
                </p>
              </div>
            </div>

            <p className="text-center text-white/15 text-xs pb-4 pt-2">
              {business.name} · Powered by Fidelio
            </p>
          </>
        )}

      </div>
    </div>
  )
}
