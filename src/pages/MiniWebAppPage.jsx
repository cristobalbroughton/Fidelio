import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Loader2, Star, CheckCircle2, Lock, ArrowLeft, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { normalizePhone, isValidChileanMobile, accentTextColor, readableOnDark } from '../lib/utils'

// ── Helper ────────────────────────────────────────────────────────────────────

function formatDateLong(iso) {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function MiniWebAppPage() {
  const { slug } = useParams()

  const [view, setView]         = useState('loading_business')
  const [business, setBusiness] = useState(null)
  const [rewards, setRewards]   = useState([])

  const [phone, setPhone]       = useState('')
  const [name, setName]         = useState('')
  const [customer, setCustomer]         = useState(null)
  const [loading, setLoading]           = useState(false)
  const [limitReached, setLimitReached] = useState(false)
  const [nameError, setNameError]       = useState('')
  const [phoneError, setPhoneError]     = useState('')
  const [justRegistered, setJustRegistered] = useState(false)
  const [showAllRewards, setShowAllRewards] = useState(false)
  const [showHistory, setShowHistory]   = useState(false)
  const [history, setHistory]           = useState([])
  const [historyLoaded, setHistoryLoaded] = useState(false)

  // ── Carga negocio ───────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const { data: bizData, error } = await supabase
        .rpc('get_business_public', { p_slug: slug })
      if (error || !bizData) { setView('not_found'); return }
      setBusiness(bizData)
      document.title = `${bizData.name} — ${bizData.program_name}`
      setView('phone')

      const { data: rData } = await supabase
        .from('rewards')
        .select('id, name, description, points_required, type')
        .eq('business_id', bizData.id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('points_required', { ascending: true })
      setRewards(rData ?? [])
    }
    init()
  }, [slug])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSearch = async () => {
    if (!phone.trim() || loading) return
    if (!isValidChileanMobile(phone)) {
      setPhoneError('Ingresa un celular chileno válido (9 dígitos, ej: 9 1234 5678)')
      return
    }
    setPhoneError('')
    const normalized = normalizePhone(phone)
    setLoading(true)
    try {
      const { data, error } = await supabase
        .rpc('get_customer_by_phone', { p_business_id: business.id, p_phone: normalized })
      if (error) throw error
      if (data) { setCustomer(data); setView('panel') }
      else { setView('registering') }
    } catch { toast.error('Error al buscar cliente') }
    finally { setLoading(false) }
  }

  const handleRegister = async () => {
    if (!name.trim()) {
      setNameError('El nombre es requerido')
      return
    }
    setNameError('')
    const normalized = normalizePhone(phone)
    setLoading(true)
    try {
      const { data, error } = await supabase
        .rpc('register_customer', {
          p_business_id: business.id,
          p_phone: normalized,
          p_name: name.trim(),
        })
      if (error) throw error

      if (data?.status === 'ok') {
        setCustomer(data.customer)
        setJustRegistered(true)
        setTimeout(() => setJustRegistered(false), 6000)
        setView('panel')
      } else if (data?.status === 'limit_reached') {
        setLimitReached(true)
      } else if (data?.status === 'duplicate_phone') {
        // Ya registrado (race con handleSearch): recuperar al cliente existente
        const { data: existing } = await supabase
          .rpc('get_customer_by_phone', { p_business_id: business.id, p_phone: normalized })
        if (existing) { setCustomer(existing); setView('panel') }
        else toast.error('Este teléfono ya está registrado.')
      } else {
        toast.error('No pudimos completar tu registro. Intenta de nuevo.')
      }
    } catch (err) {
      console.error('[register] error:', err)
      toast.error('No pudimos completar tu registro. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleShare = () => {
    const url = window.location.href
    const text = `Estoy acumulando puntos en ${business.name}. Únete al club y empieza a ganar recompensas: ${url}`
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    }
  }

  const handleToggleHistory = async () => {
    if (!customer?.id || !business?.id) return
    if (!showHistory && !historyLoaded) {
      const { data, error } = await supabase
        .rpc('get_customer_history', { p_customer_id: customer.id, p_limit: 5 })
      if (error) {
        console.error('[history] query error:', error)
        toast.error('Error cargando historial')
        return
      }
      setHistory(data ?? [])
      setHistoryLoaded(true)
    }
    setShowHistory(h => !h)
  }

  // ── Theming dinámico ────────────────────────────────────────────────────────
  // accent: aclarado si es muy oscuro para que sea legible sobre #0f0f0f
  // accentText: color de texto legible sobre botones con fondo accent

  const accent = readableOnDark(business?.primary_color || '#c9a84c')
  const accentText = accentTextColor(accent)

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
      <div
        className="max-w-sm mx-auto w-full flex flex-col min-h-screen px-6"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >

        {/* ── Pantalla: phone ── */}
        {view === 'phone' && (
          <>
            {/* Logo / header negocio */}
            <div className="pt-16 pb-10 text-center">
              {business.logo_url && business.plan !== 'free' && (
                <img
                  src={business.logo_url}
                  alt={`Logo de ${business.name}`}
                  width={64}
                  height={64}
                  loading="lazy"
                  className="w-16 h-16 rounded-full object-cover mx-auto mb-4 border-2"
                  style={{ borderColor: `${accent}40` }}
                />
              )}
              <div
                className="text-3xl font-semibold mb-1"
                style={{ fontFamily: 'var(--font-display)', color: accent, fontWeight: 600 }}
              >
                {business.program_name}
              </div>
              <p className="text-white/40 text-sm">{business.name}</p>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <p className="text-white text-[22px] font-semibold leading-snug mb-1">
                Ingresa tu número
              </p>
              <p className="text-white/45 text-sm mb-8">
                para ver tus puntos o unirte al programa
              </p>

              <div className="space-y-3">
                <div>
                  <label htmlFor="mw-phone" className="sr-only">Número de celular</label>
                  <input
                    id="mw-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={16}
                    value={phone}
                    onChange={e => { setPhone(e.target.value); if (phoneError) setPhoneError('') }}
                    onKeyDown={e => e.key === 'Enter' && !loading && handleSearch()}
                    placeholder="+56 9 1234 5678"
                    className={INPUT_DARK}
                    aria-invalid={!!phoneError}
                    aria-describedby={phoneError ? 'mw-phone-error' : undefined}
                    autoFocus
                  />
                  {phoneError && (
                    <p id="mw-phone-error" role="alert" className="text-red-400 text-[12px] mt-1.5">
                      {phoneError}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleSearch}
                  disabled={loading || !phone.trim()}
                  className="w-full font-semibold py-3.5 rounded-xl transition-opacity disabled:opacity-40 flex items-center justify-center gap-2 text-[15px]"
                  style={{ background: accent, color: accentText }}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
                  {loading ? 'Buscando…' : 'Continuar'}
                </button>
              </div>
            </div>

            <p className="text-center text-white/45 text-xs pb-4 pt-8 flex items-center justify-center gap-4 flex-wrap">
              {business.plan === 'free' && (
                <a href="/" className="hover:text-white/70 transition-colors inline-flex items-center min-h-[44px]">
                  Powered by Loyia
                </a>
              )}
              <a href="/privacidad" className="hover:text-white/70 transition-colors inline-flex items-center min-h-[44px]">
                Privacidad
              </a>
            </p>
          </>
        )}

        {/* ── Pantalla: registering ── */}
        {view === 'registering' && (
          <>
            <div className="pt-10 pb-6">
              <button
                onClick={() => setView('phone')}
                className="flex items-center gap-1.5 text-white/55 hover:text-white/80 text-sm transition-colors mb-6 py-2.5 min-h-[44px]"
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

              {limitReached ? (
                <div className="text-center text-white/55 text-sm px-2 py-6 leading-relaxed">
                  En este momento el programa no está aceptando nuevos miembros.
                  Consulta directamente con el negocio.
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="mw-name" className="block text-white/50 text-[12px] font-medium mb-1.5 uppercase tracking-wider">
                      Tu nombre
                    </label>
                    <input
                      id="mw-name"
                      type="text"
                      autoComplete="name"
                      autoCapitalize="words"
                      value={name}
                      onChange={e => { setName(e.target.value); if (nameError) setNameError('') }}
                      placeholder="Tu nombre"
                      className={INPUT_DARK}
                      aria-invalid={!!nameError}
                      aria-describedby={nameError ? 'mw-name-error' : undefined}
                      autoFocus
                    />
                    {nameError && (
                      <p id="mw-name-error" role="alert" className="text-red-400 text-[12px] mt-1.5">{nameError}</p>
                    )}
                  </div>
                  <button
                    onClick={handleRegister}
                    disabled={loading}
                    className="w-full font-semibold py-3.5 rounded-xl transition-opacity disabled:opacity-40 flex items-center justify-center gap-2 text-[15px]"
                    style={{ background: accent, color: accentText }}
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
                    {loading ? 'Registrando…' : 'Unirse al programa'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Pantalla: panel ── */}
        {view === 'panel' && customer && (
          <>
            {/* Header */}
            <div className="pt-10 pb-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {business.logo_url && business.plan !== 'free' && (
                  <img
                    src={business.logo_url}
                    alt={`Logo de ${business.name}`}
                    width={40}
                    height={40}
                    loading="lazy"
                    className="w-10 h-10 rounded-full object-cover shrink-0 border"
                    style={{ borderColor: `${accent}30` }}
                  />
                )}
                <div className="min-w-0">
                  <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-0.5 truncate">
                    {business.program_name}
                  </p>
                  <p className="text-white/30 text-[11px] mb-0.5 truncate">{business.name}</p>
                  <p className="text-white text-lg font-semibold">
                    {customer.name ? `Hola, ${customer.name}` : 'Hola!'} <span aria-hidden>👋</span>
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

            {/* Banner de bienvenida tras registro */}
            {justRegistered && (
              <div
                role="status"
                className="mb-4 rounded-xl px-4 py-3 border flex items-center gap-2.5"
                style={{ background: `${accent}15`, borderColor: `${accent}35` }}
              >
                <Star className="w-4 h-4 fill-current shrink-0" style={{ color: accent }} aria-hidden />
                <p className="text-white/85 text-[13px] font-medium">
                  ¡Bienvenido! Ganaste {business.welcome_points.toLocaleString('es-CL')} puntos por unirte
                </p>
              </div>
            )}

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
                  <div
                    className="h-1.5 bg-white/10 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={Math.round(progress)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Progreso hacia ${nextReward.name}`}
                  >
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
            {rewards.length === 0 && (
              <div className="mb-5 bg-white/[0.04] border border-white/[0.06] rounded-2xl px-5 py-6 text-center">
                <Star className="w-5 h-5 mx-auto mb-2" style={{ color: accent }} aria-hidden />
                <p className="text-white/60 text-[13px] leading-relaxed">
                  {business.name} está preparando sus premios.
                  <br />
                  Sigue acumulando puntos: pronto podrás canjearlos.
                </p>
              </div>
            )}
            {rewards.length > 0 && (
              <div className="mb-5">
                <p className="text-white/50 text-[11px] font-medium uppercase tracking-wider mb-3">
                  Recompensas
                </p>
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-white/[0.05]">
                  {(showAllRewards ? rewards : rewards.slice(0, 3)).map(r => {
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
                {rewards.length > 3 && (
                  <button
                    onClick={() => setShowAllRewards(v => !v)}
                    className="mt-1 w-full text-center text-[13px] text-white/55 hover:text-white/80 transition-colors py-2.5 min-h-[44px]"
                  >
                    {showAllRewards
                      ? 'Ver menos'
                      : `Ver todas las recompensas (${rewards.length})`}
                  </button>
                )}
              </div>
            )}

            {/* Historial */}
            <div className="mb-5">
              <button
                onClick={handleToggleHistory}
                className="flex items-center gap-1 text-white/55 hover:text-white/80 text-[13px] font-medium transition-colors mb-2 py-2.5 min-h-[44px]"
              >
                {showHistory ? 'Ver menos' : 'Ver actividad reciente →'}
              </button>
              {showHistory && (
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-white/[0.05]">
                  {history.length === 0 ? (
                    <p className="text-white/30 text-[13px] text-center py-5">Sin actividad</p>
                  ) : (
                    history.map((tx, i) => {
                      const isRedeem = tx.type === 'redeem'
                      return (
                        <div key={i} className="flex items-start justify-between gap-3 px-4 py-3.5">
                          <div className="min-w-0">
                            <p className="text-white/50 text-[12px]">{formatDateLong(tx.created_at)}</p>
                            {isRedeem && tx.reward_name && (
                              <p className="text-white/30 text-[11px] mt-0.5 truncate">{tx.reward_name}</p>
                            )}
                          </div>
                          <span
                            className={`text-[13px] font-semibold shrink-0 tabular-nums ${isRedeem ? 'text-red-400' : ''}`}
                            style={!isRedeem ? { color: accent } : {}}
                          >
                            {isRedeem
                              ? `−${Math.abs(tx.points_delta).toLocaleString('es-CL')} pts`
                              : `+${tx.points_delta.toLocaleString('es-CL')} pts`}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>

            {/* QR personal */}
            <div className="mb-5">
              <p className="text-white/50 text-[11px] font-medium uppercase tracking-wider mb-3">
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

            {/* Compartir viral */}
            <div
              className="mb-5 rounded-2xl px-5 py-4 border flex items-center gap-4"
              style={{ background: `${accent}0d`, borderColor: `${accent}20` }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-white/70 text-[13px] font-medium leading-snug">
                  ¿Tienes un amigo al que le gustaría esto?
                </p>
                <p className="text-white/35 text-[11px] mt-0.5">
                  Invítalo al programa de {business.name}
                </p>
              </div>
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 text-[13px] font-semibold px-3.5 py-3 min-h-[44px] rounded-xl shrink-0 transition-opacity active:opacity-70"
                style={{ background: accent, color: accentText }}
              >
                <Share2 className="w-3.5 h-3.5" aria-hidden />
                Compartir
              </button>
            </div>

            <p className="text-center text-white/45 text-xs pb-4 pt-2 flex items-center justify-center gap-4 flex-wrap">
              {business.plan === 'free' && (
                <a href="/" className="hover:text-white/70 transition-colors inline-flex items-center min-h-[44px]">
                  Powered by Loyia
                </a>
              )}
              <a href="/privacidad" className="hover:text-white/70 transition-colors inline-flex items-center min-h-[44px]">
                Privacidad
              </a>
            </p>
          </>
        )}

      </div>
    </div>
  )
}
