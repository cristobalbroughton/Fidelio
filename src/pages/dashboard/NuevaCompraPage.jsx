import { useState, useEffect, useRef } from 'react'
import { Loader2, Search, CheckCircle2, Star, X, QrCode } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('569')) return `+${digits}`
  if (digits.startsWith('9') && digits.length === 9) return `+56${digits}`
  return `+${digits}`
}

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

const INPUT_CLASS =
  'w-full border border-black/[0.08] rounded-lg px-4 py-3 text-dark placeholder-dark/25 focus:outline-none focus:border-primary/50 transition-colors bg-white'

const LABEL_CLASS = 'block text-[13px] font-medium text-dark/55 mb-1.5'

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

  // QR scanner
  const [qrOpen, setQrOpen] = useState(false)

  // Derived
  const amountRaw = Number(amount.replace(/\./g, ''))
  const pointsPreview =
    business && amountRaw > 0 ? Math.floor(amountRaw / business.points_per_clp) : 0

  // ── Load business on mount ─────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('businesses')
      .select('id, name, points_per_clp, welcome_points')
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

        const { data: visits } = await supabase
          .from('transactions')
          .select('created_at, points_delta')
          .eq('customer_id', data.id)
          .eq('business_id', business.id)
          .eq('type', 'earn')
          .order('created_at', { ascending: false })
          .limit(3)

        setRecentVisits(visits ?? [])
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

      setResult({
        pointsEarned: business.welcome_points,
        newBalance: business.welcome_points,
      })
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

      setResult({
        pointsEarned: points,
        newBalance: customer.points_balance + points,
      })
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
    setAmount('')
    setResult(null)
  }

  const handleQrFound = async (foundCustomer) => {
    try {
      setQrOpen(false)
      console.log('[QR] handleQrFound start, foundCustomer:', foundCustomer)

      toast.success('1: setCustomer llamado')
      console.log('[QR] setCustomer:', foundCustomer)
      setCustomer(foundCustomer)

      toast.success('2: query recentVisits')
      console.log('[QR] querying recentVisits, customer_id:', foundCustomer.id, 'business_id:', business.id)
      const { data: visits, error: visitsError } = await supabase
        .from('transactions')
        .select('created_at, points_delta')
        .eq('customer_id', foundCustomer.id)
        .eq('business_id', business.id)
        .eq('type', 'earn')
        .order('created_at', { ascending: false })
        .limit(3)
      console.log('[QR] recentVisits result:', visits, 'error:', visitsError)

      setRecentVisits(visits ?? [])
      toast.success('3: setView purchase')
      console.log('[QR] setView purchase')
      setView('purchase')
    } catch (err) {
      console.error('[QR] handleQrFound error:', err)
      toast.error(`Error: ${err?.message ?? String(err)}`)
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
    <div className="p-8 lg:p-10 max-w-2xl">

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

            {/* Recent visits */}
            <div>
              <p className="text-[12px] font-medium text-dark/35 uppercase tracking-[0.08em] mb-2">
                Últimas visitas
              </p>
              {recentVisits.length === 0 ? (
                <p className="text-[13px] text-dark/35 italic">Sin visitas previas</p>
              ) : (
                <div className="space-y-1">
                  {recentVisits.map((v, i) => (
                    <div key={i} className="flex items-center justify-between text-[13px]">
                      <span className="text-dark/55">{formatDate(v.created_at)}</span>
                      <span className="text-primary font-medium">+{v.points_delta} pts</span>
                    </div>
                  ))}
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
          </div>
        )}

        {/* ── VIEW: success ─────────────────────────────────────────────────── */}
        {view === 'success' && result && (
          <div className="text-center py-4 space-y-5">
            <div className="flex items-center justify-center">
              <CheckCircle2
                className="w-14 h-14 text-primary"
                strokeWidth={1.5}
              />
            </div>

            <div>
              <p
                className="text-[22px] font-semibold text-dark"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
              >
                ¡Puntos acreditados!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-cream rounded-xl p-4">
                <p className="text-[12px] text-dark/40 font-medium mb-1">Puntos ganados</p>
                <p
                  className="text-[32px] leading-none text-primary tabular-nums"
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
                >
                  +{result.pointsEarned.toLocaleString('es-CL')}
                </p>
              </div>
              <div className="bg-cream rounded-xl p-4">
                <p className="text-[12px] text-dark/40 font-medium mb-1">Nuevo balance</p>
                <p
                  className="text-[32px] leading-none text-dark tabular-nums"
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
                >
                  {result.newBalance.toLocaleString('es-CL')}
                </p>
              </div>
            </div>

            <button onClick={handleReset} className={BTN_PRIMARY}>
              Nueva compra
            </button>
          </div>
        )}

      </div>

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
  const [debugMsg, setDebugMsg] = useState(
    `biz keys: ${Object.keys(business).join(',')} | id=${business.id}`
  )
  const [fallback, setFallback] = useState(false)
  const [manualId, setManualId] = useState('')
  const [querying, setQuerying] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const detectedRef = useRef(false)

  const queryCustomer = async (uuid) => {
    setDebugMsg(prev => prev + `\nconsultando biz=${business.id} id=${uuid}`)
    const { data, error } = await supabase
      .from('loyalty_customers')
      .select('id, phone, name, points_balance, visits_count, last_visit_at')
      .eq('id', uuid)
      .eq('business_id', business.id)
      .maybeSingle()

    const errStr = error
      ? `code=${error.code} msg=${error.message} details=${error.details}`
      : 'ninguno'
    setDebugMsg(prev => prev + `\ndata=${data ? 'ENCONTRADO' : 'NULL'} error=${errStr}`)

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
      setDebugMsg(prev => prev + '\nBarcodeDetector no disponible — modo manual')
      return
    }

    setDebugMsg(prev => prev + '\nBarcodeDetector OK, solicitando cámara…')

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        streamRef.current = stream
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        video.play()
        setDebugMsg(prev => prev + '\ncámara activa, escaneando…')

        const detector = new window.BarcodeDetector({ formats: ['qr_code'] })

        const scan = async () => {
          if (detectedRef.current) return
          try {
            if (video.readyState >= 2) {
              const barcodes = await detector.detect(video)
              if (barcodes.length > 0) {
                const raw = barcodes[0].rawValue
                setDebugMsg(prev => prev + `\nQR: ${raw}`)
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
      .catch(err => {
        setDebugMsg(prev => prev + `\nError cámara: ${err.message}`)
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

        {/* Debug */}
        {debugMsg && (
          <p className="mx-4 mb-3 mt-1 text-[11px] font-mono text-dark/50 bg-dark/[0.04] rounded-lg px-3 py-2 break-all whitespace-pre-wrap">
            {debugMsg}
          </p>
        )}
      </div>
    </div>
  )
}
