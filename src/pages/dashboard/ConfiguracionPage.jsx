import { useState, useEffect, useRef } from 'react'
import { Loader2, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { INPUT_CLASS, LABEL_CLASS } from '../../lib/utils'

// ── Tokens ────────────────────────────────────────────────────────────────────

const BTN_PRIMARY =
  'w-full bg-primary text-[#0f0f0f] font-semibold py-3 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2'

const CATEGORIES = [
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'cafeteria',   label: 'Cafetería'   },
  { value: 'peluqueria',  label: 'Peluquería'  },
  { value: 'tienda',      label: 'Tienda'       },
  { value: 'otro',        label: 'Otro'         },
]

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// ── Component ─────────────────────────────────────────────────────────────────

export default function ConfiguracionPage() {
  const { user } = useAuth()

  const [business, setBusiness]       = useState(null)
  const [loading, setLoading]         = useState(true)

  // Sección 1 — Tu negocio
  const [s1, setS1]                   = useState({ name: '', category: '', description: '', slug: '' })
  const [logoFile, setLogoFile]       = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [savingS1, setSavingS1]       = useState(false)

  // Sección 2 — Programa de puntos
  const [s2, setS2]                   = useState({ program_name: '', points_per_clp: '', welcome_points: '', primary_color: '#c9a84c' })
  const [savingS2, setSavingS2]       = useState(false)

  // ── Carga inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('businesses')
      .select('id, name, category, description, slug, logo_url, program_name, points_per_clp, welcome_points, primary_color')
      .eq('owner_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) { toast.error('Error cargando configuración'); return }
        setBusiness(data)
        setS1({
          name:        data.name        ?? '',
          category:    data.category    ?? '',
          description: data.description ?? '',
          slug:        data.slug        ?? '',
        })
        setS2({
          program_name:  data.program_name  ?? '',
          points_per_clp: String(data.points_per_clp ?? ''),
          welcome_points: String(data.welcome_points ?? ''),
          primary_color:  data.primary_color ?? '#c9a84c',
        })
        setLogoPreview(data.logo_url ?? null)
        setLoading(false)
      })
  }, [user?.id])

  // ── handleSaveS1 ──────────────────────────────────────────────────────────

  const handleSaveS1 = async () => {
    if (!s1.name.trim()) { toast.error('El nombre es requerido'); return }
    if (!s1.slug.trim()) { toast.error('El slug es requerido'); return }
    if (!SLUG_RE.test(s1.slug)) {
      toast.error('El slug solo puede tener minúsculas, números y guiones')
      return
    }

    setSavingS1(true)
    try {
      const { data: existing } = await supabase
        .from('businesses')
        .select('id')
        .eq('slug', s1.slug)
        .neq('id', business.id)
        .maybeSingle()
      if (existing) { toast.error('Este slug ya está en uso'); return }

      let logo_url = business.logo_url ?? null
      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        const path = `${business.id}/logo.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('logos')
          .upload(path, logoFile, { upsert: true })
        if (uploadErr) throw uploadErr
        const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
        logo_url = `${urlData.publicUrl}?t=${Date.now()}`
      }

      const { error } = await supabase
        .from('businesses')
        .update({
          name:        s1.name.trim(),
          category:    s1.category,
          description: s1.description.trim() || null,
          slug:        s1.slug.trim(),
          logo_url,
        })
        .eq('id', business.id)
      if (error) throw error

      setBusiness(b => ({ ...b, ...s1, logo_url }))
      setLogoFile(null)
      if (logo_url) setLogoPreview(logo_url)
      toast.success('Cambios guardados')
    } catch (err) {
      toast.error(err.message ?? 'Error al guardar')
    } finally {
      setSavingS1(false)
    }
  }

  // ── handleSaveS2 ──────────────────────────────────────────────────────────

  const handleSaveS2 = async () => {
    if (!s2.program_name.trim()) { toast.error('El nombre del programa es requerido'); return }
    const ppc = Number(s2.points_per_clp)
    const wp  = Number(s2.welcome_points)
    if (!ppc || ppc < 1) { toast.error('La tasa de puntos debe ser mayor a 0'); return }

    setSavingS2(true)
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          program_name:   s2.program_name.trim(),
          points_per_clp: ppc,
          welcome_points: wp,
          primary_color:  s2.primary_color,
        })
        .eq('id', business.id)
      if (error) throw error
      setBusiness(b => ({ ...b, program_name: s2.program_name, points_per_clp: ppc, welcome_points: wp, primary_color: s2.primary_color }))
      toast.success('Cambios guardados')
    } catch (err) {
      toast.error(err.message ?? 'Error al guardar')
    } finally {
      setSavingS2(false)
    }
  }

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-8 lg:p-10 flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  if (!business) {
    return (
      <div className="p-8 lg:p-10">
        <p className="text-dark/40 text-sm">No se encontró un negocio asociado a tu cuenta.</p>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 lg:p-10 max-w-5xl pb-24 md:pb-8">

      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-[26px] font-semibold text-dark tracking-tight"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
        >
          Configuración
        </h1>
        <p className="text-dark/45 text-sm mt-1">
          Gestiona los datos de tu negocio y programa de puntos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

      {/* ── Sección 1 — Tu negocio ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-black/[0.05] shadow-sm p-6 space-y-5">

        <div>
          <h2 className="text-[15px] font-semibold text-dark">Tu negocio</h2>
          <p className="text-[13px] text-dark/40 mt-0.5">Información pública visible en tu mini-webapp.</p>
        </div>

        <div className="h-px bg-black/[0.05]" />

        {/* Logo */}
        <div>
          <p className={LABEL_CLASS}>Logo</p>
          <div className="flex items-start gap-4">

            {/* Preview contextual — mini-webapp */}
            <div className="shrink-0 rounded-2xl overflow-hidden bg-[#0f0f0f] flex flex-col items-center justify-center px-5 py-4 gap-2 w-[120px]">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo"
                  className="w-16 h-16 rounded-full object-cover border-2"
                  style={{ borderColor: `${s2.primary_color}40` }}
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full bg-white/[0.06] border-2 border-dashed flex items-center justify-center"
                  style={{ borderColor: `${s2.primary_color}40` }}
                >
                  <ImageIcon className="w-6 h-6 text-white/20" />
                </div>
              )}
              <p
                className="text-[13px] font-semibold leading-snug text-center truncate w-full"
                style={{ fontFamily: 'var(--font-display)', color: s2.primary_color }}
              >
                {s1.name || 'Tu negocio'}
              </p>
            </div>

            {/* Upload controls */}
            <div className="pt-1">
              <label className="cursor-pointer text-[13px] font-medium text-primary hover:text-primary/80 transition-colors">
                {logoPreview ? 'Cambiar logo' : 'Subir logo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setLogoFile(file)
                    setLogoPreview(URL.createObjectURL(file))
                  }}
                />
              </label>
              <p className="text-[11px] text-dark/35 mt-1">PNG, JPG o WebP. Máx 2 MB.</p>
              <p className="text-[11px] text-dark/30 mt-2 leading-relaxed">
                Preview real de cómo se verá en la mini-webapp del cliente.
              </p>
            </div>

          </div>
        </div>

        {/* Nombre */}
        <div>
          <label className={LABEL_CLASS}>
            Nombre del negocio <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={s1.name}
            onChange={e => setS1(f => ({ ...f, name: e.target.value }))}
            placeholder="Ej: Castella Pastelería"
            className={INPUT_CLASS}
          />
        </div>

        {/* Categoría */}
        <div>
          <label className={LABEL_CLASS}>Categoría</label>
          <select
            value={s1.category}
            onChange={e => setS1(f => ({ ...f, category: e.target.value }))}
            className={INPUT_CLASS}
          >
            <option value="">Seleccionar categoría</option>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Descripción */}
        <div>
          <label className={LABEL_CLASS}>
            Descripción <span className="text-dark/25 font-normal">(opcional)</span>
          </label>
          <textarea
            value={s1.description}
            onChange={e => setS1(f => ({ ...f, description: e.target.value }))}
            placeholder="Describe brevemente tu negocio..."
            rows={3}
            className={INPUT_CLASS + ' resize-none'}
          />
        </div>

        {/* Slug */}
        <div>
          <label className={LABEL_CLASS}>
            Slug de la URL <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={s1.slug}
            onChange={e => setS1(f => ({ ...f, slug: e.target.value.toLowerCase() }))}
            placeholder="mi-negocio"
            className={INPUT_CLASS + ' font-mono text-[13px]'}
          />
          <p className="text-[12px] text-dark/40 mt-1.5">
            URL:{' '}
            <span className="text-dark/60 font-medium">
              fidelio.cl/c/<span className="text-primary">{s1.slug || '...'}</span>
            </span>
          </p>
        </div>

        <button onClick={handleSaveS1} disabled={savingS1} className={BTN_PRIMARY}>
          {savingS1 && <Loader2 className="w-4 h-4 animate-spin" />}
          Guardar cambios
        </button>
      </div>

      {/* ── Sección 2 — Programa de puntos ────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-black/[0.05] shadow-sm p-6 space-y-5">

        <div>
          <h2 className="text-[15px] font-semibold text-dark">Programa de puntos</h2>
          <p className="text-[13px] text-dark/40 mt-0.5">Configura cómo se acumulan y premian los puntos.</p>
        </div>

        <div className="h-px bg-black/[0.05]" />

        {/* Nombre del programa */}
        <div>
          <label className={LABEL_CLASS}>
            Nombre del programa <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={s2.program_name}
            onChange={e => setS2(f => ({ ...f, program_name: e.target.value }))}
            placeholder="Ej: Club Castella"
            className={INPUT_CLASS}
          />
        </div>

        {/* Tasa de puntos */}
        <div>
          <label className={LABEL_CLASS}>
            Tasa de puntos <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={s2.points_per_clp}
            onChange={e => setS2(f => ({ ...f, points_per_clp: e.target.value.replace(/\D/g, '') }))}
            placeholder="Ej: 500"
            className={INPUT_CLASS}
          />
          {Number(s2.points_per_clp) > 0 && (
            <p className="text-[12px] text-dark/40 mt-1.5">
              Cada{' '}
              <span className="text-primary font-medium">
                ${Number(s2.points_per_clp).toLocaleString('es-CL')} CLP
              </span>{' '}
              = 1 punto
            </p>
          )}
        </div>

        {/* Puntos de bienvenida */}
        <div>
          <label className={LABEL_CLASS}>Puntos de bienvenida</label>
          <input
            type="text"
            inputMode="numeric"
            value={s2.welcome_points}
            onChange={e => setS2(f => ({ ...f, welcome_points: e.target.value.replace(/\D/g, '') }))}
            placeholder="Ej: 100"
            className={INPUT_CLASS}
          />
          <p className="text-[12px] text-dark/40 mt-1.5">
            Puntos acreditados al registrar un cliente nuevo.
          </p>
        </div>

        {/* Color principal */}
        <div>
          <label className={LABEL_CLASS}>Color principal</label>
          <div className="flex items-center gap-3">
            <ColorPicker
              value={s2.primary_color}
              onChange={color => setS2(f => ({ ...f, primary_color: color }))}
            />
            <div className="flex items-center gap-2.5 flex-wrap">
              <div
                className="px-4 py-2 rounded-lg text-[13px] font-semibold"
                style={{ background: s2.primary_color, color: '#0f0f0f' }}
              >
                Canjear recompensa
              </div>
              <span className="text-[11px] text-dark/35">Preview mini-webapp</span>
            </div>
          </div>
          <p className="text-[12px] text-dark/35 mt-1.5 tabular-nums font-mono">{s2.primary_color}</p>
        </div>

        <button onClick={handleSaveS2} disabled={savingS2} className={BTN_PRIMARY}>
          {savingS2 && <Loader2 className="w-4 h-4 animate-spin" />}
          Guardar cambios
        </button>
      </div>

      </div>{/* end grid */}

    </div>
  )
}

// ── ColorPicker ───────────────────────────────────────────────────────────────

const PALETTE = [
  '#c9a84c', '#d97706', '#b45309', '#f59e0b',
  '#ef4444', '#e11d48', '#f97316', '#dc2626',
  '#10b981', '#059669', '#16a34a', '#22c55e',
  '#3b82f6', '#0891b2', '#6366f1', '#8b5cf6',
  '#a855f7', '#ec4899', '#db2777', '#1f2937',
]

function ColorPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [hex, setHex] = useState(value)
  const containerRef = useRef(null)

  useEffect(() => { setHex(value) }, [value])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleHexChange = (val) => {
    setHex(val)
    if (/^#[0-9a-fA-F]{6}$/.test(val)) onChange(val)
  }

  const handleSelect = (color) => {
    setHex(color)
    onChange(color)
    setOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Swatch button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-10 h-10 rounded-xl border-2 border-white shadow-md ring-1 ring-black/[0.08] transition-transform hover:scale-105 shrink-0"
        style={{ background: value }}
        title="Cambiar color"
      />

      {/* Popover */}
      {open && (
        <div className="absolute left-0 top-12 z-20 bg-white rounded-2xl shadow-2xl border border-black/[0.06] p-4 w-[220px]">
          {/* Color grid — 4 cols × 5 rows */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {PALETTE.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => handleSelect(color)}
                className="w-11 h-11 rounded-xl transition-transform hover:scale-110 shrink-0"
                style={{
                  background: color,
                  outline: color === value ? `3px solid ${color}` : 'none',
                  outlineOffset: '2px',
                  boxShadow: color === value ? '0 0 0 2px white' : '0 1px 3px rgba(0,0,0,0.15)',
                }}
                title={color}
              />
            ))}
          </div>

          {/* Hex input */}
          <div className="flex items-center gap-2 bg-dark/[0.04] border border-black/[0.06] rounded-lg px-3 py-2">
            <div
              className="w-4 h-4 rounded-md shrink-0 border border-black/[0.08]"
              style={{ background: /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#ccc' }}
            />
            <input
              type="text"
              value={hex}
              onChange={e => handleHexChange(e.target.value)}
              placeholder="#c9a84c"
              maxLength={7}
              className="flex-1 text-[13px] text-dark font-mono bg-transparent outline-none placeholder-dark/25"
            />
          </div>
        </div>
      )}
    </div>
  )
}
