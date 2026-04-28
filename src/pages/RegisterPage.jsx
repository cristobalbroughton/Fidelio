import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function RegisterPage() {
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [resending, setResending]       = useState(false)
  const [resendError, setResendError]   = useState('')
  const [view, setView]                 = useState('form') // 'form' | 'check-email'
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsError, setTermsError]       = useState(false)
  const { signUp } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!termsAccepted) {
      setTermsError(true)
      return
    }
    setSubmitting(true)
    try {
      await signUp(email, password)
      setView('check-email')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setResendError('')
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email })
      if (error) throw error
      toast.success('Email reenviado')
    } catch (err) {
      const isRateLimit =
        err?.status === 429 ||
        err?.message?.toLowerCase().includes('rate limit')
      setResendError(
        isRateLimit
          ? 'Ya enviamos un email recientemente. Espera unos minutos antes de solicitar otro.'
          : 'No pudimos reenviar el email. Intenta de nuevo.'
      )
    } finally {
      setResending(false)
    }
  }

  if (view === 'check-email') {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
        <div className="w-full max-w-md">

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary tracking-tight">Fidelio</h1>
          </div>

          <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-white/10 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(201,168,76,0.12)' }}
            >
              <Mail className="w-7 h-7 text-primary" />
            </div>

            <h2 className="text-xl font-semibold text-[#f4f1ea] mb-3">
              Revisa tu email
            </h2>
            <p className="text-[#f4f1ea]/50 text-sm leading-relaxed mb-7">
              Te enviamos un link de confirmación a{' '}
              <span className="text-[#f4f1ea]/80 font-medium">{email}</span>.
              Haz click en el link para activar tu cuenta.
            </p>

            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full border border-white/10 text-[#f4f1ea]/60 hover:text-[#f4f1ea] hover:border-white/20 font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-[14px] disabled:opacity-40"
            >
              {resending && <Loader2 className="w-4 h-4 animate-spin" />}
              Reenviar email
            </button>
            {resendError && (
              <p className="text-red-400 text-[12px] mt-2 mb-2 leading-snug">{resendError}</p>
            )}

            <button
              onClick={() => { setView('form'); setResendError('') }}
              className="text-[13px] text-[#f4f1ea]/30 hover:text-[#f4f1ea]/50 transition-colors"
            >
              ¿Email incorrecto? Volver al registro
            </button>
          </div>

        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary tracking-tight">Fidelio</h1>
          <p className="text-[#f4f1ea]/50 mt-2 text-sm">Crea tu cuenta</p>
        </div>

        <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-white/10">
          <h2 className="text-xl font-semibold text-[#f4f1ea] mb-6">Registrar negocio</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[#f4f1ea]/60 mb-1.5">Nombre del negocio</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                placeholder="Ej: Castella Pastelería"
                className="w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-4 py-3 text-[#f4f1ea] placeholder-[#f4f1ea]/20 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-[#f4f1ea]/60 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="tu@negocio.cl"
                className="w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-4 py-3 text-[#f4f1ea] placeholder-[#f4f1ea]/20 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-[#f4f1ea]/60 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                className="w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-4 py-3 text-[#f4f1ea] placeholder-[#f4f1ea]/20 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={e => { setTermsAccepted(e.target.checked); setTermsError(false) }}
                  className="mt-0.5 w-4 h-4 shrink-0 accent-[#c9a84c] cursor-pointer"
                />
                <span className="text-[13px] text-[#f4f1ea]/50 leading-snug">
                  Al crear una cuenta, aceptas nuestros{' '}
                  <a
                    href="/terminos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 transition-colors"
                  >
                    Términos de uso
                  </a>
                  {' '}y nuestra{' '}
                  <a
                    href="/privacidad"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 transition-colors"
                  >
                    Política de privacidad
                  </a>
                </span>
              </label>
              {termsError && (
                <p className="text-red-400 text-[12px] mt-1.5 ml-7">
                  Debes aceptar los términos para continuar
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-[#0f0f0f] font-semibold py-3 rounded-lg hover:bg-primary/90 transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear cuenta
            </button>
          </form>

          <p className="text-center text-[#f4f1ea]/40 text-sm mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary hover:text-primary/80 transition-colors">
              Iniciar sesión
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
