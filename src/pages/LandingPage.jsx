import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Star, Settings2, QrCode, RotateCcw,
  Coffee, UtensilsCrossed, Scissors, ShoppingBag, Check,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'

// ── Scroll animation hook ─────────────────────────────────────────────────────

// El contenido es visible por defecto (crawlers, reduced-motion, IO no disponible);
// solo se oculta para animar cuando sabemos que la animación puede ejecutarse.
function canAnimate() {
  return (
    typeof window !== 'undefined' &&
    'IntersectionObserver' in window &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function useFadeUp() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(() => !canAnimate())
  useEffect(() => {
    const el = ref.current
    if (!el || visible) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.05, rootMargin: '0px 0px -5% 0px' }
    )
    obs.observe(el)
    // Red de seguridad: si el observer nunca dispara, mostrar igual
    const fallback = setTimeout(() => setVisible(true), 2500)
    return () => { obs.disconnect(); clearTimeout(fallback) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return [ref, visible]
}

function fadeClass(visible) {
  return `transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`
}

// ── Navbar ────────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-md border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/15">
            <Star className="w-3.5 h-3.5 text-primary fill-primary" />
          </span>
          <span
            className="text-primary text-[22px] leading-none tracking-[0.08em]"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Loyia
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-white/60 hover:text-white/85 text-xs sm:text-sm font-medium transition-colors px-2 sm:px-3 py-2.5 inline-flex items-center min-h-[44px]"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className="bg-primary text-[#0f0f0f] text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Empieza gratis
          </Link>
        </div>
      </div>
    </nav>
  )
}

// ── Phone mockup ──────────────────────────────────────────────────────────────

function PhoneMockup() {
  return (
    <div className="relative w-[240px] h-[490px] bg-[#111] rounded-[44px] border-[3px] border-white/[0.12] shadow-2xl shadow-black/70 mx-auto overflow-hidden">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-b-2xl z-10" />

      {/* Screen */}
      <div className="h-full pt-8 pb-4 px-4 flex flex-col gap-2.5 overflow-hidden">
        {/* Business logo + name */}
        <div className="flex flex-col items-center pt-3 gap-1.5">
          <div className="w-11 h-11 rounded-full bg-primary/[0.15] border border-primary/30 flex items-center justify-center">
            <Star className="w-5 h-5 text-primary fill-primary" />
          </div>
          <p
            className="text-primary text-[15px] leading-tight"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Club Castella
          </p>
        </div>

        {/* Points card */}
        <div className="bg-white/[0.05] rounded-2xl px-4 py-3 flex flex-col items-center gap-1.5 border border-white/[0.08]">
          <div className="flex items-center gap-1.5">
            <Star className="w-5 h-5 text-primary fill-primary" />
            <span
              className="text-cream leading-none"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 36 }}
            >
              320
            </span>
          </div>
          <p className="text-white/40 text-[11px]">puntos acumulados</p>
          <div className="w-full bg-white/[0.08] rounded-full h-1.5 mt-0.5">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: '64%' }} />
          </div>
          <p className="text-white/[0.25] text-[10px]">180 pts para Café Gratis</p>
        </div>

        {/* QR card */}
        <div className="bg-white rounded-2xl px-4 py-3 flex flex-col items-center gap-1 mx-1">
          <QRCodeSVG value="loyia.cl" size={82} bgColor="#ffffff" fgColor="#0f0f0f" />
          <p className="text-[#0f0f0f]/40 text-[10px]">Muestra al vendedor</p>
        </div>
      </div>
    </div>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  const handleScrollToHow = (e) => {
    e.preventDefault()
    document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="bg-dark pt-32 pb-24 px-5">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">

        {/* Left — copy */}
        <div className="flex flex-col gap-6">
          <span className="inline-flex self-start items-center bg-primary/[0.12] text-primary text-xs font-medium px-3.5 py-1.5 rounded-full tracking-wide">
            Programa de fidelización para negocios locales
          </span>

          <h1
            className="text-cream text-5xl lg:text-[62px] leading-[1.08] tracking-tight"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Haz que tus clientes vuelvan
          </h1>

          <p className="text-white/55 text-lg leading-relaxed max-w-md">
            Sin app que descargar. Sin complicaciones. Solo escanea y acumula.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-2">
            <Link
              to="/register"
              className="bg-primary text-[#0f0f0f] font-semibold px-8 py-4 rounded-xl hover:bg-primary/90 transition-colors text-[15px]"
            >
              Empieza gratis — sin tarjeta
            </Link>
            <a
              href="#como-funciona"
              onClick={handleScrollToHow}
              className="text-white/60 hover:text-white/85 transition-colors text-[15px] flex items-center gap-1 py-2.5 min-h-[44px]"
            >
              Ver cómo funciona <span aria-hidden>→</span>
            </a>
          </div>
        </div>

        {/* Right — phone mockup */}
        <div className="lg:order-last flex justify-center lg:justify-end">
          <PhoneMockup />
        </div>
      </div>
    </section>
  )
}

