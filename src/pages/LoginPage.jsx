import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { setCashierSession } from '../lib/cashierSession'

export default function LoginPage() {
  const [tab, setTab] = useState('negocio') // 'negocio' | 'cajero'

  // Negocio tab
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { signIn } = useAuth()

  // Cajero tab
  const [slug, setSlug] = useState('')
  const [pin, setPin] = useState('')
  const [submittingCajero, setSubmittingCajero] = useState(false)
  const [blockedUntil, setBlockedUntil] = useState(null)
  const [countdown, setCountdown] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    if (!blockedUntil) return
    const interval = setInterval(() => {
      const remaining = Math.ceil((blockedUntil - Date.now()) / 1000)
      if (remaining <= 0) {
        setBlockedUntil(null)
        setCountdown(0)
      } else {
        setCountdown(remaining)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [blockedUntil])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await signIn(email, password)
      // Navigation is handled by PublicRoute once auth context updates
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCajeroLogin = async (e) => {
    e.preventDefault()
    if (!slug.trim() || pin.length !== 6) return

    if (blockedUntil && Date.now() < blockedUntil) {
      toast.error(`Demasiados intentos. Espera ${countdown} segundos.`)
      return
    }

    setSubmittingCajero(true)
    try {
      const { data: biz, error: bizErr } = await supabase
        .rpc('get_business_public', { p_slug: slug.trim().toLowerCase() })
      if (bizErr) throw bizErr

      if (!biz) {
        toast.error('Negocio no encontrado')
        return
      }

      const { data, error } = await supabase
        .rpc('verify_cashier_pin', { p_business_id: biz.id, p_pin: pin })
      if (error) throw error

      if (data?.status === 'rate_limited') {
        const secs = data.retry_after ?? 30
        setBlockedUntil(Date.now() + secs * 1000)
        setCountdown(secs)
        toast.error(`Demasiados intentos. Espera ${secs} segundos.`)
        return
      }
      if (data?.status === 'disabled') {
        toast.error('Este cajero está deshabilitado. Contacta al administrador.')
        return
      }
      if (data?.status !== 'ok') {
        toast.error('PIN incorrecto')
        return
      }

      setBlockedUntil(null)
      setCountdown(0)
      setCashierSession({
        type: 'cashier',
        business_id: biz.id,
        business_name: biz.name,
        cashier_id: data.cashier.id,
        cashier_name: data.cashier.name,
        slug: biz.slug,
      })
      navigate('/dashboard/nueva-compra')
    } catch (err) {
      toast.error(err.message ?? 'Error al iniciar sesión')
    } finally {
      setSubmittingCajero(false)
    }
  }

  const INPUT_CLS =
    'w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-4 py-3 text-[#f4f1ea] placeholder-[#f4f1ea]/40 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary transition-colors'

  const BTN_CLS =
    'w-full bg-primary text-[#0f0f0f] font-semibold py-3 rounded-lg hover:bg-primary/90 transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary tracking-tight">Loyia</h1>
          <p className="text-[#f4f1ea]/60 mt-2 text-sm">Panel de administración</p>
        </div>

        <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-white/[0.08]" role="tablist" aria-label="Tipo de acceso">
            {[
              { key: 'negocio', label: 'Negocio' },
              { key: 'cajero',  label: 'Cajero'  },
            ].map(({ key, label }) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={[
                  'flex-1 py-3.5 text-[13px] font-semibold transition-colors border-b-2 -mb-px',
                  tab === key
                    ? 'text-primary border-primary'
                    : 'text-white/55 border-transparent hover:text-white/80',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-8">

            {/* ── Tab: Negocio ─────────────────────────────────── */}
            {tab === 'negocio' && (
              <>
                <h2 className="text-xl font-semibold text-[#f4f1ea] mb-6">Iniciar sesión</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#f4f1ea]/60 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      placeholder="tu@negocio.cl"
                      className={INPUT_CLS}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[#f4f1ea]/60 mb-1.5">Contraseña</label>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className={INPUT_CLS}
                    />
                  </div>

                  <button type="submit" disabled={submitting} className={BTN_CLS}>
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Entrar
                  </button>
                </form>

                <p className="text-center text-[#f4f1ea]/60 text-sm mt-6">
                  ¿No tienes cuenta?{' '}
                  <Link to="/register" className="text-primary hover:text-primary/80 transition-colors">
                    Regístrate
                  </Link>
                </p>
              </>
            )}

            {/* ── Tab: Cajero ──────────────────────────────────── */}
            {tab === 'cajero' && (
              <>
                <h2 className="text-xl font-semibold text-[#f4f1ea] mb-6">Acceso cajero</h2>

                <form onSubmit={handleCajeroLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#f4f1ea]/60 mb-1.5">Slug del negocio</label>
                    <input
                      type="text"
                      value={slug}
                      onChange={e => setSlug(e.target.value.toLowerCase())}
                      required
                      autoComplete="off"
                      placeholder="cafementa"
                      className={INPUT_CLS + ' font-mono'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[#f4f1ea]/60 mb-1.5">PIN</label>
                    <input
                      type="password"
                      value={pin}
                      onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="••••••"
                      className={INPUT_CLS + ' tracking-[0.4em]'}
                    />
                  </div>

                  {blockedUntil && countdown > 0 && (
                    <p className="text-red-400 text-sm text-center">
                      Demasiados intentos. Espera {countdown}s para continuar.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submittingCajero || !slug.trim() || pin.length !== 6 || (blockedUntil && Date.now() < blockedUntil)}
                    className={BTN_CLS}
                  >
                    {submittingCajero && <Loader2 className="w-4 h-4 animate-spin" />}
                    Entrar
                  </button>
                </form>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
