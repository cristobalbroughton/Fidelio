import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Loader2, Check, ChevronRight, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

function generateSlug(name) {
  const base = name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return `${base}-${Math.random().toString(36).slice(2, 7)}`
}

const STEPS = ['Datos básicos', 'Puntos', 'Recompensa']

const INPUT_CLASS =
  'w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-4 py-3 text-[#f4f1ea] placeholder-[#f4f1ea]/40 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary transition-colors'

const LABEL_CLASS = 'block text-[13px] text-[#f4f1ea]/60 font-medium mb-1.5'

export default function OnboardingPage() {
  const { state: locationState } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: locationState?.businessName ?? '',
    category: '',
    description: '',
    pointsRate: 100,
    welcomePoints: 50,
    programName: '',
    rewardName: '',
    rewardPoints: 500,
    rewardType: 'producto',
  })

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const setNum = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: Number(e.target.value.replace(/\D/g, '')) || 0 }))

  const canProceed =
    step === 1
      ? form.name.trim() !== '' && form.category !== ''
      : step === 2
      ? form.pointsRate > 0 && form.welcomePoints >= 0 && form.programName.trim() !== ''
      : form.rewardName.trim() !== '' && form.rewardPoints > 0

  const handleNext = () => setStep((s) => s + 1)
  const handleBack = () => setStep((s) => s - 1)

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Sesión expirada. Por favor inicia sesión de nuevo.')
      navigate('/login')
      return
    }

    setSubmitting(true)
    try {
      const slug = generateSlug(form.name)

      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .insert({
          owner_id: user.id,
          name: form.name,
          slug,
          category: form.category,
          description: form.description || null,
          program_name: form.programName,
          points_per_clp: form.pointsRate,
          welcome_points: form.welcomePoints,
        })
        .select()
        .single()

      if (bizError) throw bizError

      const rewardTypeMap = { producto: 'product', descuento: 'discount' }
      const { error: rewardError } = await supabase
        .from('rewards')
        .insert({
          business_id: business.id,
          name: form.rewardName,
          points_required: form.rewardPoints,
          type: rewardTypeMap[form.rewardType] ?? form.rewardType,
        })

      if (rewardError) throw rewardError

      await supabase.auth.updateUser({ data: { business_name: form.name } }).catch(() => {})

      toast.success('¡Negocio configurado! Bienvenido a Loyia.')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err.code === '23505') {
        toast.error('Ese nombre ya está en uso. Prueba con una variación.')
      } else {
        toast.error(err.message ?? 'Ocurrió un error. Intenta de nuevo.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <p
            className="text-primary text-3xl"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Loyia
          </p>
          <p className="text-[#f4f1ea]/30 text-sm mt-1.5">
            Configura tu programa de fidelización
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 p-8">

          {/* Progress bar */}
          <div className="flex items-start justify-between mb-10">
            {STEPS.map((label, i) => {
              const idx = i + 1
              const completed = idx < step
              const active = idx === step
              return (
                <div key={label} className="flex-1 flex flex-col items-center relative">
                  {/* Connector line (except first) */}
                  {i > 0 && (
                    <div
                      className={[
                        'absolute top-[15px] right-1/2 left-0 h-px',
                        completed || active ? 'bg-primary' : 'bg-white/10',
                      ].join(' ')}
                    />
                  )}

                  {/* Circle */}
                  <div
                    className={[
                      'w-[30px] h-[30px] rounded-full flex items-center justify-center text-[12px] font-semibold z-10 transition-all duration-200',
                      completed
                        ? 'bg-primary text-[#0f0f0f]'
                        : active
                        ? 'border-2 border-primary text-primary bg-[#1a1a1a]'
                        : 'border border-white/20 text-white/30 bg-[#1a1a1a]',
                    ].join(' ')}
                  >
                    {completed ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : idx}
                  </div>

                  {/* Label */}
                  <span
                    className={[
                      'text-[11px] mt-2 font-medium text-center leading-tight',
                      active ? 'text-[#f4f1ea]/70' : 'text-[#f4f1ea]/30',
                    ].join(' ')}
                  >
                    {label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Step 1 — Datos básicos */}
          {step === 1 && (
            <div className="space-y-4">
              <h2
                className="text-[#f4f1ea] text-lg font-semibold mb-5"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
              >
                Cuéntanos sobre tu negocio
              </h2>

              <div>
                <label className={LABEL_CLASS}>Nombre del negocio</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="Ej: Castella Pastelería"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className={LABEL_CLASS}>Categoría</label>
                <select
                  value={form.category}
                  onChange={set('category')}
                  className={INPUT_CLASS}
                >
                  <option value="" disabled>Selecciona una categoría</option>
                  <option value="restaurante">Restaurante</option>
                  <option value="cafeteria">Cafetería</option>
                  <option value="peluqueria">Peluquería</option>
                  <option value="tienda">Tienda</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label className={LABEL_CLASS}>
                  Descripción{' '}
                  <span className="text-[#f4f1ea]/25 font-normal">(opcional)</span>
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={set('description')}
                  placeholder="Breve descripción de tu negocio"
                  className={INPUT_CLASS + ' resize-none'}
                />
              </div>
            </div>
          )}

          {/* Step 2 — Configurar puntos */}
          {step === 2 && (
            <div className="space-y-4">
              <h2
                className="text-[#f4f1ea] text-lg font-semibold mb-5"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
              >
                Configura los puntos
              </h2>

              <div>
                <label className={LABEL_CLASS}>Tasa de puntos</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.pointsRate}
                  onChange={setNum('pointsRate')}
                  className={INPUT_CLASS}
                />
                <p className="text-[12px] text-primary/70 mt-1.5">
                  Cada ${form.pointsRate.toLocaleString('es-CL')} CLP = 1 punto
                </p>
              </div>

              <div>
                <label className={LABEL_CLASS}>Puntos de bienvenida</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.welcomePoints}
                  onChange={setNum('welcomePoints')}
                  className={INPUT_CLASS}
                />
                <p className="text-[12px] text-[#f4f1ea]/55 mt-1.5">
                  Se regalan al cliente al registrarse
                </p>
              </div>

              <div>
                <label className={LABEL_CLASS}>Nombre del programa</label>
                <input
                  type="text"
                  value={form.programName}
                  onChange={set('programName')}
                  placeholder="Ej: Club Castella"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          )}

          {/* Step 3 — Primera recompensa */}
          {step === 3 && (
            <div className="space-y-4">
              <h2
                className="text-[#f4f1ea] text-lg font-semibold mb-5"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
              >
                Primera recompensa
              </h2>

              <div>
                <label className={LABEL_CLASS}>Nombre de la recompensa</label>
                <input
                  type="text"
                  value={form.rewardName}
                  onChange={set('rewardName')}
                  placeholder="Ej: Café gratis"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className={LABEL_CLASS}>Puntos requeridos</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.rewardPoints}
                  onChange={setNum('rewardPoints')}
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className={LABEL_CLASS}>Tipo de recompensa</label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  {[
                    { value: 'producto', label: 'Producto' },
                    { value: 'descuento', label: 'Descuento' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, rewardType: value }))}
                      className={[
                        'rounded-lg border py-3 px-4 text-[13.5px] font-medium transition-all duration-150',
                        form.rewardType === value
                          ? 'border-primary/60 bg-primary/[0.06] text-[#f4f1ea]'
                          : 'border-white/10 text-[#f4f1ea]/50 hover:border-white/20 hover:text-[#f4f1ea]/70',
                      ].join(' ')}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 space-y-3">
            {step === 3 ? (
              <button
                onClick={handleSubmit}
                disabled={!canProceed || submitting}
                className="w-full bg-primary text-[#0f0f0f] font-semibold py-3 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando…
                  </>
                ) : (
                  'Finalizar configuración'
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className="w-full bg-primary text-[#0f0f0f] font-semibold py-3 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {step > 1 && (
              <button
                onClick={handleBack}
                disabled={submitting}
                className="w-full py-2.5 text-[13.5px] font-medium text-[#f4f1ea]/40 hover:text-[#f4f1ea]/70 transition-colors flex items-center justify-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                Volver
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
