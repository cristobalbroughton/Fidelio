import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Mail } from 'lucide-react'

// ── WhatsApp icon ─────────────────────────────────────────────────────────────

function WhatsAppIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

// ── Preguntas frecuentes ──────────────────────────────────────────────────────

const FAQ = [
  {
    q: '¿Cómo registro una compra?',
    a: 'Ve a "Nueva Compra" en el menú lateral. Busca al cliente por su número de teléfono o escanea su código QR, ingresa el monto de la compra y confirma. Los puntos se acumulan automáticamente según la configuración de tu programa.',
  },
  {
    q: '¿Cómo mis clientes ven sus puntos?',
    a: 'Cada cliente tiene una mini-webapp personal accesible desde el link de tu negocio. Ahí pueden ver su saldo de puntos, sus recompensas disponibles y su historial de transacciones, sin necesidad de descargar ninguna app.',
  },
  {
    q: '¿Cómo comparto el programa con mis clientes?',
    a: 'Comparte el link de tu negocio directamente por WhatsApp, Instagram o como prefieras. También puedes imprimir un código QR y ponerlo en tu local para que los clientes lo escaneen. El link lo encuentras en la sección "Configuración" de tu dashboard, en "Tu negocio".',
  },
  {
    q: '¿Qué pasa si un cliente pierde su teléfono o cambia de número?',
    a: 'El programa está asociado al número de teléfono. Si un cliente cambia de número, deberás registrarlo con el número nuevo — los puntos del número anterior no se transfieren automáticamente. Puedes contactarnos para ayudarte con casos puntuales.',
  },
  {
    q: '¿Puedo ajustar los puntos de un cliente manualmente?',
    a: 'Sí. Desde "Nueva Compra", busca al cliente y registra una transacción de earn o canje para ajustar sus puntos. Por ahora no hay campo de nota explicativa, pero puedes contactarnos si necesitas ayuda con un ajuste puntual.',
  },
  {
    q: '¿Qué pasa cuando llego al límite de clientes de mi plan?',
    a: 'Cuando alcanzas el límite, los nuevos clientes no podrán registrarse en tu programa hasta que subas de plan. Los clientes existentes y sus puntos no se ven afectados. Verás un aviso en tu dashboard antes de llegar al límite.',
  },
  {
    q: '¿Puedo eliminar una recompensa que ya fue canjeada?',
    a: 'Sí. Puedes eliminar cualquier recompensa desde la sección "Recompensas". El historial de canjes anteriores se mantiene intacto — solo la recompensa deja de estar disponible para nuevos canjes.',
  },
  {
    q: '¿Cuántas recompensas puedo tener activas?',
    a: 'El plan Free permite hasta 2 recompensas activas. El plan Starter y Pro tienen recompensas ilimitadas.',
  },
  {
    q: '¿Cómo cambio mi plan?',
    a: 'Por ahora los cambios de plan se gestionan directamente con nosotros. Escríbenos por WhatsApp o email y te ayudamos en minutos.',
  },
  {
    q: '¿Qué pasa si no pago a tiempo?',
    a: 'Tienes 5 días hábiles de gracia después de la fecha de vencimiento. Si no se regulariza el pago en ese plazo, tu cuenta baja automáticamente al plan Free. Tus datos y los de tus clientes se mantienen intactos.',
  },
  {
    q: '¿Hay reembolsos?',
    a: 'No realizamos reembolsos por períodos no utilizados. Puedes cancelar tu plan en cualquier momento y seguir usando Loyia hasta el fin del período pagado.',
  },
  {
    q: '¿Cómo elimino mi cuenta?',
    a: 'Escríbenos a cristobal.broughton@gmail.com solicitando la eliminación. Procesamos la solicitud dentro de los 5 a 10 días hábiles siguientes.',
  },
  {
    q: '¿Qué pasa con los datos de mis clientes si elimino mi cuenta?',
    a: 'Todos los datos de tu negocio y de tus clientes son eliminados o anonimizados dentro del mismo plazo de 5 a 10 días hábiles.',
  },
]

