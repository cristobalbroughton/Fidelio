import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// ── Secciones ─────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    num: '01',
    title: 'Aceptación de los términos',
    body: (
      <p>
        Al crear una cuenta en Loyia, el negocio (en adelante &quot;el
        Usuario&quot;) acepta expresamente estos Términos de Uso. Si no estás
        de acuerdo con alguno de estos términos, no debes usar la plataforma.
      </p>
    ),
  },
  {
    num: '02',
    title: 'Descripción del servicio',
    body: (
      <p>
        Loyia es una plataforma de programas de fidelización que permite a
        negocios gestionar puntos y recompensas para sus clientes. El servicio
        se presta a través de loyia.vercel.app y sus subdominios.
      </p>
    ),
  },
  {
    num: '03',
    title: 'Planes y pagos',
    body: (
      <p>
        Loyia ofrece un plan gratuito (Free) y planes de pago (Starter y
        Pro). Los planes de pago se facturan mensualmente. En caso de no pago,
        el Usuario tendrá un período de gracia de 5 días hábiles, tras el cual
        la cuenta será degradada automáticamente al plan Free. No se realizan
        reembolsos por períodos no utilizados.
      </p>
    ),
  },
  {
    num: '04',
    title: 'Cambios de precio y funcionalidades',
    body: (
      <p>
        Loyia se reserva el derecho de modificar los precios y
        funcionalidades de los planes con un aviso mínimo de 30 días a través
        de la plataforma o por correo electrónico. El uso continuado del
        servicio tras ese plazo implica aceptación de los cambios.
      </p>
    ),
  },
  {
    num: '05',
    title: 'Usos prohibidos',
    body: (
      <>
        <p className="mb-3">
          El Usuario se compromete a no usar Loyia para:
        </p>
        <ul className="space-y-2">
          {[
            'Actividades ilegales o fraudulentas',
            'Enviar spam o contactar clientes sin su consentimiento',
            'Revender o sublicenciar el acceso a la plataforma',
            'Copiar, replicar o crear productos derivados de Loyia',
            'Ingresar datos falsos o fraudulentos de clientes',
            'Acosar, intimidar o contactar clientes de forma no autorizada',
            'Intentar acceder a cuentas de otros negocios',
            'Automatizar acciones masivas mediante bots o scripts no autorizados',
            'Cualquier uso malicioso o fraudulento de la plataforma',
          ].map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span
                className="mt-[7px] w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: '#c9a84c' }}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    num: '06',
    title: 'Responsabilidad',
    body: (
      <>
        <p className="mb-3">
          Loyia presta el servicio en las condiciones disponibles. No nos
          hacemos responsables por:
        </p>
        <ul className="space-y-2 mb-4">
          {[
            'Interrupciones, caídas o fallas técnicas del servicio',
            'Pérdidas de negocio derivadas del uso o no disponibilidad de la plataforma',
            'Errores cometidos por el Usuario en el uso de la plataforma',
            'Uso indebido de los datos de clientes por parte del negocio',
          ].map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span
                className="mt-[7px] w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: '#c9a84c' }}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p>
          El Usuario es el único responsable del uso que haga de la plataforma
          y de los datos que ingrese en ella.
        </p>
      </>
    ),
  },
  {
    num: '07',
    title: 'Propiedad intelectual',
    body: (
      <p>
        El código, diseño, marca y contenidos de Loyia son propiedad
        exclusiva de Cristóbal Broughton. El Usuario conserva la propiedad de
        su logo, nombre y contenidos propios que suba a la plataforma. Ninguna
        parte de Loyia puede ser copiada, reproducida o utilizada sin
        autorización expresa.
      </p>
    ),
  },
  {
    num: '08',
    title: 'Eliminación de cuenta',
    body: (
      <p>
        El Usuario puede solicitar la eliminación de su cuenta en cualquier
        momento escribiendo a{' '}
        <a
          href="mailto:cristobal.broughton@gmail.com"
          className="text-primary hover:text-primary/80 transition-colors"
        >
          cristobal.broughton@gmail.com
        </a>
        . La eliminación se procesará dentro de los 5 a 10 días hábiles
        siguientes. Los datos del negocio y de sus clientes serán eliminados o
        anonimizados en ese plazo.
      </p>
    ),
  },
  {
    num: '09',
    title: 'Ley aplicable y jurisdicción',
    body: (
      <p>
        Estos términos se rigen por las leyes de la República de Chile.
        Cualquier conflicto será sometido a los Tribunales Ordinarios de
        Justicia de Santiago.
      </p>
    ),
  },
  {
    num: '10',
    title: 'Modificaciones a estos términos',
    body: (
      <p>
        Loyia se reserva el derecho de modificar estos términos con un aviso
        mínimo de 30 días. El uso continuado de la plataforma tras ese plazo
        implica aceptación de los nuevos términos.
      </p>
    ),
  },
]

// ── Componente ────────────────────────────────────────────────────────────────

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-[#0f0f0f]/90 backdrop-blur-sm border-b border-white/[0.06]">
        <div className="max-w-[720px] mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            to="/"
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
            Documento legal
          </p>
          <h1
            className="text-4xl text-white leading-tight mb-4"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Términos de Uso
          </h1>
          <p className="text-white/35 text-sm">
            Última actualización: 27 de abril de 2026
          </p>
        </div>

        {/* Secciones */}
        <div className="space-y-12">
          {SECTIONS.map((s) => (
            <section key={s.num} className="flex gap-6 md:gap-10">
              <div className="shrink-0 w-10 text-right">
                <span
                  className="text-[13px] font-semibold tabular-nums"
                  style={{ color: '#c9a84c', opacity: 0.5 }}
                >
                  {s.num}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h2
                  className="text-white text-[17px] font-semibold mb-3 leading-snug"
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
                >
                  {s.title}
                </h2>
                <div className="text-white/55 text-[15px] leading-relaxed space-y-2">
                  {s.body}
                </div>
              </div>
            </section>
          ))}
        </div>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] py-8">
        <p className="text-center text-white/20 text-xs">
          © 2026 Loyia
        </p>
      </footer>

    </div>
  )
}
