import { useState, useEffect } from 'react'
import { Loader2, Plus, Gift, Star, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

// ── Constantes ────────────────────────────────────────────────────────────────

const TYPE_LABEL = { product: 'Producto', discount: 'Descuento', experience: 'Experiencia' }

const TYPE_STYLE = {
  product:    'bg-primary/[0.08] text-primary',
  discount:   'bg-emerald-50 text-emerald-700',
  experience: 'bg-purple-50 text-purple-700',
}

const EMPTY_FORM = {
  name: '', description: '', points_required: '', type: 'product', is_active: true,
}

const INPUT_CLASS =
  'w-full border border-black/[0.08] rounded-lg px-4 py-3 text-dark placeholder-dark/25 focus:outline-none focus:border-primary/50 transition-colors bg-white'

const LABEL_CLASS = 'block text-[13px] font-medium text-dark/55 mb-1.5'

// ── Componente ────────────────────────────────────────────────────────────────

export default function RecompensasPage() {
  const { user } = useAuth()

  // Business
  const [business, setBusiness]           = useState(null)
  const [loadingBusiness, setLB]          = useState(true)

  // Lista recompensas
  const [rewards, setRewards]             = useState([])
  const [loadingList, setLoadingList]     = useState(false)

  // Modal
  const [modal, setModal]                 = useState(null)   // null | 'create' | 'edit'
  const [editing, setEditing]             = useState(null)
  const [form, setForm]                   = useState(EMPTY_FORM)
  const [saving, setSaving]               = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)

  // ── Helpers de form ─────────────────────────────────────────────────────────

  const set    = field => e => setForm(f => ({ ...f, [field]: e.target.value }))
  const setNum = field => e => setForm(f => ({ ...f, [field]: e.target.value.replace(/\D/g, '') }))
  const toggle = field => () => setForm(f => ({ ...f, [field]: !f[field] }))

  // ── Carga business ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('businesses')
      .select('id, name')
      .eq('owner_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) toast.error('Error cargando datos del negocio')
        else setBusiness(data)
        setLB(false)
      })
  }, [user?.id])

  // ── Carga recompensas ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!business?.id) return
    setLoadingList(true)
    supabase
      .from('rewards')
      .select('id, name, description, points_required, type, is_active')
      .eq('business_id', business.id)
      .order('points_required', { ascending: true })
      .then(({ data, error }) => {
        if (error) toast.error('Error cargando recompensas')
        else setRewards(data ?? [])
        setLoadingList(false)
      })
  }, [business?.id])

  // ── Handlers modal ──────────────────────────────────────────────────────────

  const handleNewReward = () => {
    setForm(EMPTY_FORM)
    setConfirmDelete(false)
    setEditing(null)
    setModal('create')
  }

  const handleEditReward = (reward) => {
    setForm({
      name: reward.name,
      description: reward.description ?? '',
      points_required: String(reward.points_required),
      type: reward.type,
      is_active: reward.is_active,
    })
    setConfirmDelete(false)
    setEditing(reward)
    setModal('edit')
  }

  const handleCloseModal = () => {
    setModal(null)
    setEditing(null)
    setConfirmDelete(false)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('El nombre es requerido')
    if (!form.points_required) return toast.error('Los puntos son requeridos')

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        points_required: Number(form.points_required),
        type: form.type,
        is_active: form.is_active,
      }

      if (modal === 'create') {
        const { data, error } = await supabase
          .from('rewards')
          .insert({ ...payload, business_id: business.id })
          .select()
          .single()
        if (error) throw error
        setRewards(prev =>
          [...prev, data].sort((a, b) => a.points_required - b.points_required)
        )
        toast.success('Recompensa creada')
      } else {
        const { data, error } = await supabase
          .from('rewards')
          .update(payload)
          .eq('id', editing.id)
          .select()
          .single()
        if (error) throw error
        setRewards(prev =>
          prev.map(r => r.id === editing.id ? data : r)
              .sort((a, b) => a.points_required - b.points_required)
        )
        toast.success('Recompensa actualizada')
      }
      handleCloseModal()
    } catch (err) {
      toast.error(err.message ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', editing.id)
      if (error) throw error
      setRewards(prev => prev.filter(r => r.id !== editing.id))
      toast.success('Recompensa eliminada')
      handleCloseModal()
    } catch (err) {
      toast.error(err.message ?? 'Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (loadingBusiness) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  if (!business) {
    return (
      <div className="p-8">
        <p className="text-dark/40 text-sm">No se encontraron datos del negocio.</p>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 lg:p-10 max-w-4xl pb-24 md:pb-8">

      {/* Encabezado */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1
            className="text-[26px] font-semibold text-dark tracking-tight"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Recompensas
          </h1>
          <p className="text-dark/45 text-sm mt-1">
            {rewards.length > 0
              ? `${rewards.length} recompensa${rewards.length !== 1 ? 's' : ''} configurada${rewards.length !== 1 ? 's' : ''}`
              : 'Configura las recompensas de tu programa'}
          </p>
        </div>
        <button
          onClick={handleNewReward}
          className="flex items-center gap-2 bg-primary text-dark font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva recompensa
        </button>
      </div>

      {/* ── Mobile: cards (< md) ──────────────────────────────────────────── */}
      <div className="md:hidden">
        {loadingList && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-black/[0.05] px-4 py-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="h-3.5 bg-dark/[0.07] rounded-full w-2/5 animate-pulse" />
                  <div className="h-6 w-14 bg-dark/[0.06] rounded-lg animate-pulse" />
                </div>
                <div className="h-2.5 bg-dark/[0.04] rounded-full w-1/3 animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {!loadingList && rewards.length === 0 && (
          <div className="bg-white rounded-2xl border border-black/[0.05] py-16 text-center">
            <Gift className="w-10 h-10 text-dark/15 mx-auto mb-3" />
            <p className="text-dark/40 font-medium text-sm">Sin recompensas aún</p>
            <p className="text-dark/25 text-xs mt-1">Crea tu primera recompensa para que los clientes puedan canjear sus puntos.</p>
          </div>
        )}

        {!loadingList && rewards.length > 0 && (
          <div className="space-y-2">
            {rewards.map(r => (
              <button
                key={r.id}
                onClick={() => handleEditReward(r)}
                className="w-full text-left bg-white rounded-2xl border border-black/[0.05] shadow-sm px-4 py-3.5 active:bg-black/[0.02] transition-colors"
              >
                {/* Fila superior: tipo badge + puntos */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${TYPE_STYLE[r.type]}`}>
                    {TYPE_LABEL[r.type]}
                  </span>
                  <span className="inline-flex items-center gap-1 text-primary font-semibold text-[13px]">
                    <Star className="w-3 h-3 fill-primary" />
                    {r.points_required.toLocaleString('es-CL')} pts
                  </span>
                </div>

                {/* Nombre */}
                <p className="text-[14px] font-semibold text-dark leading-tight truncate">{r.name}</p>

                {/* Descripción */}
                {r.description && (
                  <p className="text-[12px] text-dark/40 mt-0.5 line-clamp-1">{r.description}</p>
                )}

                {/* Estado */}
                <div className="mt-2">
                  <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md ${
                    r.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-dark/[0.05] text-dark/35'
                  }`}>
                    {r.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Desktop: tabla (md+) ────────────────────────────────────────────── */}
      <div className="hidden md:block bg-white rounded-2xl border border-black/[0.05] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/[0.06]">
                {['Recompensa', 'Tipo', 'Puntos', 'Estado'].map(col => (
                  <th
                    key={col}
                    className="px-5 py-3.5 text-left text-[11px] font-medium text-dark/35 uppercase tracking-[0.08em] whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingList && Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-black/[0.04]">
                  {[60, 30, 25, 25].map((w, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-3 bg-dark/[0.06] rounded-full animate-pulse" style={{ width: `${w}%` }} />
                    </td>
                  ))}
                </tr>
              ))}

              {!loadingList && rewards.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center">
                    <Gift className="w-10 h-10 text-dark/15 mx-auto mb-3" />
                    <p className="text-dark/40 font-medium text-sm">Sin recompensas aún</p>
                    <p className="text-dark/25 text-xs mt-1">Crea tu primera recompensa para que los clientes puedan canjear sus puntos.</p>
                  </td>
                </tr>
              )}

              {!loadingList && rewards.map(r => (
                <tr
                  key={r.id}
                  onClick={() => handleEditReward(r)}
                  className="cursor-pointer hover:bg-black/[0.02] transition-colors border-b border-black/[0.04] last:border-0"
                >
                  <td className="px-5 py-4">
                    <p className="text-[14px] font-semibold text-dark leading-tight">{r.name}</p>
                    {r.description && <p className="text-[12px] text-dark/40 mt-0.5 line-clamp-1">{r.description}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center text-[12px] font-medium px-2.5 py-1 rounded-md ${TYPE_STYLE[r.type]}`}>
                      {TYPE_LABEL[r.type]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="inline-flex items-center gap-1 text-primary font-semibold text-[14px]">
                      <Star className="w-3.5 h-3.5 fill-primary" />
                      {r.points_required.toLocaleString('es-CL')}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-flex items-center text-[12px] font-medium px-2.5 py-1 rounded-md ${
                      r.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-dark/[0.05] text-dark/40'
                    }`}>
                      {r.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal ── */}

      {modal && (
        <>
          {/* Backdrop */}
          <div
            onClick={handleCloseModal}
            className="fixed inset-0 bg-black/40 z-40"
          />

          {/* Panel */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-black/[0.06]">
                <h2 className="text-[17px] font-semibold text-dark">
                  {modal === 'create' ? 'Nueva recompensa' : 'Editar recompensa'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-dark/35 hover:text-dark transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <div className="px-6 py-5 space-y-4">

                {/* Nombre */}
                <div>
                  <label className={LABEL_CLASS}>Nombre <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={set('name')}
                    placeholder="ej. Café gratis"
                    className={INPUT_CLASS}
                    autoFocus
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className={LABEL_CLASS}>Descripción <span className="text-dark/30 font-normal">(opcional)</span></label>
                  <textarea
                    value={form.description}
                    onChange={set('description')}
                    placeholder="Descripción de la recompensa..."
                    rows={2}
                    className={INPUT_CLASS + ' resize-none'}
                  />
                </div>

                {/* Puntos y Tipo en dos columnas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Puntos requeridos <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.points_required}
                      onChange={setNum('points_required')}
                      placeholder="500"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Tipo</label>
                    <select
                      value={form.type}
                      onChange={set('type')}
                      className={INPUT_CLASS}
                    >
                      <option value="product">Producto</option>
                      <option value="discount">Descuento</option>
                      <option value="experience">Experiencia</option>
                    </select>
                  </div>
                </div>

                {/* Toggle activo */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-[14px] font-medium text-dark">Activa</p>
                    <p className="text-[12px] text-dark/40">Los clientes pueden ver y canjear esta recompensa</p>
                  </div>
                  <button
                    type="button"
                    onClick={toggle('is_active')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                      form.is_active ? 'bg-primary' : 'bg-dark/20'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      form.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 space-y-3">
                {/* Botón guardar */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-primary text-dark font-semibold py-3 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Guardando…' : (modal === 'create' ? 'Crear recompensa' : 'Guardar cambios')}
                </button>

                {/* Zona de eliminación (solo en modo edición) */}
                {modal === 'edit' && (
                  <div className="pt-1">
                    {!confirmDelete ? (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="w-full text-red-500 hover:text-red-600 text-[13.5px] font-medium transition-colors py-1"
                      >
                        Eliminar recompensa
                      </button>
                    ) : (
                      <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
                        <p className="text-[13px] font-medium text-red-700 mb-3 text-center">
                          ¿Confirmar eliminación?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmDelete(false)}
                            className="flex-1 border border-black/[0.08] text-dark/60 text-[13px] font-medium py-2 rounded-lg hover:bg-black/[0.03] transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="flex-1 bg-red-500 text-white text-[13px] font-semibold py-2 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                          >
                            {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {deleting ? 'Eliminando…' : 'Sí, eliminar'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        </>
      )}

    </div>
  )
}
