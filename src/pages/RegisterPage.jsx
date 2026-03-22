import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'

export default function RegisterPage() {
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await signUp(email, password)
      navigate('/onboarding', { state: { businessName } })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
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
