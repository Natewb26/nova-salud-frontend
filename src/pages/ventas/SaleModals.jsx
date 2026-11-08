import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, LoaderCircle, ReceiptText, X } from 'lucide-react'
import { getErrorMessage } from '../../services/apiErrors'
import { getSale } from '../../services/salesService'

const money = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
})

const getSaleId = (sale) => sale?.id_venta ?? sale?.id_operacion ?? sale?.id
const itemName = (item) =>
  item.nombre_producto ?? item.producto?.nombre ?? item.nombre ?? `Producto #${item.id_producto}`

const sellerName = (sale) =>
  sale?.vendedor?.nombre ?? sale?.nombre_vendedor ?? sale?.vendedor_nombre ?? '—'

export function SaleReceiptModal({ sale, onClose }) {
  const items = sale.items ?? sale.detalles ?? []

  return (
    <Modal title="Venta registrada" subtitle={`Comprobante #${getSaleId(sale) ?? '—'}`} onClose={onClose}>
      <div className="mb-5 flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-700">
        <ReceiptText size={24} />
        <div>
          <p className="font-semibold">La venta se registró correctamente</p>
          <p className="text-sm">Vendedor: {sellerName(sale)}</p>
        </div>
      </div>
      <ItemsTable items={items} />
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="font-semibold text-slate-600">Total</span>
        <span className="text-xl font-bold text-teal-700">{money.format(Number(sale.total ?? 0))}</span>
      </div>
      <div className="mt-5 flex justify-end">
        <button type="button" onClick={onClose} className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white">Cerrar</button>
      </div>
    </Modal>
  )
}

export function SaleDetailModal({ saleId, isAdmin, onClose, onCancel }) {
  const saleQuery = useQuery({
    queryKey: ['venta', saleId],
    queryFn: () => getSale(saleId),
  })
  const sale = saleQuery.data

  return (
    <Modal title="Detalle de venta" subtitle={`Venta #${saleId}`} onClose={onClose}>
      {saleQuery.isPending ? (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
          <LoaderCircle size={20} className="animate-spin" />
          Cargando detalle...
        </div>
      ) : saleQuery.isError || !sale ? (
        <div className="flex gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={19} />
          {getErrorMessage(saleQuery.error)}
        </div>
      ) : (
        <>
          <div className="mb-5 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Estado" value={sale.estado} />
            <Detail label="Método" value={sale.metodo_pago} />
            <Detail label="Cliente" value={sale.cliente?.nombre ?? sale.nombre_contacto ?? 'Cliente general'} />
            <Detail label="Vendedor" value={sellerName(sale)} />
          </div>
          <ItemsTable items={sale.items ?? sale.detalles ?? []} />
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-xl font-bold text-teal-700">{money.format(Number(sale.total ?? 0))}</p>
            {isAdmin && String(sale.estado).toLowerCase() !== 'anulada' && (
              <button type="button" onClick={() => onCancel(sale)} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">
                Anular
              </button>
            )}
          </div>
          {sale.motivo_anulacion && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              Motivo de anulación: {sale.motivo_anulacion}
            </p>
          )}
        </>
      )}
    </Modal>
  )
}

export function CancelSaleModal({ sale, onClose, onSubmit, pending }) {
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
    <Modal title="Anular venta" subtitle={`Venta #${getSaleId(sale)}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Motivo de anulación</label>
          <textarea
            value={reason}
            onChange={(event) => { setReason(event.target.value); setError('') }}
            disabled={pending}
            minLength={3}
            maxLength={300}
            rows={4}
            className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500"
          />
          <p className="mt-1 text-xs text-slate-400">{reason.trim().length}/300 caracteres</p>
        </div>
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={pending} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancelar</button>
          <button type="submit" disabled={pending} className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {pending && <LoaderCircle size={17} className="animate-spin" />}
            Anular venta
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4">
      <div className="my-auto max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function ItemsTable({ items }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-125 text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Cantidad</th><th className="px-4 py-3">Precio</th><th className="px-4 py-3">Subtotal</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item, index) => {
            const price = Number(item.precio_unitario ?? item.precio ?? 0)
            const subtotal = Number(item.subtotal ?? price * Number(item.cantidad ?? 0))
            return (
              <tr key={item.id_detalle ?? item.id_producto ?? index}>
                <td className="px-4 py-3 font-medium text-slate-800">{itemName(item)}</td>
                <td className="px-4 py-3 text-slate-600">{item.cantidad}</td>
                <td className="px-4 py-3 text-slate-600">{money.format(price)}</td>
                <td className="px-4 py-3 font-medium text-slate-700">{money.format(subtotal)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Detail({ label, value }) {
  return <div><p className="text-xs uppercase text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold capitalize text-slate-700">{value ?? '—'}</p></div>
}
