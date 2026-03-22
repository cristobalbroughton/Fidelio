import { useLocation } from 'react-router-dom'

export default function OnboardingPage() {
  const { state } = useLocation()
  const businessName = state?.businessName ?? 'tu negocio'

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary tracking-tight mb-4">Fidelio</h1>
        <h2 className="text-2xl font-semibold text-[#f4f1ea] mb-2">
          ¡Bienvenido, {businessName}!
        </h2>
        <p className="text-[#f4f1ea]/50">Configuración del negocio — próximamente</p>
      </div>
    </div>
  )
}
