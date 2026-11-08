import { useEffect, useMemo, useState } from 'react'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  LoaderCircle,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
  X,
} from 'lucide-react'
import { getErrorMessage } from '../../services/apiErrors'
import {
  cancelPurchase,
  createPurchase,
  getPurchaseProducts,
  getPurchaseSuppliers,
  getPurchases,
} from '../../services/purchaseService'
import { CancelPurchaseModal, PurchaseDetailModal } from './PurchaseModals'

const PAGE_SIZE = 20
let itemSequence = 0

const createEmptyItem = () => ({
  _key: ++itemSequence,
  id_producto: '',
  cantidad: '1',
  precio_unitario: '',
  codigo_lote: '',
  fecha_vencimiento: '',
})

const money = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
})
const controlClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 disabled:bg-slate-50'

const productId = (product) => product.id_producto ?? product.id
const productName = (product) => product.nombre ?? product.name ?? 'Producto'
const supplierId = (supplier) => supplier.id_contacto ?? supplier.id
const purchaseId = (purchase) =>
  purchase.id_compra ?? purchase.id_operacion ?? purchase.id

const getToday = () => {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

const formatDate = (value) => {
  if (!value) return '—'
  const dateOnly = String(value).match(/^\d{4}-\d{2}-\d{2}$/)
  const date = new Date(dateOnly ? `${value}T12:00:00` : value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('es-PE')
}

const supplierName = (purchase, suppliers) =>
  purchase.proveedor?.nombre ??
  purchase.nombre_contacto ??
  suppliers.find((supplier) =>
    Number(supplierId(supplier)) === Number(purchase.id_contacto),
  )?.nombre ?? 'Proveedor no disponible'

export default function Compras() {
  const queryClient = useQueryClient()
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [items, setItems] = useState(() => [createEmptyItem()])
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')
  const [historySearch, setHistorySearch] = useState('')
  const debouncedSearch = useDebouncedValue(historySearch, 300)
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState(null)
  const [purchaseToCancel, setPurchaseToCancel] = useState(null)

  const suppliersQuery = useQuery({
    queryKey: ['contactos', 'proveedores-compra'],
    queryFn: () => getPurchaseSuppliers(),
  })
  const productsQuery = useQuery({
    queryKey: ['productos', 'compra'],
    queryFn: () => getPurchaseProducts(),
  })
  const historyParams = {
    page,
    page_size: PAGE_SIZE,
    sort: '-fecha',
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  }
  const purchasesQuery = useQuery({
    queryKey: ['compras', historyParams],
    queryFn: () => getPurchases(historyParams),
    placeholderData: keepPreviousData,
  })

  const suppliers = suppliersQuery.data?.data ?? []
  const products = productsQuery.data?.data ?? []
  const purchases = purchasesQuery.data?.data ?? []
  const meta = purchasesQuery.data?.meta ?? {
    page,
    total: 0,
    total_pages: 1,
  }
  const loadingCatalogs = suppliersQuery.isPending || productsQuery.isPending

  const invalidatePurchaseData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['compras'] }),
      queryClient.invalidateQueries({ queryKey: ['productos'] }),
      queryClient.invalidateQueries({ queryKey: ['lotes'] }),
      queryClient.invalidateQueries({ queryKey: ['alertas'] }),
    ])
  }
  const createMutation = useMutation({
    mutationFn: createPurchase,
    onSuccess: invalidatePurchaseData,
  })
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => cancelPurchase(id, reason),
    onSuccess: async (_, variables) => {
      await invalidatePurchaseData()
      await queryClient.invalidateQueries({ queryKey: ['compra', variables.id] })
    },
  })

  const total = useMemo(() => items.reduce(
    (sum, item) => sum +
      (Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0),
    0,
  ), [items])

  const updateItem = (key, field, value) => {
    setItems((current) => current.map((item) =>
      item._key === key ? { ...item, [field]: value } : item,
    ))
    setFormError('')
  }

  const validateItems = () => {
    const today = getToday()
    for (const item of items) {
      if (!item.id_producto) return 'Selecciona un producto en cada línea.'
      if (!Number.isInteger(Number(item.cantidad)) || Number(item.cantidad) <= 0) {
        return 'La cantidad debe ser un entero positivo.'
      }
      if (!/^\d+(\.\d{1,2})?$/.test(item.precio_unitario) || Number(item.precio_unitario) < 0) {
        return 'El precio unitario debe ser válido y tener como máximo 2 decimales.'
      }
      const lotCode = item.codigo_lote.trim()
      if (lotCode.length < 1 || lotCode.length > 50) {
        return 'El código de lote debe tener entre 1 y 50 caracteres.'
      }
      if (!item.fecha_vencimiento || item.fecha_vencimiento < today) {
        return 'La fecha de vencimiento no puede ser una fecha pasada.'
      }
    }

    const lotKeys = items.map((item) =>
      `${item.id_producto}:${item.codigo_lote.trim().toLowerCase()}`,
    )
    if (new Set(lotKeys).size !== lotKeys.length) {
      return 'No repitas el mismo lote para un producto dentro de la compra.'
    }
    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!selectedSupplier) {
      setFormError('Debes seleccionar un proveedor.')
      return
    }
    const validationError = validateItems()
    if (validationError) {
      setFormError(validationError)
      return
    }

    const payload = {
      id_contacto: Number(selectedSupplier),
      ...(paymentMethod ? { metodo_pago: paymentMethod } : {}),
      items: items.map((item) => ({
        id_producto: Number(item.id_producto),
        cantidad: Number(item.cantidad),
        precio_unitario: Number(item.precio_unitario),
        codigo_lote: item.codigo_lote.trim(),
        fecha_vencimiento: item.fecha_vencimiento,
      })),
    }

    setFormError('')
    setSuccess('')
    try {
      const created = await createMutation.mutateAsync(payload)
      const createdId = created ? purchaseId(created) : null
      setSuccess(createdId
        ? `Compra #${createdId} registrada correctamente.`
        : 'Compra registrada correctamente.')
      setSelectedSupplier('')
      setPaymentMethod('')
      setItems([createEmptyItem()])
    } catch (error) {
      setFormError(getErrorMessage(error))
    }
  }

  const refreshAll = () => Promise.all([
    suppliersQuery.refetch(),
    productsQuery.refetch(),
    purchasesQuery.refetch(),
  ])

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><h1 className="text-2xl font-bold text-slate-800">Compras</h1><p className="mt-1 text-sm text-slate-500">Registra las compras de productos y administra su historial.</p></div>
        <button type="button" onClick={refreshAll} disabled={loadingCatalogs || purchasesQuery.isFetching || createMutation.isPending} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw size={17} className={purchasesQuery.isFetching ? 'animate-spin' : ''} />
          Actualizar información
        </button>
      </div>

      {(formError || suppliersQuery.isError || productsQuery.isError) && (
        <Message tone="error" onClose={() => setFormError('')}>
          {formError || getErrorMessage(suppliersQuery.error ?? productsQuery.error)}
        </Message>
      )}
      {success && <Message tone="success" onClose={() => setSuccess('')}>{success}</Message>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat icon={ShoppingCart} label="Compras registradas" value={meta.total} color="teal" />
        <Stat icon={Truck} label="Proveedores disponibles" value={suppliers.length} color="blue" />
        <Stat icon={Package} label="Productos disponibles" value={products.length} color="violet" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="rounded-lg bg-teal-50 p-2.5 text-teal-700"><Plus size={21} /></div>
          <div><h2 className="font-semibold text-slate-800">Registrar nueva compra</h2><p className="text-xs text-slate-500">Completa los datos del proveedor y los productos recibidos.</p></div>
        </div>

        {loadingCatalogs ? (
          <div className="flex items-center justify-center gap-3 py-10 text-sm text-slate-500"><LoaderCircle size={22} className="animate-spin text-teal-600" />Cargando proveedores y productos...</div>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Proveedor *">
                <select value={selectedSupplier} onChange={(event) => setSelectedSupplier(event.target.value)} required disabled={createMutation.isPending} className={controlClass}>
                  <option value="">Seleccionar proveedor</option>
                  {suppliers.map((supplier) => <option key={supplierId(supplier)} value={supplierId(supplier)}>{supplier.nombre}</option>)}
                </select>
              </Field>
              <Field label="Método de pago (opcional)">
                <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} disabled={createMutation.isPending} className={controlClass}>
                  <option value="">No especificar</option><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="tarjeta">Tarjeta</option><option value="credito">Crédito</option>
                </select>
              </Field>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div><h3 className="font-semibold text-slate-800">Productos de la compra</h3><p className="mt-1 text-xs text-slate-500">Registra la cantidad, precio y datos de cada lote.</p></div>
                <button type="button" onClick={() => setItems((current) => [...current, createEmptyItem()])} disabled={createMutation.isPending || products.length === 0} className="inline-flex items-center justify-center gap-2 rounded-lg border border-teal-200 px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-50"><Plus size={17} />Agregar producto</button>
              </div>

              {items.map((item, index) => (
                <PurchaseLine key={item._key} item={item} index={index} products={products} disabled={createMutation.isPending} canRemove={items.length > 1} onChange={updateItem} onRemove={() => setItems((current) => current.filter((entry) => entry._key !== item._key))} />
              ))}
            </div>

            <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm text-slate-500">Total de la compra</p><p className="mt-1 text-3xl font-bold text-teal-700">{money.format(total)}</p></div>
              <button type="submit" disabled={createMutation.isPending || suppliers.length === 0 || products.length === 0} className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
                {createMutation.isPending ? <LoaderCircle size={18} className="animate-spin" /> : <Save size={18} />}
                {createMutation.isPending ? 'Registrando compra...' : 'Registrar compra'}
              </button>
            </div>
          </>
        )}
      </form>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><div className="rounded-lg bg-blue-50 p-2.5 text-blue-700"><ClipboardList size={21} /></div><div><h2 className="font-semibold text-slate-800">Historial de compras</h2><p className="mt-1 text-xs text-slate-500">Operaciones registradas en el sistema.</p></div></div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"><Search size={17} className="text-slate-400" /><input type="search" value={historySearch} onChange={(event) => { setHistorySearch(event.target.value); setPage(1) }} placeholder="Buscar compra o proveedor..." className="w-full min-w-0 text-sm outline-none" /></div>
        </div>

        {purchasesQuery.isError ? <div className="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{getErrorMessage(purchasesQuery.error)}</div> : purchasesQuery.isPending ? <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><LoaderCircle size={20} className="animate-spin" />Cargando historial...</div> : (
          <div className="overflow-x-auto"><table className="w-full min-w-180 text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Compra</th><th className="px-5 py-4">Fecha</th><th className="px-5 py-4">Proveedor</th><th className="px-5 py-4">Total</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4"></th></tr></thead><tbody className="divide-y divide-slate-100">
            {purchases.map((purchase) => <tr key={purchaseId(purchase)} className="hover:bg-slate-50"><td className="px-5 py-4 font-semibold text-slate-800">#{purchaseId(purchase)}</td><td className="px-5 py-4 text-slate-600"><span className="inline-flex items-center gap-2"><CalendarDays size={15} className="text-slate-400" />{formatDate(purchase.fecha ?? purchase.created_at)}</span></td><td className="px-5 py-4 text-slate-600">{supplierName(purchase, suppliers)}</td><td className="px-5 py-4 font-semibold text-slate-800">{money.format(Number(purchase.total ?? 0))}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${String(purchase.estado).toLowerCase() === 'anulada' ? 'bg-red-50 text-red-700' : 'bg-teal-50 text-teal-700'}`}>{purchase.estado ?? 'Registrada'}</span></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => setDetailId(purchaseId(purchase))} aria-label="Ver detalle" className="rounded-lg p-2 text-teal-700 hover:bg-teal-50"><Eye size={17} /></button></td></tr>)}
            {purchases.length === 0 && <tr><td colSpan="6" className="px-5 py-12 text-center text-slate-400">No se encontraron compras.</td></tr>}
          </tbody></table></div>
        )}
        <div className="flex flex-col justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center"><span>Mostrando {purchases.length} de {meta.total} compras</span><div className="flex items-center gap-2"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={meta.page <= 1 || purchasesQuery.isFetching} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronLeft size={16} /></button><span>Página {meta.page} de {meta.total_pages}</span><button type="button" onClick={() => setPage((current) => Math.min(meta.total_pages, current + 1))} disabled={meta.page >= meta.total_pages || purchasesQuery.isFetching} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronRight size={16} /></button></div></div>
      </section>

      {detailId && <PurchaseDetailModal purchaseId={detailId} onClose={() => setDetailId(null)} onCancel={setPurchaseToCancel} />}
      {purchaseToCancel && <CancelPurchaseModal purchase={purchaseToCancel} pending={cancelMutation.isPending} onClose={() => setPurchaseToCancel(null)} onSubmit={(reason) => cancelMutation.mutateAsync({ id: purchaseId(purchaseToCancel), reason })} />}
    </section>
  )
}

