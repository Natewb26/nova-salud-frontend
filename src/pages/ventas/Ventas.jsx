import { useEffect, useMemo, useState } from 'react'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  AlertCircle,
  Barcode,
  ChevronLeft,
  ChevronRight,
  Eye,
  LoaderCircle,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { getErrorMessage } from '../../services/apiErrors'
import { PAYMENT_METHODS } from '../../services/paymentService'
import {
  cancelSale,
  createSale,
  getProductByBarcode,
  getSales,
  getSalesCustomers,
  getSalesProduct,
  getSalesProducts,
} from '../../services/salesService'
import {
  CancelSaleModal,
  SaleDetailModal,
  SaleReceiptModal,
} from './SaleModals'

const PAGE_SIZE = 20
const money = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
})

const productId = (product) => product.id_producto ?? product.id
const productName = (product) => product.nombre ?? product.name ?? 'Producto'
const productStock = (product) => Number(product.stock_disponible ?? product.stock ?? 0)
const productPrice = (product) => Number(product.precio_venta ?? product.price ?? 0)
const customerId = (customer) => customer.id_contacto ?? customer.id
const saleId = (sale) => sale.id_venta ?? sale.id_operacion ?? sale.id

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('es-PE')
}

export default function Ventas() {
  const { hasRole } = useAuth()
  const isAdmin = hasRole('admin')
  const queryClient = useQueryClient()
  const [productSearch, setProductSearch] = useState('')
  const debouncedProductSearch = useDebouncedValue(productSearch, 300)
  const [barcode, setBarcode] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const debouncedCustomerSearch = useDebouncedValue(customerSearch, 300)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [cart, setCart] = useState([])
  const [saleError, setSaleError] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [historyFilters, setHistoryFilters] = useState({ desde: '', hasta: '', estado: '' })
  const [historyPage, setHistoryPage] = useState(1)
  const [detailSaleId, setDetailSaleId] = useState(null)
  const [saleToCancel, setSaleToCancel] = useState(null)

  const productsQuery = useQuery({
    queryKey: ['productos', 'venta', debouncedProductSearch],
    queryFn: () => getSalesProducts({
      search: debouncedProductSearch,
      page: 1,
      page_size: 10,
      sort: 'nombre',
    }),
  })
  const customersQuery = useQuery({
    queryKey: ['contactos', 'venta', debouncedCustomerSearch],
    queryFn: () => getSalesCustomers({
      search: debouncedCustomerSearch,
      page: 1,
      page_size: 10,
      sort: 'nombre',
    }),
  })
  const historyParams = {
    page: historyPage,
    page_size: PAGE_SIZE,
    sort: '-fecha',
    ...(historyFilters.desde ? { desde: historyFilters.desde } : {}),
    ...(historyFilters.hasta ? { hasta: historyFilters.hasta } : {}),
    ...(historyFilters.estado ? { estado: historyFilters.estado } : {}),
  }
  const salesQuery = useQuery({
    queryKey: ['ventas', historyParams],
    queryFn: () => getSales(historyParams),
    placeholderData: keepPreviousData,
  })

  const invalidateSaleData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['productos'] }),
      queryClient.invalidateQueries({ queryKey: ['alertas'] }),
      queryClient.invalidateQueries({ queryKey: ['ventas'] }),
    ])
  }
  const createMutation = useMutation({
    mutationFn: createSale,
    onSuccess: invalidateSaleData,
  })
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => cancelSale(id, reason),
    onSuccess: async (_, variables) => {
      await invalidateSaleData()
      await queryClient.invalidateQueries({ queryKey: ['venta', variables.id] })
    },
  })
  const barcodeMutation = useMutation({ mutationFn: getProductByBarcode })

  const products = productsQuery.data?.data ?? []
  const customers = customersQuery.data?.data ?? []
  const sales = salesQuery.data?.data ?? []
  const salesMeta = salesQuery.data?.meta ?? {
    page: historyPage,
    total: 0,
    total_pages: 1,
  }

  const totalPreview = useMemo(
    () => cart.reduce(
      (sum, item) => sum + item.cantidad * productPrice(item.product),
      0,
    ),
    [cart],
  )
  const cartHasInvalidStock = cart.some((item) => {
    const available = productStock(item.product)
    return item.cantidad < 1 || item.cantidad > available
  })

  const addProduct = (product) => {
    const id = productId(product)
    const available = productStock(product)

    if (available <= 0) {
      setSaleError(`${productName(product)} no tiene stock disponible`)
      return
    }

    setSaleError('')
    setCart((current) => {
      const existing = current.find((item) => String(productId(item.product)) === String(id))
      if (!existing) return [...current, { product, cantidad: 1 }]
      return current.map((item) =>
        String(productId(item.product)) === String(id)
          ? { ...item, cantidad: Math.min(available, item.cantidad + 1) }
          : item,
      )
    })
    setProductSearch('')
  }

  const changeQuantity = (id, value) => {
    setCart((current) => current.map((item) => {
      if (String(productId(item.product)) !== String(id)) return item
      const available = productStock(item.product)
      const quantity = available > 0
        ? Math.max(1, Math.min(available, Number(value) || 1))
        : 0
      return { ...item, cantidad: quantity }
    }))
  }

  const refreshCartStock = async () => {
    const refreshed = await Promise.all(
      cart.map((item) => getSalesProduct(productId(item.product))),
    )
    setCart((current) => current.map((item) => {
      const product = refreshed.find(
        (candidate) => candidate && String(productId(candidate)) === String(productId(item.product)),
      )
      if (!product) return item
      return {
        ...item,
        product,
        cantidad: Math.min(item.cantidad, productStock(product)),
      }
    }))
  }

  const handleBarcode = async (event) => {
    event.preventDefault()
    const normalized = barcode.trim()
    if (!normalized) return

    setSaleError('')
    try {
      const product = await barcodeMutation.mutateAsync(normalized)
      if (!product) {
        setSaleError('No se encontró un producto con ese código de barras')
        return
      }
      addProduct(product)
      setBarcode('')
    } catch (error) {
      setSaleError(getErrorMessage(error))
    }
  }

  const handleSale = async (event) => {
    event.preventDefault()
    if (cart.length === 0) {
      setSaleError('Agrega al menos un producto al carrito')
      return
    }
    if (cartHasInvalidStock) {
      setSaleError('Actualiza las cantidades: uno o más productos no tienen stock suficiente')
      return
    }

    const payload = {
      ...(selectedCustomer ? { id_contacto: Number(customerId(selectedCustomer)) } : {}),
      metodo_pago: paymentMethod,
      items: cart.map((item) => ({
        id_producto: Number(productId(item.product)),
        cantidad: item.cantidad,
      })),
    }

    setSaleError('')
    try {
      const created = await createMutation.mutateAsync(payload)
      setReceipt(created)
      setCart([])
      setSelectedCustomer(null)
      setCustomerSearch('')
      setPaymentMethod('efectivo')
    } catch (error) {
      const code = error.response?.data?.error?.code
      setSaleError(getErrorMessage(error))
      if (error.response?.status === 409 && code === 'STOCK_INSUFICIENTE') {
        await queryClient.invalidateQueries({ queryKey: ['productos'] })
        await refreshCartStock()
      }
    }
  }

  const updateHistoryFilter = (field, value) => {
    setHistoryFilters((current) => ({ ...current, [field]: value }))
    setHistoryPage(1)
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ventas</h1>
          <p className="mt-1 text-sm text-slate-500">Registra ventas y consulta su historial.</p>
        </div>
        <button type="button" onClick={() => Promise.all([productsQuery.refetch(), customersQuery.refetch(), salesQuery.refetch()])} disabled={productsQuery.isFetching || salesQuery.isFetching} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw size={17} className={productsQuery.isFetching || salesQuery.isFetching ? 'animate-spin' : ''} />
          Actualizar información
        </button>
      </div>

      {saleError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <span className="flex-1">{saleError}</span>
          <button type="button" onClick={() => setSaleError('')} aria-label="Cerrar"><X size={17} /></button>
        </div>
      )}

      <form onSubmit={handleSale} className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="rounded-lg bg-teal-50 p-2.5 text-teal-700"><ShoppingCart size={21} /></div>
          <div><h2 className="font-bold text-slate-800">Nueva venta</h2><p className="text-sm text-slate-500">Selecciona productos y confirma la operación.</p></div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="relative">
            <label className="mb-2 block text-sm font-medium text-slate-700">Buscar producto</label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-teal-500">
              <Search size={18} className="text-slate-400" />
              <input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Nombre o código..." className="w-full py-3 text-sm outline-none" />
            </div>
            {productSearch && (
              <SearchResults loading={productsQuery.isFetching} empty={products.length === 0}>
                {products.map((product) => (
                  <button key={productId(product)} type="button" onClick={() => addProduct(product)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50">
                    <span><span className="block text-sm font-semibold text-slate-800">{productName(product)}</span><span className="text-xs text-slate-400">{product.codigo_barras}</span></span>
                    <span className="text-xs font-semibold text-slate-500">Stock: {productStock(product)}</span>
                  </button>
                ))}
              </SearchResults>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Código de barras</label>
            <div className="flex gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-teal-500">
                <Barcode size={18} className="text-slate-400" />
                <input value={barcode} onChange={(event) => setBarcode(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') handleBarcode(event) }} placeholder="Escanea o escribe el código" className="w-full py-3 text-sm outline-none" />
              </div>
              {barcodeMutation.isPending && <LoaderCircle size={20} className="mt-3 animate-spin text-teal-600" />}
            </div>
          </div>

          <div className="relative">
            <label className="mb-2 block text-sm font-medium text-slate-700">Cliente opcional</label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                <span>{selectedCustomer.nombre}</span>
                <button type="button" onClick={() => setSelectedCustomer(null)} aria-label="Quitar cliente"><X size={17} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-teal-500">
                <UserRound size={18} className="text-slate-400" />
                <input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Buscar por nombre o documento..." className="w-full py-3 text-sm outline-none" />
              </div>
            )}
            {!selectedCustomer && customerSearch && (
              <SearchResults loading={customersQuery.isFetching} empty={customers.length === 0}>
                {customers.map((customer) => (
                  <button key={customerId(customer)} type="button" onClick={() => { setSelectedCustomer(customer); setCustomerSearch('') }} className="block w-full px-4 py-3 text-left hover:bg-slate-50">
                    <span className="block text-sm font-semibold text-slate-800">{customer.nombre}</span><span className="text-xs text-slate-400">{customer.documento || 'Sin documento'}</span>
                  </button>
                ))}
              </SearchResults>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Método de pago</label>
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm capitalize outline-none focus:border-teal-500">
              {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-175 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Precio referencial</th><th className="px-4 py-3">Cantidad</th><th className="px-4 py-3">Subtotal</th><th className="px-4 py-3"></th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {cart.map((item) => (
                <tr key={productId(item.product)}>
                  <td className="px-4 py-3"><p className="font-semibold text-slate-800">{productName(item.product)}</p><p className="text-xs text-slate-400">Disponible: {productStock(item.product)}</p></td>
                  <td className="px-4 py-3 text-slate-600">{money.format(productPrice(item.product))}</td>
                  <td className="px-4 py-3"><input type="number" min={productStock(item.product) > 0 ? 1 : 0} max={productStock(item.product)} value={item.cantidad} disabled={productStock(item.product) <= 0} onChange={(event) => changeQuantity(productId(item.product), event.target.value)} className="w-20 rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50 disabled:text-red-500" /></td>
                  <td className="px-4 py-3 font-medium text-slate-700">{money.format(item.cantidad * productPrice(item.product))}</td>
                  <td className="px-4 py-3 text-right"><button type="button" onClick={() => setCart((current) => current.filter((entry) => productId(entry.product) !== productId(item.product)))} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label="Quitar producto"><Trash2 size={17} /></button></td>
                </tr>
              ))}
              {cart.length === 0 && <tr><td colSpan="5" className="px-5 py-10 text-center text-sm text-slate-400"><Package size={30} className="mx-auto mb-2 text-slate-300" />Agrega productos al carrito.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-end justify-between gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
          <div><p className="text-xs text-slate-400">Total referencial</p><p className="text-2xl font-bold text-slate-800">{money.format(totalPreview)}</p></div>
          <button type="submit" disabled={createMutation.isPending || cart.length === 0 || cartHasInvalidStock} className="flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">
            {createMutation.isPending && <LoaderCircle size={18} className="animate-spin" />}
            {createMutation.isPending ? 'Registrando...' : 'Confirmar venta'}
          </button>
        </div>
      </form>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5"><h2 className="font-bold text-slate-800">Historial de ventas</h2><p className="mt-1 text-sm text-slate-500">Consulta ventas registradas y anuladas.</p></div>
        <div className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-3">
          <DateFilter label="Desde" value={historyFilters.desde} onChange={(value) => updateHistoryFilter('desde', value)} />
          <DateFilter label="Hasta" value={historyFilters.hasta} onChange={(value) => updateHistoryFilter('hasta', value)} />
          <div><label className="mb-1 block text-xs font-medium text-slate-500">Estado</label><select value={historyFilters.estado} onChange={(event) => updateHistoryFilter('estado', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"><option value="">Todos</option><option value="registrada">Registrada</option><option value="anulada">Anulada</option></select></div>
        </div>

        {salesQuery.isError ? <div className="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{getErrorMessage(salesQuery.error)}</div> : salesQuery.isPending ? <div className="p-10 text-center text-sm text-slate-500">Cargando ventas...</div> : (
          <div className="overflow-x-auto"><table className="w-full min-w-175 text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Venta</th><th className="px-5 py-4">Fecha</th><th className="px-5 py-4">Cliente</th><th className="px-5 py-4">Método</th><th className="px-5 py-4">Total</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4"></th></tr></thead><tbody className="divide-y divide-slate-100">
            {sales.map((sale) => <tr key={saleId(sale)} className="hover:bg-slate-50"><td className="px-5 py-4 font-semibold text-slate-800">#{saleId(sale)}</td><td className="px-5 py-4 text-slate-600">{formatDate(sale.fecha ?? sale.created_at)}</td><td className="px-5 py-4 text-slate-600">{sale.cliente?.nombre ?? sale.nombre_contacto ?? 'Cliente general'}</td><td className="px-5 py-4 capitalize text-slate-600">{sale.metodo_pago}</td><td className="px-5 py-4 font-medium text-slate-700">{money.format(Number(sale.total ?? 0))}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${String(sale.estado).toLowerCase() === 'anulada' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{sale.estado}</span></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => setDetailSaleId(saleId(sale))} className="rounded-lg p-2 text-teal-700 hover:bg-teal-50" aria-label="Ver detalle"><Eye size={17} /></button></td></tr>)}
            {sales.length === 0 && <tr><td colSpan="7" className="px-5 py-10 text-center text-slate-400">No se encontraron ventas.</td></tr>}
          </tbody></table></div>
        )}

        <div className="flex flex-col justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center"><span>Mostrando {sales.length} de {salesMeta.total} ventas</span><div className="flex items-center gap-2"><button type="button" onClick={() => setHistoryPage((current) => Math.max(1, current - 1))} disabled={salesMeta.page <= 1 || salesQuery.isFetching} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronLeft size={16} /></button><span>Página {salesMeta.page} de {salesMeta.total_pages}</span><button type="button" onClick={() => setHistoryPage((current) => Math.min(salesMeta.total_pages, current + 1))} disabled={salesMeta.page >= salesMeta.total_pages || salesQuery.isFetching} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronRight size={16} /></button></div></div>
      </section>

      {receipt && <SaleReceiptModal sale={receipt} onClose={() => setReceipt(null)} />}
      {detailSaleId && <SaleDetailModal saleId={detailSaleId} isAdmin={isAdmin} onClose={() => setDetailSaleId(null)} onCancel={(sale) => setSaleToCancel(sale)} />}
      {saleToCancel && <CancelSaleModal sale={saleToCancel} pending={cancelMutation.isPending} onClose={() => setSaleToCancel(null)} onSubmit={(reason) => cancelMutation.mutateAsync({ id: saleId(saleToCancel), reason })} />}
    </section>
  )
}

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value.trim()), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function SearchResults({ loading, empty, children }) {
  return <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">{loading ? <p className="p-4 text-sm text-slate-500">Buscando...</p> : empty ? <p className="p-4 text-sm text-slate-500">Sin resultados</p> : children}</div>
}

function DateFilter({ label, value, onChange }) {
  return <div><label className="mb-1 block text-xs font-medium text-slate-500">{label}</label><input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /></div>
}
