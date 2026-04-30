import { useState, useEffect, useRef } from 'react'
import { Loader2, Image as ImageIcon, Lock, Eye, EyeOff, UserPlus, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import bcrypt from 'bcryptjs'
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

  // Sección 3 — Equipo (Pro only)
  const [members, setMembers]         = useState([])
  const [loadingMembers, setLM]       = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newName, setNewName]         = useState('')
  const [newPin, setNewPin]           = useState('')
  const [showPin, setShowPin]         = useState(false)
  const [savingMember, setSavingMember] = useState(false)
  const [pinError, setPinError]       = useState('')

  // ── Carga inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('businesses')
      .select('id, name, category, description, slug, logo_url, program_name, points_per_clp, welcome_points, primary_color, plan')
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

  // ── Equipo handlers ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!business?.id || business.plan !== 'pro') return
    setLM(true)
    supabase
      .from('team_members')
      .select('id, name, is_active, created_at')
      .eq('business_id', business.id)
      .order('created_at')
      .then(({ data }) => { setMembers(data ?? []); setLM(false) })
  }, [business?.id, business?.plan])

  const handleToggleMember = async (id, isActive) => {
    const { error } = await supabase
      .from('team_members')
      .update({ is_active: isActive })
      .eq('id', id)
    if (error) { toast.error('Error actualizando cajero'); return }
    setMembers(ms => ms.map(m => m.id === id ? { ...m, is_active: isActive } : m))
  }

  const handleAddMember = async () => {
    if (!newName.trim()) { toast.error('El nombre es requerido'); return }
    if (!/^\d{6}$/.test(newPin)) { setPinError('El PIN debe tener exactamente 6 dígitos numéricos'); return }
    setPinError('')
    setSavingMember(true)
    try {
      const { data: activeWithHash } = await supabase
        .from('team_members')
        .select('pin_hash')
        .eq('business_id', business.id)
        .eq('is_active', true)
      for (const m of (activeWithHash ?? [])) {
        if (await bcrypt.compare(newPin, m.pin_hash)) {
          setPinError('Este PIN ya está en uso por otro cajero')
          return
        }
      }

      const pin_hash = await bcrypt.hash(newPin, 10)
      const { error } = await supabase
        .from('team_members')
        .insert({ business_id: business.id, name: newName.trim(), pin_hash })
      if (error) throw error

      const { data: updated } = await supabase
        .from('team_members')
        .select('id, name, is_active, created_at')
        .eq('business_id', business.id)
        .order('created_at')
      setMembers(updated ?? [])
      setShowAddModal(false)
      setNewName('')
      setNewPin('')
      toast.success('Cajero creado')
    } catch (err) {
      toast.error(err.message ?? 'Error al crear cajero')
    } finally {
      setSavingMember(false)
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
              {business.plan === 'free' ? (
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold bg-amber-50 border border-amber-200 text-amber-700 mb-2">
                    <Lock className="w-3 h-3" />
                    Disponible en Starter
                  </div>
                  <p className="text-[11px] text-dark/35 leading-relaxed">
                    Sube a Starter para mostrar tu logo en la mini-webapp.
                  </p>
                </div>
              ) : (
                <>
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
                </>
              )}
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

      {/* ── Sección 3 — Equipo (Pro only) ──────────────────────────────── */}
      {business.plan === 'pro' && (
        <div className="mt-6 bg-white rounded-2xl border border-black/[0.05] shadow-sm p-6 space-y-5">

          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-dark">Equipo</h2>
              <p className="text-[13px] text-dark/40 mt-0.5">Gestiona los cajeros de tu negocio.</p>
            </div>
            <button
              onClick={() => { setNewName(''); setNewPin(''); setPinError(''); setShowPin(false); setShowAddModal(true) }}
              className="flex items-center gap-1.5 text-[13px] font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Agregar cajero
            </button>
          </div>

          <div className="h-px bg-black/[0.05]" />

          {loadingMembers && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          )}

          {!loadingMembers && members.length === 0 && (
            <p className="text-[13px] text-dark/35 py-2">
              No hay cajeros aún. Agrega uno para que puedan registrar compras.
            </p>
          )}

          {!loadingMembers && members.length > 0 && (
            <div className="space-y-2">
              {members.map(m => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 py-3 px-4 rounded-xl bg-dark/[0.02] border border-black/[0.04]"
                >
                  <div className="min-w-0">
                    <p className={`text-[14px] font-medium ${m.is_active ? 'text-dark' : 'text-dark/35'}`}>
                      {m.name}
                    </p>
                    <p className="text-[11px] text-dark/30 mt-0.5">
                      Desde {format(parseISO(m.created_at), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleMember(m.id, !m.is_active)}
                    title={m.is_active ? 'Desactivar' : 'Activar'}
                    className={[
                      'relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 flex-none',
                      m.is_active ? 'bg-primary' : 'bg-dark/15',
                    ].join(' ')}
                  >
                    <span className={[
                      'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200',
                      m.is_active ? 'left-[18px]' : 'left-0.5',
                    ].join(' ')} />
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ── Modal: Agregar cajero ───────────────────────────────────────── */}
      {showAddModal && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => !savingMember && setShowAddModal(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">

              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-semibold text-dark">Agregar cajero</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  disabled={savingMember}
                  className="text-dark/35 hover:text-dark transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className={LABEL_CLASS}>Nombre <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ej: Juan"
                  className={INPUT_CLASS}
                  autoFocus
                />
              </div>

              <div>
                <label className={LABEL_CLASS}>PIN de 6 dígitos <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={newPin}
                    onChange={e => {
                      setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                      setPinError('')
                    }}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    className={INPUT_CLASS + ' pr-11 tracking-[0.4em]'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark/35 hover:text-dark transition-colors"
                  >
                    {showPin
                      ? <EyeOff className="w-4 h-4" />
                      : <Eye className="w-4 h-4" />
                    }
                  </button>
                </div>
                {pinError && (
                  <p className="text-[12px] text-red-500 mt-1.5">{pinError}</p>
                )}
              </div>

              <div className="space-y-2 pt-1">
                <button
                  onClick={handleAddMember}
                  disabled={savingMember || !newName.trim() || newPin.length !== 6}
                  className={BTN_PRIMARY}
                >
                  {savingMember && <Loader2 className="w-4 h-4 animate-spin" />}
                  Crear cajero
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  disabled={savingMember}
                  className="w-full text-center text-[13px] text-dark/35 hover:text-dark/60 transition-colors py-1"
                >
                  Cancelar
                </button>
              </div>

            </div>
          </div>
        </>
      )}

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
