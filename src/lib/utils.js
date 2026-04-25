export function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('569')) return `+${digits}`
  if (digits.startsWith('9') && digits.length === 9) return `+56${digits}`
  return `+${digits}`
}

export const INPUT_CLASS =
  'w-full border border-black/[0.08] rounded-lg px-4 py-3 text-dark placeholder-dark/25 focus:outline-none focus:border-primary/50 transition-colors bg-white'

export const LABEL_CLASS = 'block text-[13px] font-medium text-dark/55 mb-1.5'
