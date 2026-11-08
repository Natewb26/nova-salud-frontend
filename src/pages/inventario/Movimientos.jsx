import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react'
import { useState } from 'react'
import { getErrorMessage } from '../../services/apiErrors'
import { getProductos } from '../../services/inventoryService'
import { getMovements } from '../../services/reportService'

const PAGE_SIZE = 20
const filterControlClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500'
const productId = (product) => product.id_producto ?? product.id
const productName = (product) => product.nombre ?? product.name ?? 'Producto'

const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
}

export default function Movimientos() {
  const [filters, setFilters] = useState({ id_producto: '', tipo: '', desde: '', hasta: '' })
  const [page, setPage] = useState(1)
  const productsQuery = useQuery({
    queryKey: ['productos', 'filtro-kardex'],
    queryFn: () => getProductos({ page: 1, page_size: 100, sort: 'nombre' }),
  })
  const params = {
    page,
    page_size: PAGE_SIZE,
    sort: '-fecha',
    ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
  }
  const movementsQuery = useQuery({
    queryKey: ['movimientos', params],
    queryFn: () => getMovements(params),
    placeholderData: keepPreviousData,
  })
  const products = productsQuery.data?.data ?? []
  const movements = movementsQuery.data?.data ?? []
  const meta = movementsQuery.data?.meta ?? { page, total: 0, total_pages: 1 }

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }))
    setPage(1)
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><h1 className="text-2xl font-bold text-slate-800">Kardex de inventario</h1><p className="mt-1 text-sm text-slate-500">Consulta entradas, salidas y ajustes de productos.</p></div>
        <button type="button" onClick={() => movementsQuery.refetch()} disabled={movementsQuery.isFetching} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={17} className={movementsQuery.isFetching ? 'animate-spin' : ''} />Actualizar</button>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 xl:grid-cols-4">
        <Filter label="Producto"><select value={filters.id_producto} onChange={(event) => updateFilter('id_producto', event.target.value)} className={filterControlClass}><option value="">Todos</option>{products.map((product) => <option key={productId(product)} value={productId(product)}>{productName(product)}</option>)}</select></Filter>
        <Filter label="Tipo"><select value={filters.tipo} onChange={(event) => updateFilter('tipo', event.target.value)} className={filterControlClass}><option value="">Todos</option><option value="entrada">Entrada</option><option value="salida">Salida</option><option value="ajuste">Ajuste</option></select></Filter>
        <Filter label="Desde"><input type="date" value={filters.desde} onChange={(event) => updateFilter('desde', event.target.value)} className={filterControlClass} /></Filter>
        <Filter label="Hasta"><input type="date" value={filters.hasta} onChange={(event) => updateFilter('hasta', event.target.value)} className={filterControlClass} /></Filter>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {movementsQuery.isError ? (
          <div className="m-5 flex gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={19} />{getErrorMessage(movementsQuery.error)}</div>
        ) : movementsQuery.isPending ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><LoaderCircle size={20} className="animate-spin" />Cargando movimientos...</div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full min-w-200 text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Fecha</th><th className="px-5 py-4">Producto</th><th className="px-5 py-4">Lote</th><th className="px-5 py-4">Tipo</th><th className="px-5 py-4">Cantidad</th><th className="px-5 py-4">Motivo / referencia</th></tr></thead><tbody className="divide-y divide-slate-100">
            {movements.map((movement, index) => <tr key={movement.id_movimiento ?? index} className="hover:bg-slate-50"><td className="px-5 py-4 text-slate-600">{formatDateTime(movement.fecha ?? movement.created_at)}</td><td className="px-5 py-4 font-semibold text-slate-800">{movement.nombre_producto ?? movement.producto?.nombre ?? `Producto #${movement.id_producto}`}</td><td className="px-5 py-4 text-slate-600">{movement.codigo_lote ?? movement.lote?.codigo_lote ?? movement.id_lote ?? '—'}</td><td className="px-5 py-4"><MovementBadge type={movement.tipo} /></td><td className="px-5 py-4 font-semibold text-slate-700">{movement.cantidad}</td><td className="px-5 py-4 text-slate-600">{movement.motivo ?? movement.referencia ?? '—'}</td></tr>)}
            {movements.length === 0 && <tr><td colSpan="6" className="p-12 text-center text-slate-400"><ClipboardList size={32} className="mx-auto mb-2 text-slate-300" />No se encontraron movimientos.</td></tr>}
          </tbody></table></div>
        )}
        <div className="flex flex-col justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center"><span>Mostrando {movements.length} de {meta.total} movimientos</span><div className="flex items-center gap-2"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={meta.page <= 1 || movementsQuery.isFetching} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronLeft size={16} /></button><span>Página {meta.page} de {meta.total_pages}</span><button type="button" onClick={() => setPage((current) => Math.min(meta.total_pages, current + 1))} disabled={meta.page >= meta.total_pages || movementsQuery.isFetching} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronRight size={16} /></button></div></div>
      </div>
    </section>
  )
}

function Filter({ label, children }) {
  return <div><label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>{children}</div>
}

function MovementBadge({ type }) {
  const normalized = String(type ?? '').toLowerCase()
  const classes = normalized === 'entrada'
    ? 'bg-emerald-50 text-emerald-700'
    : normalized === 'salida'
      ? 'bg-red-50 text-red-700'
      : 'bg-amber-50 text-amber-700'
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${classes}`}>{type ?? 'Ajuste'}</span>
}
