import { AlertTriangle } from 'lucide-react'

// Estado de error visible con acción de reintento — usar cuando falla la carga
// de datos en vez de dejar skeletons infinitos o secciones vacías.
export default function ErrorState({ onRetry, message = 'No pudimos cargar los datos' }) {
  return (
    <div className="text-center py-10 px-4" role="alert">
      <AlertTriangle className="w-8 h-8 text-dark/30 mx-auto mb-3" aria-hidden />
      <p className="text-sm text-dark/60 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-semibold text-dark bg-primary/15 hover:bg-primary/25 px-4 py-2.5 rounded-lg transition-colors"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
