import { useState, useEffect } from 'react'
import { Loader2, Search, Star, X, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { INPUT_CLASS } from '../../lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCLP(amount) {
  return amount.toLocaleString('es-CL')
}

function formatDateShort(iso) {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short',
  })
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Constantes ────────────────────────────────────────────────────────────────

const TX_TYPE_LABEL = { welcome: 'Bienvenida', earn: 'Compra', redeem: 'Canje' }

const TX_TYPE_COLOR = {
  welcome: 'text-primary',
  earn:    'text-emerald-600',
  redeem:  'text-red-500',
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const { user } = useAuth()

  // Business
  const [business, setBusiness]           = useState(null)
  const [loadingBusiness, setLB]          = useState(true)

  // Lista clientes
  const [customers, setCustomers]         = useState([])
  const [spendMap, setSpendMap]           = useState({})
  const [loadingList, setLoadingList]     = useState(false)

  // Búsqueda
  const [search, setSearch]               = useState('')

  // Drawer
  const [drawerCustomer, setDrawerCustomer] = useState(null)
  const [drawerTxs, setDrawerTxs]           = useState([])
  const [loadingDrawer, setLoadingDrawer]   = useState(false)
  const [drawerOpen, setDrawerOpen]         = useState(false)

  // ── Carga business ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('businesses')
      .select('id, name, points_per_clp, welcome_points, slug')
      .eq('owner_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) toast.error('Error cargando datos del negocio')
        else setBusiness(data)
        setLB(false)
      })
  }, [user?.id])

  // ── Carga clientes + totales ────────────────────────────────────────────────

  useEffect(() => {
    if (!business?.id) return
    setLoadingList(true)
    Promise.all([
      supabase
        .from('loyalty_customers')
        .select('id, name, phone, points_balance, visits_count, last_visit_at')
        .eq('business_id', business.id)
        .order('points_balance', { ascending: false }),
      supabase
        .from('transactions')
        .select('customer_id, amount_clp')
        .eq('business_id', business.id)
        .eq('type', 'earn'),
    ]).then(([{ data: custs, error: e1 }, { data: txs, error: e2 }]) => {
      if (e1 || e2) {
        toast.error('Error cargando clientes')
      } else {
        setCustomers(custs ?? [])
        const map = {}
        for (const tx of txs ?? []) {
          map[tx.customer_id] = (map[tx.customer_id] ?? 0) + tx.amount_clp
        }
        setSpendMap(map)
      }
      setLoadingList(false)
    })
  }, [business?.id])

  // ── Drawer ──────────────────────────────────────────────────────────────────

  const handleOpenDrawer = async (customer) => {
    setDrawerCustomer(customer)
    setDrawerTxs([])
    setDrawerOpen(true)
    setLoadingDrawer(true)
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, type, points_delta, amount_clp, created_at')
        .eq('customer_id', customer.id)
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setDrawerTxs(data ?? [])
    } catch (err) {
      toast.error(err.message ?? 'Error cargando historial')
    } finally {
      setLoadingDrawer(false)
    }
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setTimeout(() => { setDrawerCustomer(null); setDrawerTxs([]) }, 300)
  }

  // ── Derivados ───────────────────────────────────────────────────────────────

  const filtered = customers.filter(c => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    return c.name?.toLowerCase().includes(q) || c.phone.includes(q)
  })

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
    <div className="p-8 lg:p-10 max-w-6xl pb-24 md:pb-8">

      {/* Encabezado */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1
            className="text-[26px] font-semibold text-dark tracking-tight"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Clientes
          </h1>
          <p className="text-dark/45 text-sm mt-1">
            {customers.length > 0
              ? `${customers.length} cliente${customers.length !== 1 ? 's' : ''} registrado${customers.length !== 1 ? 's' : ''}`
              : 'Gestiona tu base de clientes'}
          </p>
        </div>
      </div>

      {/* Buscador */}
      <div className="mb-5 relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark/30 pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o teléfono…"
          className={INPUT_CLASS + ' pl-10'}
        />
      </div>

      {/* ── Mobile: lista de cards (< md) ─────────────────────────────────── */}
      <div className="md:hidden">
        {/* Skeleton */}
        {loadingList && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-black/[0.05] px-4 py-3.5 flex items-center justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 bg-dark/[0.07] rounded-full w-2/5 animate-pulse" />
                  <div className="h-2.5 bg-dark/[0.04] rounded-full w-1/3 animate-pulse" />
                </div>
                <div className="h-7 w-16 bg-dark/[0.06] rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loadingList && filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-black/[0.05] py-14 px-6 text-center">
            {search ? (
              <>
                <Search className="w-8 h-8 text-dark/15 mx-auto mb-3" />
                <p className="text-dark/40 text-sm">Sin resultados para &ldquo;{search}&rdquo;</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-primary/[0.08] flex items-center justify-center mx-auto mb-4">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <p className="text-dark font-semibold text-[15px] mb-1.5">Aún no tienes clientes</p>
                <p className="text-dark/45 text-sm leading-relaxed mb-5 max-w-xs mx-auto">
                  Comparte el link de tu programa con tus clientes para que se registren y empiecen a acumular puntos.
                </p>
                {business?.slug && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/c/${business.slug}`)
                      toast.success('Link copiado')
                    }}
                    className="inline-flex items-center gap-2 bg-dark/[0.04] hover:bg-dark/[0.07] border border-black/[0.08] rounded-xl px-4 py-2.5 text-[13px] font-mono text-dark/60 transition-colors"
                  >
                    {window.location.origin}/c/{business.slug}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Cards */}
        {!loadingList && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => handleOpenDrawer(c)}
                className="w-full text-left bg-white rounded-2xl border border-black/[0.05] shadow-sm px-4 py-3.5 flex items-center justify-between gap-3 active:bg-black/[0.02] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-dark leading-tight truncate">
                    {c.name ?? c.phone}
                  </p>
                  <p className="text-[12px] text-dark/40 mt-0.5 truncate">
                    {c.name ? c.phone : null}
                  </p>
                  {c.last_visit_at && (
                    <p className="text-[11px] text-dark/30 mt-1">
                      Última visita {formatDateShort(c.last_visit_at)}
                    </p>
                  )}
                </div>
                <span className="shrink-0 inline-flex items-center gap-1 bg-primary/[0.08] text-primary text-[13px] font-semibold px-2.5 py-1.5 rounded-lg">
                  <Star className="w-3 h-3 fill-primary" />
                  {c.points_balance.toLocaleString('es-CL')}
                </span>
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
                {['Cliente', 'Teléfono', 'Puntos', 'Total gastado', 'Visitas', 'Última visita'].map(col => (
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
                  {[55, 75, 35, 50, 25, 45].map((w, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-3 bg-dark/[0.06] rounded-full animate-pulse" style={{ width: `${w}%` }} />
                    </td>
                  ))}
                </tr>
              ))}

              {!loadingList && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center">
                    {search ? (
                      <>
                        <Search className="w-8 h-8 text-dark/15 mx-auto mb-3" />
                        <p className="text-dark/40 text-sm">Sin resultados para &ldquo;{search}&rdquo;</p>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-primary/[0.08] flex items-center justify-center mx-auto mb-4">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <p className="text-dark font-semibold text-[15px] mb-1.5">Aún no tienes clientes</p>
                        <p className="text-dark/45 text-sm leading-relaxed mb-4 max-w-sm mx-auto">
                          Comparte el link de tu programa con tus clientes para que se registren y empiecen a acumular puntos.
                        </p>
                        {business?.slug && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/c/${business.slug}`)
                              toast.success('Link copiado')
                            }}
                            className="inline-flex items-center gap-2 bg-dark/[0.04] hover:bg-dark/[0.07] border border-black/[0.08] rounded-xl px-4 py-2.5 text-[13px] font-mono text-dark/60 transition-colors"
                          >
                            {window.location.origin}/c/{business.slug}
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              )}

              {!loadingList && filtered.map(c => (
                <tr
                  key={c.id}
                  onClick={() => handleOpenDrawer(c)}
                  className="cursor-pointer hover:bg-black/[0.02] transition-colors border-b border-black/[0.04] last:border-0"
                >
                  <td className="px-5 py-4">
                    <p className="text-[14px] font-semibold text-dark leading-tight">{c.name ?? c.phone}</p>
                    {c.name && <p className="text-[12px] text-dark/35 mt-0.5">{c.phone}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-dark/45">{c.phone}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="inline-flex items-center gap-1 text-primary font-semibold text-[14px]">
                      <Star className="w-3.5 h-3.5 fill-primary" />
                      {c.points_balance.toLocaleString('es-CL')}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-[14px] text-dark font-medium">${formatCLP(spendMap[c.id] ?? 0)}</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-[14px] text-dark/70">{c.visits_count}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-sm text-dark/45 whitespace-nowrap">
                      {c.last_visit_at ? formatDateShort(c.last_visit_at) : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Drawer ── */}

      {/* Backdrop */}
      {drawerCustomer && (
        <div
          onClick={handleCloseDrawer}
          className={[
            'fixed inset-0 bg-black/40 z-40 transition-opacity duration-300',
            drawerOpen ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        />
      )}

      {/* Panel */}
      <div
        className={[
          'fixed top-0 right-0 h-full w-full sm:w-96 bg-white z-50',
          'shadow-2xl flex flex-col transition-transform duration-300 ease-out',
          drawerOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {drawerCustomer && (
          <>
            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-start justify-between flex-shrink-0">
              <div>
                <p className="text-[18px] font-semibold text-dark leading-tight">
                  {drawerCustomer.name ?? drawerCustomer.phone}
                </p>
                {drawerCustomer.name && (
                  <p className="text-sm text-dark/45 mt-0.5">{drawerCustomer.phone}</p>
                )}
              </div>
              <button
                onClick={handleCloseDrawer}
                className="ml-4 mt-0.5 text-dark/35 hover:text-dark transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Badge puntos */}
            <div className="px-6 pb-4 flex-shrink-0">
              <span className="inline-flex items-center gap-1.5 bg-primary/[0.08] text-primary text-[13px] font-semibold px-3 py-1.5 rounded-lg">
                <Star className="w-3.5 h-3.5 fill-primary" />
                {drawerCustomer.points_balance.toLocaleString('es-CL')} pts
              </span>
            </div>

            {/* Divider */}
            <div className="mx-6 h-px bg-black/[0.06] flex-shrink-0" />

            {/* Label historial */}
            <p className="px-6 pt-4 pb-2 text-[11px] font-medium text-dark/35 uppercase tracking-[0.08em] flex-shrink-0">
              Historial de transacciones
            </p>

            {/* Lista transacciones */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {loadingDrawer && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              )}

              {!loadingDrawer && drawerTxs.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-dark/35 text-sm">Sin transacciones aún</p>
                </div>
              )}

              {!loadingDrawer && drawerTxs.map(tx => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-3 border-b border-black/[0.04] last:border-0"
                >
                  {/* Izquierda: tipo + fecha */}
                  <div>
                    <span className={`text-[13px] font-medium ${TX_TYPE_COLOR[tx.type]}`}>
                      {TX_TYPE_LABEL[tx.type]}
                    </span>
                    <p className="text-[12px] text-dark/35 mt-0.5">{formatDate(tx.created_at)}</p>
                  </div>

                  {/* Derecha: puntos + monto */}
                  <div className="text-right">
                    <p className={`text-[13px] font-semibold ${TX_TYPE_COLOR[tx.type]}`}>
                      {tx.type !== 'redeem' && '+'}{tx.points_delta.toLocaleString('es-CL')} pts
                    </p>
                    {tx.type === 'earn' && tx.amount_clp > 0 && (
                      <p className="text-[12px] text-dark/40 mt-0.5">
                        ${formatCLP(tx.amount_clp)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

    </div>
  )
}
