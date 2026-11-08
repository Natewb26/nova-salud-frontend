import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ShoppingCart, Plus, Trash2, RefreshCw, Search, Package, Users,
  CalendarDays, AlertCircle, LoaderCircle, X, Save, ClipboardList,
  UserRound,
} from 'lucide-react'

import {
  getSalesCustomers,
  getSalesProducts,
  getSalesHistory,
  createSale,
} from '../../services/salesService'

let itemSequence = 0

const createEmptyItem = () => ({
  _key: ++itemSequence,
  id_producto: '',
  cantidad: '1',
})

const currency = (value) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(Number(value) || 0)

const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const getProductId = (product) =>
  product?.id_producto ?? product?.id

const getProductName = (product) =>
  product?.nombre ?? product?.name ?? 'Producto sin nombre'

const getProductStock = (product) =>
  Math.max(0, Number(product?.stock) || 0)

const getProductPrice = (product) =>
  Number(product?.precio_venta ?? product?.price ?? 0)

const getCustomerName = (sale, customers) => {
  if (sale.nombre_contacto) return sale.nombre_contacto

  const customer = customers.find(
    (item) =>
      Number(item.id_contacto) === Number(sale.id_contacto),
  )

  return customer?.nombre ?? (
    sale.id_contacto
      ? `Cliente #${sale.id_contacto}`
      : 'Venta sin cliente'
  )
}

const formatDate = (value) => {
  if (!value) return 'No registrada'

  const dateOnly = String(value).match(/^\d{4}-\d{2}-\d{2}$/)

  const date = dateOnly
    ? new Date(`${value}T12:00:00`)
    : new Date(value)

  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleDateString('es-PE')
}