// ── Componente ────────────────────────────────────────────────────────────────

export default function AyudaPage() {
  const [openIndex, setOpenIndex] = useState(null)

  const toggle = (i) => setOpenIndex(prev => (prev === i ? null : i))

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-[#0f0f0f]/90 backdrop-blur-sm border-b border-white/[0.06]">
        <div className="max-w-[720px] mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
          <span
            className="text-primary text-[17px] leading-none tracking-[0.06em]"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Loyia
          </span>
          <div className="w-16" />
        </div>
      </header>

      {/* ── Contenido ── */}
      <main className="flex-1 max-w-[720px] mx-auto w-full px-6 py-14">

        {/* Hero */}
        <div className="mb-14 pb-10 border-b border-white/[0.06]">
          <p className="text-white/30 text-[12px] uppercase tracking-[0.18em] font-medium mb-4">
            Centro de ayuda
          </p>
          <h1
            className="text-4xl text-white leading-tight mb-4"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Preguntas frecuentes
          </h1>
          <p className="text-white/35 text-sm">
            Todo lo que necesitas saber para sacarle el máximo a Loyia.
          </p>
        </div>

        {/* Acordeón ── */}
        <div className="divide-y divide-white/[0.06] mb-16">
          {FAQ.map((item, i) => {
            const isOpen = openIndex === i
            return (
              <div key={i}>
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center gap-4 md:gap-6 py-5 text-left group"
                >
                  {/* Número */}
                  <span
                    className="shrink-0 text-[12px] font-semibold tabular-nums w-7 text-right"
                    style={{ color: '#c9a84c', opacity: isOpen ? 0.9 : 0.4 }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  {/* Pregunta */}
                  <span
                    className={`flex-1 text-[15px] font-semibold leading-snug transition-colors duration-150 ${
                      isOpen ? 'text-white' : 'text-white/65 group-hover:text-white/85'
                    }`}
                    style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
                  >
                    {item.q}
                  </span>

                  {/* Chevron */}
                  <ChevronDown
                    className="w-4 h-4 shrink-0 text-white/25 transition-transform duration-300"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                </button>

                {/* Respuesta — max-height slide */}
                <div
                  style={{
                    maxHeight: isOpen ? '400px' : '0',
                    overflow: 'hidden',
                    transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <p className="pl-11 md:pl-[52px] pb-5 text-[15px] text-white/50 leading-relaxed">
                    {item.a}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Sección de contacto ── */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8">
          <p className="text-white/30 text-[12px] uppercase tracking-[0.18em] font-medium mb-3">
            Soporte
          </p>
          <h2
            className="text-[22px] font-semibold text-white mb-2 leading-snug"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            ¿Necesitas más ayuda?
          </h2>
          <p className="text-white/40 text-sm mb-7">
            Respondemos en minutos por WhatsApp durante el horario laboral.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="https://wa.me/56981583157?text=Hola%2C%20tengo%20una%20consulta%20sobre%20Loyia..."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl font-semibold text-[14px] text-[#0f0f0f] transition-opacity hover:opacity-85 flex-1"
              style={{ background: '#25D366' }}
            >
              <WhatsAppIcon className="w-4.5 h-4.5" />
              Escríbenos por WhatsApp
            </a>

            <a
              href="mailto:cristobal.broughton@gmail.com?subject=Consulta%20Loyia"
              className="flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl font-semibold text-[14px] text-[#0f0f0f] transition-opacity hover:opacity-85 flex-1"
              style={{ background: '#c9a84c' }}
            >
              <Mail className="w-4 h-4" />
              Envíanos un email
            </a>
          </div>
        </div>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] py-8">
        <p className="text-center text-white/20 text-xs">© 2026 Loyia</p>
      </footer>

    </div>
  )
}
