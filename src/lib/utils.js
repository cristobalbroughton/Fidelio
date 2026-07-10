export function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('569')) return `+${digits}`
  if (digits.startsWith('9') && digits.length === 9) return `+56${digits}`
  return `+${digits}`
}

// Celular chileno: 9 dígitos empezando con 9, con o sin prefijo 56
export function isValidChileanMobile(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '')
  return /^(56)?9\d{8}$/.test(digits)
}

// ── Contraste / theming dinámico ─────────────────────────────────────────────

const HEX_RE = /^#?[0-9a-fA-F]{6}$/

function sanitizeHex(hex) {
  if (typeof hex !== 'string' || !HEX_RE.test(hex.trim())) return '#c9a84c'
  const h = hex.trim()
  return h.startsWith('#') ? h : `#${h}`
}

export function relativeLuminance(hex) {
  const h = sanitizeHex(hex)
  const [r, g, b] = [1, 3, 5]
    .map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Color de texto legible sobre un fondo del color dado
export function accentTextColor(hex) {
  return relativeLuminance(hex) > 0.35 ? '#0f0f0f' : '#ffffff'
}

function mixWithWhite(hex, amount) {
  const h = sanitizeHex(hex)
  const mix = (i) => {
    const c = parseInt(h.slice(i, i + 2), 16)
    return Math.round(c + (255 - c) * amount).toString(16).padStart(2, '0')
  }
  return `#${mix(1)}${mix(3)}${mix(5)}`
}

// Aclara el accent hasta que sea legible como texto sobre fondo oscuro (#0f0f0f)
export function readableOnDark(hex) {
  let c = sanitizeHex(hex)
  for (let i = 0; i < 6 && relativeLuminance(c) < 0.25; i++) {
    c = mixWithWhite(c, 0.3)
  }
  return c
}

export const fmtCLP = (n) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(n ?? 0)

export const fmtDate = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export const INPUT_CLASS =
  'w-full border border-black/[0.08] rounded-lg px-4 py-3 text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary transition-colors bg-white'

export const LABEL_CLASS = 'block text-[13px] font-medium text-dark/55 mb-1.5'