// ── Social proof ──────────────────────────────────────────────────────────────

const STATS = [
  { number: '+95%', desc: 'en ganancias con solo 5% más de retención — Harvard Business School' },
  { number: '81%',  desc: 'de clientes se uniría si su negocio local tuviera un programa de puntos' },
  { number: '4.8×', desc: 'ROI promedio de programas de fidelización activos' },
]

function SocialProof() {
  const [ref, visible] = useFadeUp()
  return (
    <section className="bg-cream py-20 px-5">
      <div ref={ref} className={`max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 ${fadeClass(visible)}`}>
        {STATS.map((s) => (
          <div key={s.number} className="text-center flex flex-col gap-2">
            <p
              className="leading-none"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 52, color: '#8a7332' }}
            >
              {s.number}
            </p>
            <p className="text-dark/60 text-sm leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── How it works ──────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: '01',
    icon: Settings2,
    title: 'Configura tu programa',
    desc: 'Nombre, recompensas y tasa de puntos en minutos.',
  },
  {
    num: '02',
    icon: QrCode,
    title: 'Tu cliente escanea el QR',
    desc: 'Acumula puntos en cada compra, sin descargar nada.',
  },
  {
    num: '03',
    icon: RotateCcw,
    title: 'Vuelve por sus recompensas',
    desc: 'Cada canje es una visita más a tu negocio.',
  },
]

function HowItWorks() {
  const [ref, visible] = useFadeUp()
  return (
    <section id="como-funciona" className="bg-cream py-20 px-5 border-t border-black/[0.04]">
      <div className="max-w-5xl mx-auto">
        <div ref={ref} className={fadeClass(visible)}>
          <p className="text-dark/55 text-xs font-semibold uppercase tracking-widest text-center mb-3">Cómo funciona</p>
          <h2
            className="text-dark text-center text-4xl mb-14"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Listo en 10 minutos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {STEPS.map((step) => {
              const Icon = step.icon
              return (
                <div key={step.num} className="flex flex-col gap-4">
                  <div className="flex items-start gap-4">
                    <span
                      className="text-primary/40 leading-none shrink-0"
                      style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 48 }}
                    >
                      {step.num}
                    </span>
                    <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/[0.08] mt-1 shrink-0">
                      <Icon className="w-5 h-5 text-primary" strokeWidth={1.8} />
                    </div>
                  </div>
                  <h3 className="text-dark font-semibold text-[17px]">{step.title}</h3>
                  <p className="text-dark/60 text-sm leading-relaxed">{step.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Prueba social: métricas en vivo + testimonio ──────────────────────────────

const TESTIMONIOS = [
  {
    nombre: 'Valentina',
    negocio: 'Castella',
    ciudad: 'Santiago, Chile',
    texto: 'En el primer mes registré más de 30 clientas habituales que antes no tenía forma de identificar. Ahora sé quiénes son mis mejores clientas.',
    logo: '/logos/castella.png',
  },
]

function TestimonialCard({ t }) {
  const [imgError, setImgError] = useState(false)
  return (
    <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-8 max-w-2xl mx-auto">
      <span
        aria-hidden
        className="block text-primary/35 leading-none mb-2 select-none"
        style={{ fontFamily: 'Georgia, serif', fontSize: 72, lineHeight: 1 }}
      >
        "
      </span>
      <p
        className="text-white/80 text-[17px] leading-relaxed mb-7"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {t.texto}
      </p>
      <div className="flex items-center gap-4 pt-5 border-t border-white/[0.07]">
        {!imgError ? (
          <img
            src={t.logo}
            alt={`Logo de ${t.negocio}`}
            width={96}
            height={48}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-24 h-auto rounded-lg bg-white p-2 object-contain shrink-0"
          />
        ) : (
          <div className="w-24 h-12 rounded-lg bg-white p-2 flex items-center justify-center shrink-0">
            <span
              className="text-primary text-[18px]"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
            >
              {t.negocio[0]}
            </span>
          </div>
        )}
        <div>
          <p className="text-white/75 font-semibold text-[14px]">{t.nombre}</p>
          <p className="text-white/55 text-[12px] mt-0.5">{t.negocio} · {t.ciudad}</p>
        </div>
      </div>
    </div>
  )
}

function LiveSocialProof() {
  const [ref, visible] = useFadeUp()
  const [counts, setCounts] = useState({ businesses: null, customers: null, transactions: null })

  useEffect(() => {
    async function fetchCounts() {
      const { data, error } = await supabase.rpc('get_platform_stats')
      if (error || !data) return
      setCounts({
        businesses: data.businesses,
        customers: data.customers,
        transactions: data.transactions,
      })
    }
    fetchCounts()
  }, [])

  const metrics = [
    { value: counts.businesses,   label: 'negocios activos' },
    { value: counts.customers,    label: 'clientes registrados' },
    { value: counts.transactions, label: 'transacciones procesadas' },
  ]

  /* Carrusel futuro — descomentar y reemplazar activeIndex por state:
  const [activeIndex, setActiveIndex] = useState(0)
  */
  const activeIndex = 0

  return (
    <section className="bg-dark py-20 px-5">
      <div className="max-w-5xl mx-auto">
        <div ref={ref} className={fadeClass(visible)}>

          {/* Parte A — Métricas en vivo */}
          <p className="text-white/55 text-xs font-semibold uppercase tracking-widest text-center mb-3">
            Loyia en números
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10 mb-16">
            {metrics.map((m) => (
              <div key={m.label} className="text-center flex flex-col gap-2">
                <p
                  className="text-primary leading-none"
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 52 }}
                >
                  {m.value === null
                    ? <span className="text-primary/30 text-4xl">—</span>
                    : m.value.toLocaleString('es-CL')}
                </p>
                <p className="text-white/55 text-[13px] leading-relaxed">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Parte B — Testimonio */}
          <p className="text-white/55 text-xs font-semibold uppercase tracking-widest text-center mb-8">
            Lo que dicen nuestros clientes
          </p>
          <TestimonialCard t={TESTIMONIOS[activeIndex]} />

          {/* Puntos de navegación — descomentar para activar carrusel:
          {TESTIMONIOS.length > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {TESTIMONIOS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === activeIndex ? 'bg-primary' : 'bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}
          */}

        </div>
      </div>
    </section>
  )
}

// ── For whom ──────────────────────────────────────────────────────────────────

const FOR_WHOM = [
  { icon: Coffee,           name: 'Cafeterías y pastelerías',  tagline: 'El café de la esquina ya tiene programa de puntos. ¿Y el tuyo?' },
  { icon: UtensilsCrossed,  name: 'Restaurantes y delivery',   tagline: 'Cada delivery es un cliente que no ves. Con Loyia, sabes quién vuelve y quién no.' },
  { icon: Scissors,         name: 'Peluquerías y estéticas',   tagline: 'Tus clientes van cada 3 semanas. Con puntos, van cada 2 semanas.' },
  { icon: ShoppingBag,      name: 'Tiendas y retail',          tagline: 'Transforma compradores ocasionales en clientes fijos. Sin tarjetas de papel, sin apps.' },
]

function ForWhom() {
  const [ref, visible] = useFadeUp()
  return (
    <section className="bg-cream py-20 px-5 border-t border-black/[0.04]">
      <div className="max-w-5xl mx-auto">
        <div ref={ref} className={fadeClass(visible)}>
          <p className="text-dark/55 text-xs font-semibold uppercase tracking-widest text-center mb-3">Para quién es</p>
          <h2
            className="text-dark text-center text-4xl mb-12"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Para cualquier negocio local
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FOR_WHOM.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.name}
                  className="bg-white rounded-2xl p-6 border border-black/[0.05] flex flex-col gap-4"
                >
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/[0.08]">
                    <Icon className="w-5 h-5 text-primary" strokeWidth={1.8} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <p className="text-dark font-semibold text-[15px] leading-snug">{item.name}</p>
                    <p className="text-dark/60 text-[13px] leading-relaxed">{item.tagline}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Pricing ───────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: null,
    desc: 'Para empezar sin riesgo',
    features: ['Hasta 50 clientes', '2 recompensas', 'Con logo Loyia', 'Soporte por email'],
    cta: 'Empieza gratis',
    highlight: false,
  },
  {
    name: 'Starter',
    price: '$29.990',
    period: '/mes',
    desc: 'Para negocios en crecimiento',
    features: ['Hasta 300 clientes', 'Recompensas ilimitadas', 'Tu marca y logo', 'Soporte prioritario'],
    cta: 'Empieza gratis',
    highlight: true,
    badge: 'Más popular',
  },
  {
    name: 'Pro',
    price: '$59.990',
    period: '/mes',
    desc: 'Para cadenas y multi-sucursal',
    features: ['Clientes ilimitados', 'Roles de cajero', 'Analytics avanzados', 'Exportar clientes', 'Notificaciones WhatsApp (próximamente)'],
    cta: 'Empieza gratis',
    highlight: false,
  },
]

function Pricing() {
  const [ref, visible] = useFadeUp()
  return (
    <section className="bg-[#e8e3d8] py-20 px-5">
      <div className="max-w-5xl mx-auto">
        <div ref={ref} className={fadeClass(visible)}>
          <p className="text-dark/55 text-xs font-semibold uppercase tracking-widest text-center mb-3">Precios</p>
          <h2
            className="text-dark text-center text-4xl mb-3"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Precios simples, sin sorpresas
          </h2>
          <p className="text-dark/60 text-center text-sm mb-12">Sin tarjeta de crédito para empezar.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-white rounded-2xl p-7 flex flex-col gap-6 ${
                  plan.highlight
                    ? 'border-2 border-primary shadow-lg shadow-primary/10'
                    : 'border border-black/[0.06]'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-[#0f0f0f] text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap">
                    {plan.badge}
                  </span>
                )}

                <div className="flex flex-col gap-1">
                  <p className="text-dark/50 text-xs font-semibold uppercase tracking-widest">{plan.name}</p>
                  <div className="flex items-end gap-1 mt-1">
                    <span
                      className="text-dark leading-none"
                      style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 40 }}
                    >
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-dark/40 text-sm pb-1">{plan.period}</span>
                    )}
                  </div>
                  <p className="text-dark/45 text-[13px] mt-1">{plan.desc}</p>
                </div>

                <ul className="flex flex-col gap-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-[14px] text-dark/70">
                      <Check className="w-4 h-4 text-primary shrink-0" strokeWidth={2.5} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register"
                  className={`mt-auto text-center text-[14px] font-semibold py-3 rounded-xl transition-colors ${
                    plan.highlight
                      ? 'bg-primary text-[#0f0f0f] hover:bg-primary/90'
                      : 'bg-dark/[0.05] text-dark hover:bg-dark/[0.09]'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Final CTA ─────────────────────────────────────────────────────────────────

function FinalCTA() {
  const [ref, visible] = useFadeUp()
  return (
    <section className="bg-dark py-24 px-5">
      <div ref={ref} className={`max-w-2xl mx-auto text-center flex flex-col items-center gap-6 ${fadeClass(visible)}`}>
        <h2
          className="text-cream text-5xl leading-[1.1]"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
        >
          Empieza hoy, es gratis
        </h2>
        <p className="text-white/50 text-lg">
          Sin tarjeta de crédito. Sin contrato. Cancela cuando quieras.
        </p>
        <Link
          to="/register"
          className="bg-primary text-[#0f0f0f] font-semibold px-10 py-4 rounded-xl hover:bg-primary/90 transition-colors text-[16px] mt-2"
        >
          Crear mi programa ahora <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-dark border-t border-white/[0.06] py-8 px-5">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/15">
            <Star className="w-3 h-3 text-primary fill-primary" />
          </span>
          <span
            className="text-primary text-[18px] leading-none tracking-[0.08em]"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Loyia
          </span>
        </div>

        {/* Links */}
        <div className="flex items-center justify-center gap-x-5 gap-y-1 flex-wrap">
          <Link to="/login" className="text-white/55 hover:text-white/80 text-sm transition-colors inline-flex items-center min-h-[44px]">
            Iniciar sesión
          </Link>
          <Link to="/register" className="text-white/55 hover:text-white/80 text-sm transition-colors inline-flex items-center min-h-[44px]">
            Registrarse
          </Link>
          <Link to="/terminos" className="text-white/55 hover:text-white/80 text-sm transition-colors inline-flex items-center min-h-[44px]">
            Términos de uso
          </Link>
          <Link to="/privacidad" className="text-white/55 hover:text-white/80 text-sm transition-colors inline-flex items-center min-h-[44px]">
            Política de privacidad
          </Link>
        </div>

        <p className="text-white/45 text-xs">© 2026 Loyia · Chile</p>
      </div>
    </footer>
  )
}

// ── LandingPage ───────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <SocialProof />
        <HowItWorks />
        <LiveSocialProof />
        <ForWhom />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
