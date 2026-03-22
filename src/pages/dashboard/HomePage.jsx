import { Users, TrendingUp, Gift, Eye } from 'lucide-react'

const METRICS = [
  { label: 'Total clientes',    value: 0, icon: Users       },
  { label: 'Puntos este mes',   value: 0, icon: TrendingUp   },
  { label: 'Canjes realizados', value: 0, icon: Gift         },
  { label: 'Visitas este mes',  value: 0, icon: Eye          },
]

export default function HomePage() {
  return (
    <div className="p-8 lg:p-10 max-w-6xl">

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-[26px] font-semibold text-dark tracking-tight leading-snug">
          Bienvenido a Fidelio ⭐
        </h1>
        <p className="text-dark/45 text-sm mt-1.5">
          Resumen de tu programa de fidelización.
        </p>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {METRICS.map(({ label, value, icon: Icon }, i) => (
          <div
            key={label}
            className="bg-white rounded-2xl p-6 border border-black/[0.05] shadow-sm hover:shadow-md transition-shadow duration-200"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {/* Label + icon */}
            <div className="flex items-start justify-between gap-3 mb-6">
              <span className="text-[13px] font-medium text-dark/55 leading-snug">
                {label}
              </span>
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/[0.08] shrink-0">
                <Icon className="w-[15px] h-[15px] text-primary" strokeWidth={1.9} />
              </span>
            </div>

            {/* Value */}
            <p
              className="text-[52px] leading-none text-primary tabular-nums"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
            >
              {value.toLocaleString('es-CL')}
            </p>
          </div>
        ))}
      </div>

    </div>
  )
}
