import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, LoaderCircle, X } from 'lucide-react'
import { getErrorMessage } from '../../services/apiErrors'
import { getPurchase } from '../../services/purchaseService'

const money = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
})

const purchaseId = (purchase) =>
  purchase?.id_compra ?? purchase?.id_operacion ?? purchase?.id

const productName = (item) =>
  item.nombre_producto ?? item.producto?.nombre ?? item.nombre ??
  `Producto #${item.id_producto}`

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('es-PE')
}

export function PurchaseDetailModal({ purchaseId: id, onClose, onCancel }) {
  const purchaseQuery = useQuery({
    queryKey: ['compra', id],
    queryFn: () => getPurchase(id),
  })
  const purchase = purchaseQuery.data

  return (
    <Modal title="Detalle de compra" subtitle={`Compra #${id}`} onClose={onClose}>
      {purchaseQuery.isPending ? (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
          <LoaderCircle size={20} className="animate-spin" />
          Cargando detalle...
        </div>
      ) : purchaseQuery.isError || !purchase ? (
        <div className="flex gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={19} />
          {getErrorMessage(purchaseQuery.error)}
        </div>
      ) : (
        <>
          <div className="mb-5 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Estado" value={purchase.estado} />
            <Detail label="Proveedor" value={purchase.proveedor?.nombre ?? purchase.nombre_contacto} />
            <Detail label="Método" value={purchase.metodo_pago ?? 'No registrado'} />
            <Detail label="Total" value={money.format(Number(purchase.total ?? 0))} />
          </div>
          <LotsTable purchase={purchase} />
          <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
            {String(purchase.estado).toLowerCase() !== 'anulada' && (
              <button type="button" onClick={() => onCancel(purchase)} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">
                Anular compra
              </button>
            )}
          </div>
          {purchase.motivo_anulacion && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              Motivo de anulación: {purchase.motivo_anulacion}
            </p>
          )}
        </>
      )}
    </Modal>
  )
}

export function CancelPurchaseModal({ purchase, pending, onClose, onSubmit }) {
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

  return (
    <Modal title="Anular compra" subtitle={`Compra #${purchaseId(purchase)}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Motivo de anulación</label>
          <textarea value={reason} onChange={(event) => { setReason(event.target.value); setError('') }} minLength={3} maxLength={300} rows={4} disabled={pending} className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500" />
          <p className="mt-1 text-xs text-slate-400">{reason.trim().length}/300 caracteres</p>
        </div>
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={pending} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancelar</button>
          <button type="submit" disabled={pending} className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {pending && <LoaderCircle size={17} className="animate-spin" />}
            Anular compra
          </button>
        </div>
      </form>
    </Modal>
  )
}

function LotsTable({ purchase }) {
  const rows = purchase.lotes?.length ? purchase.lotes : (purchase.items ?? [])
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-175 text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Lote</th><th className="px-4 py-3">Vencimiento</th><th className="px-4 py-3">Cantidad</th><th className="px-4 py-3">Precio</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => {
            const lot = row.lote ?? row
            return (
              <tr key={lot.id_lote ?? `${row.id_producto}-${lot.codigo_lote}-${index}`}>
                <td className="px-4 py-3 font-medium text-slate-800">{productName(row)}</td>
                <td className="px-4 py-3 text-slate-600">{lot.codigo_lote ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(lot.fecha_vencimiento)}</td>
                <td className="px-4 py-3 text-slate-600">{row.cantidad ?? lot.cantidad}</td>
                <td className="px-4 py-3 text-slate-600">{money.format(Number(row.precio_unitario ?? 0))}</td>
              </tr>
            )
          })}
          {rows.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-slate-400">No hay lotes registrados.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4">
      <div className="my-auto max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div><h2 className="text-lg font-bold text-slate-800">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function Detail({ label, value }) {
  return <div><p className="text-xs uppercase text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold capitalize text-slate-700">{value ?? '—'}</p></div>
}
