import { useEffect } from 'react'

// Accesibilidad básica para modales/drawers/popovers:
// - Cierra con Escape
// - Devuelve el foco al elemento que abrió el modal al cerrarse
// El panel debe llevar role="dialog" aria-modal="true" y un aria-label.
export function useModalA11y(open, onClose) {
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (prev && typeof prev.focus === 'function') prev.focus()
    }
  }, [open, onClose])
}
