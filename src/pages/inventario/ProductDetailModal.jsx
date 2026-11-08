import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Loader2, Pencil, SlidersHorizontal, X } from 'lucide-react'
import { getProducto, getLotes } from '../../services/inventoryService'
import { getErrorMessage } from '../../services/apiErrors'

const formatMoney = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
})

const formatDate = (value) => {
  if (!value) return '—'
  const [year, month, day] = value.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

const categoryName = (product) =>
  product?.categoria?.nombre ??
  product?.nombre_categoria ??
  product?.categoria ??
  '—'

export default function ProductDetailModal({
  productId,
  isAdmin,
  onClose,
  onEdit,
  onDisable,
  onAdjustLot,
  disabling,
}) {
  const productQuery = useQuery({
    queryKey: ['producto', productId],
    queryFn: () => getProducto(productId),
  })
  const lotsQuery = useQuery({
    queryKey: ['lotes', { id_producto: productId }],
    queryFn: () => getLotes({ id_producto: productId, page: 1, page_size: 100 }),
  })
  const product = productQuery.data
  const lots = lotsQuery.data?.data ?? []
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white p-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {product?.nombre ?? 'Detalle del producto'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Información del producto y sus lotes.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar detalle" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        {productQuery.isPending ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
            <Loader2 size={20} className="animate-spin" />
            Cargando producto...
          </div>
        ) : productQuery.isError || !product ? (
          <div className="m-6 flex gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={20} />
            {getErrorMessage(productQuery.error)}
          </div>
        ) : (
          <div className="space-y-6 p-6">
            <div className="grid gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <Detail label="Código de barras" value={product.codigo_barras} />
              <Detail label="Categoría" value={categoryName(product)} />
              <Detail label="Principio activo" value={product.principio_activo} />
              <Detail label="Presentación" value={product.presentacion} />
              <Detail label="Precio de venta" value={formatMoney.format(Number(product.precio_venta ?? 0))} />
              <Detail label="Stock disponible" value={product.stock_disponible ?? product.stock ?? 0} />
              <Detail label="Stock mínimo" value={product.stock_minimo ?? 0} />
              <Detail label="Estado" value={product.estado ?? 'activo'} />
            </div>

            {isAdmin && (
              <div className="flex flex-wrap justify-end gap-3">
                <button type="button" onClick={() => onEdit(product)} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  <Pencil size={16} />
                  Editar producto
                </button>
                {product.estado !== 'inactivo' && (
                  <button type="button" onClick={() => onDisable(product)} disabled={disabling} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
                    Desactivar producto
                  </button>
                )}
              </div>
            )}

            <section className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="border-b border-slate-100 p-5">
                <h3 className="font-bold text-slate-800">Lotes del producto</h3>
                <p className="mt-1 text-sm text-slate-500">Existencias separadas por lote y vencimiento.</p>
              </div>

              {lotsQuery.isPending ? (
                <div className="p-8 text-center text-sm text-slate-500">Cargando lotes...</div>
              ) : lotsQuery.isError ? (
                <div className="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{getErrorMessage(lotsQuery.error)}</div>
              ) : lots.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">Este producto no tiene lotes registrados.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-150 text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Lote</th>
                        <th className="px-5 py-4">Cantidad</th>
                        <th className="px-5 py-4">Vencimiento</th>
                        <th className="px-5 py-4">Estado</th>
                        {isAdmin && <th className="px-5 py-4 text-right">Acciones</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lots.map((lot) => {
                        const expired = lot.fecha_vencimiento < today
                        return (
                          <tr key={lot.id_lote} className={expired ? 'bg-red-50/40' : ''}>
                            <td className="px-5 py-4 font-medium text-slate-800">{lot.codigo_lote ?? `#${lot.id_lote}`}</td>
                            <td className="px-5 py-4 text-slate-600">{lot.cantidad ?? lot.stock_disponible ?? 0}</td>
                            <td className="px-5 py-4 text-slate-600">{formatDate(lot.fecha_vencimiento)}</td>
                            <td className="px-5 py-4">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${expired ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                {expired ? 'Vencido' : lot.estado ?? 'Vigente'}
                              </span>
                            </td>
                            {isAdmin && (
                              <td className="px-5 py-4 text-right">
                                <button type="button" onClick={() => onAdjustLot(lot)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-50">
                                  <SlidersHorizontal size={15} />
                                  Ajustar
                                </button>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold capitalize text-slate-700">{value ?? '—'}</p>
    </div>
  )
}
