import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Search,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../services/apiErrors'
import { anularVenta } from '../../services/returnService'
import { getSales } from '../../services/salesService'

const PAGE_SIZE = 20
const money = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
})

const saleId = (sale) => sale.id_venta ?? sale.id_operacion ?? sale.id

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('es-PE')
}

// TODO: Las devoluciones parciales permanecen fuera de la interfaz hasta que la API defina un contrato.
export default function Devoluciones() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [page, setPage] = useState(1)
  const [selectedSale, setSelectedSale] = useState(null)
  const [success, setSuccess] = useState('')
  const params = {
    page,
    page_size: PAGE_SIZE,
    sort: '-fecha',
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  }
  const salesQuery = useQuery({
    queryKey: ['ventas', 'anulacion', params],
    queryFn: () => getSales(params),
    placeholderData: keepPreviousData,
  })
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => anularVenta(id, reason),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ventas'] }),
        queryClient.invalidateQueries({ queryKey: ['productos'] }),
        queryClient.invalidateQueries({ queryKey: ['alertas'] }),
        queryClient.invalidateQueries({ queryKey: ['venta', variables.id] }),
      ])
      setSuccess(`La venta #${variables.id} fue anulada completamente.`)
    },
  })
  const sales = salesQuery.data?.data ?? []
  const meta = salesQuery.data?.meta ?? { page, total: 0, total_pages: 1 }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><h1 className="text-2xl font-bold text-slate-800">Anulación de venta completa</h1><p className="mt-1 text-sm text-slate-500">Anula una venta y todos sus productos. No se admiten devoluciones parciales.</p></div>
        <button type="button" onClick={() => salesQuery.refetch()} disabled={salesQuery.isFetching} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={17} className={salesQuery.isFetching ? 'animate-spin' : ''} />Actualizar</button>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-800"><AlertCircle size={21} className="mt-0.5 shrink-0" /><div><p className="font-semibold">Esta acción afecta la venta completa</p><p className="mt-1 text-sm leading-6">La API no permite devolver líneas o cantidades individuales. Para revertir una operación debes anular toda la venta indicando el motivo.</p></div></div>
      {success && <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"><span>{success}</span><button type="button" onClick={() => setSuccess('')} aria-label="Cerrar"><X size={17} /></button></div>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5"><div className="relative max-w-xl"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Buscar venta o cliente..." className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-teal-500" /></div></div>

        {salesQuery.isError ? (
          <div className="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{getErrorMessage(salesQuery.error)}</div>
        ) : salesQuery.isPending ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><LoaderCircle size={20} className="animate-spin" />Cargando ventas...</div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full min-w-190 text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Venta</th><th className="px-5 py-4">Fecha</th><th className="px-5 py-4">Cliente</th><th className="px-5 py-4">Método</th><th className="px-5 py-4">Total</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4"></th></tr></thead><tbody className="divide-y divide-slate-100">
            {sales.map((sale) => { const cancelled = String(sale.estado).toLowerCase() === 'anulada'; return <tr key={saleId(sale)} className="hover:bg-slate-50"><td className="px-5 py-4 font-semibold text-slate-800">#{saleId(sale)}</td><td className="px-5 py-4 text-slate-600">{formatDate(sale.fecha ?? sale.created_at)}</td><td className="px-5 py-4 text-slate-600">{sale.cliente?.nombre ?? sale.nombre_contacto ?? 'Cliente general'}</td><td className="px-5 py-4 capitalize text-slate-600">{sale.metodo_pago ?? '—'}</td><td className="px-5 py-4 font-semibold text-slate-800">{money.format(Number(sale.total ?? 0))}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cancelled ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{sale.estado ?? 'Registrada'}</span></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => setSelectedSale(sale)} disabled={cancelled} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"><RotateCcw size={15} />Anular</button></td></tr> })}
            {sales.length === 0 && <tr><td colSpan="7" className="p-12 text-center text-slate-400">No se encontraron ventas.</td></tr>}
          </tbody></table></div>
        )}

        <div className="flex flex-col justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center"><span>Mostrando {sales.length} de {meta.total} ventas</span><div className="flex items-center gap-2"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={meta.page <= 1 || salesQuery.isFetching} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronLeft size={16} /></button><span>Página {meta.page} de {meta.total_pages}</span><button type="button" onClick={() => setPage((current) => Math.min(meta.total_pages, current + 1))} disabled={meta.page >= meta.total_pages || salesQuery.isFetching} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronRight size={16} /></button></div></div>
      </div>

      {selectedSale && <CancelDialog sale={selectedSale} pending={cancelMutation.isPending} onClose={() => setSelectedSale(null)} onSubmit={(reason) => cancelMutation.mutateAsync({ id: saleId(selectedSale), reason })} />}
    </section>
  )
}

function CancelDialog({ sale, pending, onClose, onSubmit }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const handleSubmit = async (event) => {
    event.preventDefault()
    const normalized = reason.trim()
    if (normalized.length < 3 || normalized.length > 300) {
      setError('El motivo debe tener entre 3 y 300 caracteres')
      return
    }
    try {
      await onSubmit(normalized)
      onClose()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    }
  }
  return <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 p-4"><div className="w-full max-w-lg rounded-2xl bg-white shadow-xl"><div className="flex items-start justify-between border-b border-slate-100 p-5"><div><h2 className="text-lg font-bold text-slate-800">Anular venta completa</h2><p className="mt-1 text-sm text-slate-500">Venta #{saleId(sale)}</p></div><button type="button" onClick={onClose} disabled={pending} aria-label="Cerrar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button></div><form onSubmit={handleSubmit} className="space-y-4 p-5"><div><label className="mb-2 block text-sm font-medium text-slate-700">Motivo de anulación</label><textarea value={reason} onChange={(event) => { setReason(event.target.value); setError('') }} minLength={3} maxLength={300} rows={4} disabled={pending} className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500" /><p className="mt-1 text-xs text-slate-400">{reason.trim().length}/300 caracteres</p></div>{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-3"><button type="button" onClick={onClose} disabled={pending} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancelar</button><button type="submit" disabled={pending} className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending && <LoaderCircle size={17} className="animate-spin" />}Anular venta</button></div></form></div></div>
}

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value.trim()), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}