function PurchaseLine({ item, index, products, disabled, canRemove, onChange, onRemove }) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-700">Producto {index + 1}</p><button type="button" onClick={onRemove} disabled={!canRemove || disabled} className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-30" aria-label="Eliminar línea"><Trash2 size={17} /></button></div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Producto *" wide><select value={item.id_producto} onChange={(event) => onChange(item._key, 'id_producto', event.target.value)} required disabled={disabled} className={controlClass}><option value="">Seleccionar producto</option>{products.map((product) => <option key={productId(product)} value={productId(product)}>{productName(product)}</option>)}</select></Field>
        <Field label="Cantidad *"><input type="number" min="1" step="1" value={item.cantidad} onChange={(event) => onChange(item._key, 'cantidad', event.target.value)} required disabled={disabled} className={controlClass} /></Field>
        <Field label="Precio unitario de compra (S/) *"><input type="number" min="0" step="0.01" value={item.precio_unitario} onChange={(event) => onChange(item._key, 'precio_unitario', event.target.value)} required disabled={disabled} placeholder="0.00" className={controlClass} /></Field>
        <Field label="Código de lote *"><input type="text" minLength={1} maxLength={50} value={item.codigo_lote} onChange={(event) => onChange(item._key, 'codigo_lote', event.target.value)} required disabled={disabled} placeholder="Ej. LOTE-001" className={controlClass} /></Field>
        <Field label="Fecha de vencimiento *"><input type="date" min={getToday()} value={item.fecha_vencimiento} onChange={(event) => onChange(item._key, 'fecha_vencimiento', event.target.value)} required disabled={disabled} className={controlClass} /></Field>
      </div>
      <div className="flex justify-end border-t border-slate-200 pt-3 text-sm text-slate-600">Subtotal: <span className="ml-1 font-bold text-slate-800">{money.format(Number(item.cantidad) * Number(item.precio_unitario) || 0)}</span></div>
    </div>
  )
}

function Field({ label, wide = false, children }) {
  return <div className={wide ? 'md:col-span-2' : ''}><label className="mb-2 block text-xs font-medium text-slate-600">{label}</label>{children}</div>
}

function Stat({ icon: Icon, label, value, color }) {
  const colors = { teal: 'bg-teal-50 text-teal-700', blue: 'bg-blue-50 text-blue-700', violet: 'bg-violet-50 text-violet-700' }
  return <div className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-800">{value}</p></div><div className={`rounded-xl p-3 ${colors[color]}`}><Icon size={23} /></div></div></div>
}

function Message({ tone, onClose, children }) {
  const success = tone === 'success'
  return <div className={`flex items-start gap-2 rounded-lg border p-4 text-sm ${success ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}><AlertCircle size={19} className="mt-0.5 shrink-0" /><span className="flex-1">{children}</span><button type="button" onClick={onClose} aria-label="Cerrar"><X size={17} /></button></div>
}

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value.trim()), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}
