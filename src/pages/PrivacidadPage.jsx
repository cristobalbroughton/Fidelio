import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// ── Secciones de la política ──────────────────────────────────────────────────

const SECTIONS = [
  {
    num: '01',
    title: 'Responsable del tratamiento',
    body: (
      <>
        <p>
          Fidelio es operado por Cristóbal Broughton, con domicilio en Chile.
        </p>
        <p>
          Contacto:{' '}
          <a
            href="mailto:cristobal.broughton@gmail.com"
            className="text-primary hover:text-primary/80 transition-colors"
          >
            cristobal.broughton@gmail.com
          </a>
        </p>
      </>
    ),
  },
  {
    num: '02',
    title: '¿A quién aplica esta política?',
    body: (
      <p>
        A los negocios que se registran en Fidelio y a los clientes finales que
        participan en programas de fidelización.
      </p>
    ),
  },
  {
    num: '03',
    title: 'Datos que recopilamos',
    body: (
      <>
        <p className="text-white/50 text-[13px] uppercase tracking-widest font-medium mb-2 mt-1">
          De los negocios
        </p>
        <p>
          Nombre, correo electrónico, logo, configuración del programa de puntos
          y datos de facturación.
        </p>
        <p className="text-white/50 text-[13px] uppercase tracking-widest font-medium mb-2 mt-5">
          De los clientes finales de cada negocio
        </p>
        <p>
          Nombre, número de teléfono, mes de nacimiento (opcional), saldo de
          puntos e historial de transacciones.
        </p>
      </>
    ),
  },
  {
    num: '04',
    title: 'Finalidad del tratamiento',
    body: (
      <p>
        Los datos se usan exclusivamente para operar el programa de
        fidelización. No se utilizarán para finalidades distintas sin informar
        previamente al titular y obtener su consentimiento.
      </p>
    ),
  },
  {
    num: '05',
    title: 'Base de licitud',
    body: (
      <p>
        El tratamiento se realiza en ejecución de la relación contractual con el
        negocio y con el consentimiento del cliente final al registrarse en el
        programa de puntos.
      </p>
    ),
  },
  {
    num: '06',
    title: 'Transferencia de datos a terceros',
    body: (
      <>
        <p>
          Fidelio no vende ni comparte datos personales con terceros con fines
          comerciales. Utilizamos los siguientes proveedores:
        </p>
        <ul className="mt-3 space-y-2">
          {[
            'Supabase Inc. — almacenamiento de base de datos (servidores en EE.UU.)',
            'Sentry — registro de errores técnicos anónimos',
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
    num: '07',
    title: 'Conservación de datos',
    body: (
      <p>
        Los datos se conservan mientras el negocio mantenga una cuenta activa.
        Una vez eliminada la cuenta, los datos serán eliminados o anonimizados
        dentro de los 30 días siguientes.
      </p>
    ),
  },
  {
    num: '08',
    title: 'Seguridad',
    body: (
      <p>
        Fidelio implementa medidas técnicas para proteger los datos personales,
        incluyendo acceso restringido por roles, conexiones cifradas (HTTPS) y
        autenticación segura.
      </p>
    ),
  },
  {
    num: '09',
    title: 'Derechos de los titulares',
    body: (
      <>
        <p>
          Conforme a la Ley N° 19.628 y su modificación mediante Ley N° 21.719,
          tienes derecho a acceder, rectificar, eliminar u oponerte al
          tratamiento de tus datos personales.
        </p>
        <p className="mt-3">
          Para ejercer estos derechos, escríbenos a{' '}
          <a
            href="mailto:cristobal.broughton@gmail.com"
            className="text-primary hover:text-primary/80 transition-colors"
          >
            cristobal.broughton@gmail.com
          </a>{' '}
          indicando tu nombre completo y solicitud. Responderemos en un plazo
          máximo de 10 días hábiles.
        </p>
      </>
    ),
  },
  {
    num: '10',
    title: 'Ley aplicable',
    body: (
      <p>
        Esta política se rige por la Ley N° 19.628 y su actualización mediante
        Ley N° 21.719, vigentes en Chile.
      </p>
    ),
  },
  {
    num: '11',
    title: 'Modificaciones',
    body: (
      <p>
        Fidelio se reserva el derecho de actualizar esta política. Los cambios
        serán notificados a través de la plataforma con al menos 10 días de
        anticipación.
      </p>
    ),
  },
]

// ── Componente ────────────────────────────────────────────────────────────────

export default function PrivacidadPage() {
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
            Fidelio
          </span>
          <div className="w-16" /> {/* spacer */}
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
            Política de Privacidad
          </h1>
          <p className="text-white/35 text-sm">
            Última actualización: 27 de abril de 2026
          </p>
        </div>

        {/* Secciones */}
        <div className="space-y-12">
          {SECTIONS.map((s) => (
            <section key={s.num} className="flex gap-6 md:gap-10">
              {/* Número */}
              <div className="shrink-0 w-10 text-right">
                <span
                  className="text-[13px] font-semibold tabular-nums"
                  style={{ color: '#c9a84c', opacity: 0.5 }}
                >
                  {s.num}
                </span>
              </div>

              {/* Texto */}
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
          © 2026 Fidelio
        </p>
      </footer>

    </div>
  )
}