export default function Ventas() {
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [customerId, setCustomerId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [items, setItems] = useState(() => [createEmptyItem()])
  const [search, setSearch] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [customerData, productData, salesData] =
        await Promise.all([
          getSalesCustomers(),
          getSalesProducts(),
          getSalesHistory(),
        ])

      setCustomers(customerData)
      setProducts(productData)
      setSales(salesData)
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          'No se pudieron cargar los datos de ventas.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    Promise.all([
      getSalesCustomers(),
      getSalesProducts(),
      getSalesHistory(),
    ])
      .then(([customerData, productData, salesData]) => {
        if (!active) return

        setCustomers(customerData)
        setProducts(productData)
        setSales(salesData)
        setError('')
      })
      .catch((err) => {
        if (!active) return

        setError(
          err.response?.data?.error ||
            err.message ||
            'No se pudieron cargar los datos de ventas.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const getSelectedProduct = (id) =>
    products.find(
      (product) => String(getProductId(product)) === String(id),
    )

  const getRequestedQuantity = (productId) =>
    items.reduce((sum, item) => (
      String(item.id_producto) === String(productId)
        ? sum + (Number(item.cantidad) || 0)
        : sum
    ), 0)

  const total = useMemo(
    () =>
      items.reduce((sum, item) => {
        const product = products.find(
          (candidate) =>
            String(getProductId(candidate)) === String(item.id_producto),
        )

        return sum + (
          (Number(item.cantidad) || 0) * getProductPrice(product)
        )
      }, 0),
    [items, products],
  )

  const filteredSales = useMemo(() => {
    const term = normalizeText(search)

    if (!term) return sales

    return sales.filter((sale) => {
      const customerName = getCustomerName(sale, customers)

      return [
        sale.id_operacion,
        sale.id_contacto,
        sale.fecha,
        sale.total,
        sale.estado,
        sale.nombre_contacto,
        customerName,
        sale.metodo_pago,
      ].some((value) => normalizeText(value).includes(term))
    })
  }, [sales, customers, search])

  const updateItem = (key, field, value) => {
    setItems((current) =>
      current.map((item) =>
        item._key === key ? { ...item, [field]: value } : item,
      ),
    )
  }

  const addItem = () => {
    setItems((current) => [...current, createEmptyItem()])
  }

  const removeItem = (key) => {
    setItems((current) =>
      current.length === 1
        ? current
        : current.filter((item) => item._key !== key),
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (saving) return

    setError('')
    setSuccess('')

    if (!items.length) {
      setError('Agrega al menos un producto a la venta.')
      return
    }

    const invalidItem = items.some(
      (item) =>
        !item.id_producto ||
        !Number.isInteger(Number(item.cantidad)) ||
        Number(item.cantidad) <= 0 ||
        !getSelectedProduct(item.id_producto),
    )

    if (invalidItem) {
      setError(
        'Selecciona productos válidos e ingresa cantidades enteras mayores que cero.',
      )
      return
    }

    const requestedByProduct = new Map()

    items.forEach((item) => {
      const id = String(item.id_producto)
      requestedByProduct.set(
        id,
        (requestedByProduct.get(id) ?? 0) + Number(item.cantidad),
      )
    })

    for (const [id, requested] of requestedByProduct) {
      const product = getSelectedProduct(id)
      const available = getProductStock(product)

      if (requested > available) {
        setError(
          `Stock insuficiente para ${getProductName(product)}. Solicitado: ${requested}. Disponible: ${available}.`,
        )
        return
      }
    }

    const payload = {
      items: items.map((item) => ({
        id_producto: Number(item.id_producto),
        cantidad: Number(item.cantidad),
      })),
      id_contacto: customerId ? Number(customerId) : null,
      metodo_pago: paymentMethod,
    }

    setSaving(true)

    try {
      const result = await createSale(payload)

      setSuccess(
        `Venta registrada correctamente. Operación: ${
          result.resultado ?? 'confirmada'
        }.`,
      )

      setCustomerId('')
      setPaymentMethod('efectivo')
      setItems([createEmptyItem()])

      await loadData()
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          'No se pudo registrar la venta.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ventas</h1>
          <p className="mt-1 text-sm text-slate-500">
            Registra las ventas de productos y administra su historial.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading || saving}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          Actualizar información
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Cerrar mensaje"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <ShoppingCart size={19} className="mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Ventas registradas</p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {sales.length}
              </p>
            </div>
            <div className="rounded-xl bg-teal-50 p-3 text-teal-700">
              <ShoppingCart size={23} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Clientes disponibles</p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {customers.length}
              </p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
              <Users size={23} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Productos disponibles</p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {products.length}
              </p>
            </div>
            <div className="rounded-xl bg-violet-50 p-3 text-violet-700">
              <Package size={23} />
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="rounded-lg bg-teal-50 p-2.5 text-teal-700">
            <Plus size={21} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">
              Registrar nueva venta
            </h2>
            <p className="text-xs text-slate-500">
              Selecciona los productos y completa los datos de la venta.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-10 text-sm text-slate-500">
            <LoaderCircle size={22} className="animate-spin text-teal-600" />
            Cargando clientes y productos...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Cliente
                </label>
                <select
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                  disabled={saving}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-teal-500"
                >
                  <option value="">Venta sin cliente registrado</option>
                  {customers.map((customer) => (
                    <option
                      key={customer.id_contacto}
                      value={customer.id_contacto}
                    >
                      {customer.nombre}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  El registro de cliente es opcional.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Método de pago
                </label>
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  disabled={saving}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-teal-500"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="credito">Crédito</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-semibold text-slate-800">
                    Productos de la venta
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    El precio y el stock se consultan del catálogo.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addItem}
                  disabled={products.length === 0 || saving}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-teal-200 px-3 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 disabled:opacity-50"
                >
                  <Plus size={17} />
                  Agregar producto
                </button>
              </div>

              {items.map((item, index) => {
                const selectedProduct = getSelectedProduct(item.id_producto)
                const unitPrice = getProductPrice(selectedProduct)
                const available = getProductStock(selectedProduct)
                const requested = selectedProduct
                  ? getRequestedQuantity(item.id_producto)
                  : 0
                const subtotal = Number(item.cantidad) * unitPrice
                const insufficient = requested > available

                return (
                  <div
                    key={item._key}
                    className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">
                        Producto {index + 1}
                      </p>

                      <button
                        type="button"
                        onClick={() => removeItem(item._key)}
                        disabled={items.length === 1 || saving}
                        title="Eliminar producto"
                        className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-xs font-medium text-slate-600">
                          Producto *
                        </label>
                        <select
                          value={item.id_producto}
                          onChange={(event) =>
                            updateItem(item._key, 'id_producto', event.target.value)
                          }
                          required
                          disabled={saving}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500"
                        >
                          <option value="">Seleccionar producto</option>
                          {products.map((product) => {
                            const id = getProductId(product)
                            const stock = getProductStock(product)

                            return (
                              <option
                                key={id}
                                value={id}
                                disabled={stock <= 0}
                              >
                                {getProductName(product)}
                              </option>
                            )
                          })}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-medium text-slate-600">
                          Cantidad *
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          max={selectedProduct ? available : undefined}
                          value={item.cantidad}
                          onChange={(event) =>
                            updateItem(item._key, 'cantidad', event.target.value)
                          }
                          required
                          disabled={saving}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-medium text-slate-600">
                          Precio unitario
                        </label>
                        <div className="flex min-h-[42px] items-center rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-700">
                          {selectedProduct
                            ? currency(unitPrice)
                            : 'Selecciona un producto'}
                        </div>
                      </div>
                    </div>

                    {selectedProduct && (
                      <div className={`rounded-lg border p-3 text-xs ${
                        insufficient
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'border-teal-100 bg-teal-50 text-teal-800'
                      }`}>
                        <div className="flex flex-wrap justify-between gap-2">
                          <span>Stock disponible: {available} unidades</span>
                          <span>Solicitado en el formulario: {requested}</span>
                        </div>
                        {insufficient && (
                          <p className="mt-1 font-semibold">
                            La cantidad total supera el stock disponible.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end border-t border-slate-200 pt-3">
                      <p className="text-sm text-slate-600">
                        Subtotal:{' '}
                        <span className="font-bold text-slate-800">
                          {currency(subtotal)}
                        </span>
                      </p>
                    </div>
                  </div>
                )
              })}

              {products.length === 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  No hay productos disponibles en el catálogo. Registra
                  productos antes de realizar una venta.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-500">Total de la venta</p>
                <p className="mt-1 text-3xl font-bold text-teal-700">
                  {currency(total)}
                </p>
              </div>

              <button
                type="submit"
                disabled={saving || loading || products.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {saving ? 'Registrando venta...' : 'Registrar venta'}
              </button>
            </div>
          </>
        )}
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700">
              <ClipboardList size={21} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">
                Historial de ventas
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Operaciones registradas en el sistema.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <Search size={17} className="text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por operación o cliente..."
              className="w-full min-w-0 text-sm outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-10 text-sm text-slate-500">
            <LoaderCircle size={22} className="animate-spin text-teal-600" />
            Cargando historial...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Operación</th>
                  <th className="px-5 py-4 font-semibold">Fecha</th>
                  <th className="px-5 py-4 font-semibold">Cliente</th>
                  <th className="px-5 py-4 font-semibold">Total</th>
                  <th className="px-5 py-4 font-semibold">Estado</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredSales.map((sale) => (
                  <tr
                    key={sale.id_operacion}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-4 font-medium text-slate-800">
                      #{sale.id_operacion}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays size={15} className="text-slate-400" />
                        {formatDate(sale.fecha)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <span className="font-medium text-slate-700">
                        {getCustomerName(sale, customers)}
                      </span>
                      {sale.id_contacto && (
                        <span className="mt-0.5 block text-xs text-slate-400">
                          ID: {sale.id_contacto}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-800">
                      {sale.total != null ? currency(sale.total) : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
                        {sale.estado || 'Registrada'}
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-5 py-12 text-center">
                      <UserRound
                        size={30}
                        className="mx-auto mb-3 text-slate-300"
                      />
                      <p className="font-medium text-slate-600">
                        No se encontraron ventas
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Las ventas registradas aparecerán en este listado.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
