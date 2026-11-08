import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ShoppingCart, Plus, Trash2, RefreshCw, Search, Package, Truck,
  CalendarDays, AlertCircle, LoaderCircle, X, Save, ClipboardList,
} from 'lucide-react'

import {
  getPurchaseSuppliers,
  getPurchaseProducts,
  getPurchaseHistory,
  createPurchase,
} from '../../services/purchaseService'

let itemSequence = 0

const createEmptyItem = () => ({
  _key: ++itemSequence,
  id_producto: '',
  cantidad: '1',
  precio_unitario: '',
  codigo_lote: '',
  fecha_vencimiento: '',
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

const getSupplierName = (purchase, suppliers) => {
  if (purchase.nombre_contacto) return purchase.nombre_contacto

  const supplier = suppliers.find(
    (item) =>
      Number(item.id_contacto) === Number(purchase.id_contacto),
  )

  return supplier?.nombre ?? (
    purchase.id_contacto
      ? `Proveedor #${purchase.id_contacto}`
      : 'Sin proveedor'
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

const getToday = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export default function Compras() {
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [purchases, setPurchases] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [supplierId, setSupplierId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [items, setItems] = useState(() => [createEmptyItem()])
  const [search, setSearch] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [supplierData, productData, purchaseData] =
        await Promise.all([
          getPurchaseSuppliers(),
          getPurchaseProducts(),
          getPurchaseHistory(),
        ])

      setSuppliers(supplierData)
      setProducts(productData)
      setPurchases(purchaseData)
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          'No se pudieron cargar los datos de compras.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    Promise.all([
      getPurchaseSuppliers(),
      getPurchaseProducts(),
      getPurchaseHistory(),
    ])
      .then(([supplierData, productData, purchaseData]) => {
        if (!active) return

        setSuppliers(supplierData)
        setProducts(productData)
        setPurchases(purchaseData)
        setError('')
      })
      .catch((err) => {
        if (!active) return

        setError(
          err.response?.data?.error ||
            err.message ||
            'No se pudieron cargar los datos de compras.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          (Number(item.cantidad) || 0) *
            (Number(item.precio_unitario) || 0),
        0,
      ),
    [items],
  )

  const filteredPurchases = useMemo(() => {
    const term = normalizeText(search)

    if (!term) return purchases

    return purchases.filter((purchase) => {
      const supplierName = getSupplierName(purchase, suppliers)

      return [
        purchase.id_operacion,
        purchase.id_contacto,
        purchase.fecha,
        purchase.total,
        purchase.estado,
        purchase.nombre_contacto,
        supplierName,
        purchase.metodo_pago,
      ].some((value) => normalizeText(value).includes(term))
    })
  }, [purchases, suppliers, search])

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

    if (!supplierId) {
      setError('Debes seleccionar un proveedor.')
      return
    }

    if (!items.length) {
      setError('Agrega al menos un producto.')
      return
    }

    const invalidItem = items.some(
      (item) =>
        !item.id_producto ||
        !Number.isInteger(Number(item.cantidad)) ||
        Number(item.cantidad) <= 0 ||
        item.precio_unitario === '' ||
        !Number.isFinite(Number(item.precio_unitario)) ||
        Number(item.precio_unitario) < 0 ||
        !item.codigo_lote.trim() ||
        !item.fecha_vencimiento,
    )

    if (invalidItem) {
      setError(
        'Completa todos los datos. La cantidad debe ser un entero positivo, el precio no puede ser negativo y cada lote debe tener código y vencimiento.',
      )
      return
    }

    const today = getToday()
    const expiredItem = items.some(
      (item) => item.fecha_vencimiento < today,
    )

    if (expiredItem) {
      setError(
        'No puedes registrar una compra con lotes cuya fecha de vencimiento ya pasó.',
      )
      return
    }

    const payload = {
      id_contacto: Number(supplierId),
      items: items.map((item) => ({
        id_producto: Number(item.id_producto),
        cantidad: Number(item.cantidad),
        precio_unitario: Number(item.precio_unitario),
        codigo_lote: item.codigo_lote.trim(),
        fecha_vencimiento: item.fecha_vencimiento,
      })),
      metodo_pago: paymentMethod || null,
    }

    setSaving(true)

    try {
      const result = await createPurchase(payload)

      setSuccess(
        `Compra registrada correctamente. Operación: ${
          result.resultado ?? 'confirmada'
        }.`,
      )

      setSupplierId('')
      setPaymentMethod('efectivo')
      setItems([createEmptyItem()])

      await loadData()
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          'No se pudo registrar la compra.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Compras</h1>
          <p className="mt-1 text-sm text-slate-500">
            Registra las compras de productos y administra su historial.
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
              <p className="text-sm text-slate-500">Compras registradas</p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {purchases.length}
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
              <p className="text-sm text-slate-500">Proveedores disponibles</p>
              <p className="mt-2 text-2xl font-bold text-slate-800">
                {suppliers.length}
              </p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
              <Truck size={23} />
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
              Registrar nueva compra
            </h2>
            <p className="text-xs text-slate-500">
              Completa los datos del proveedor y los productos recibidos.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-10 text-sm text-slate-500">
            <LoaderCircle size={22} className="animate-spin text-teal-600" />
            Cargando proveedores y productos...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Proveedor *
                </label>
                <select
                  value={supplierId}
                  onChange={(event) => setSupplierId(event.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-teal-500"
                >
                  <option value="">Seleccionar proveedor</option>
                  {suppliers.map((supplier) => (
                    <option
                      key={supplier.id_contacto}
                      value={supplier.id_contacto}
                    >
                      {supplier.nombre}
                    </option>
                  ))}
                </select>

                {suppliers.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    No hay proveedores registrados en el sistema.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Método de pago
                </label>
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
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
                    Productos de la compra
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Registra la cantidad, precio y datos de cada lote.
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

              {items.map((item, index) => (
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
                        {products.map((product) => (
                          <option
                            key={getProductId(product)}
                            value={getProductId(product)}
                          >
                            {getProductName(product)}
                          </option>
                        ))}
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
                        Precio unitario de compra (S/) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.precio_unitario}
                        onChange={(event) =>
                          updateItem(item._key, 'precio_unitario', event.target.value)
                        }
                        required
                        disabled={saving}
                        placeholder="0.00"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-slate-600">
                        Código de lote *
                      </label>
                      <input
                        type="text"
                        maxLength="50"
                        value={item.codigo_lote}
                        onChange={(event) =>
                          updateItem(item._key, 'codigo_lote', event.target.value)
                        }
                        required
                        disabled={saving}
                        placeholder="Ej. LOTE-001"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-slate-600">
                        Fecha de vencimiento *
                      </label>
                      <input
                        type="date"
                        min={getToday()}
                        value={item.fecha_vencimiento}
                        onChange={(event) =>
                          updateItem(item._key, 'fecha_vencimiento', event.target.value)
                        }
                        required
                        disabled={saving}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end border-t border-slate-200 pt-3">
                    <p className="text-sm text-slate-600">
                      Subtotal:{' '}
                      <span className="font-bold text-slate-800">
                        {currency(
                          Number(item.cantidad) *
                            Number(item.precio_unitario),
                        )}
                      </span>
                    </p>
                  </div>
                </div>
              ))}

              {products.length === 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  No hay productos disponibles en el catálogo. Registra
                  productos antes de realizar una compra.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-500">Total de la compra</p>
                <p className="mt-1 text-3xl font-bold text-teal-700">
                  {currency(total)}
                </p>
              </div>

              <button
                type="submit"
                disabled={
                  saving ||
                  loading ||
                  suppliers.length === 0 ||
                  products.length === 0
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {saving ? 'Registrando compra...' : 'Registrar compra'}
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
                Historial de compras
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
              placeholder="Buscar por operación o proveedor..."
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
                  <th className="px-5 py-4 font-semibold">Proveedor</th>
                  <th className="px-5 py-4 font-semibold">Total</th>
                  <th className="px-5 py-4 font-semibold">Estado</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredPurchases.map((purchase) => (
                  <tr
                    key={purchase.id_operacion}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-4 font-medium text-slate-800">
                      #{purchase.id_operacion}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays size={15} className="text-slate-400" />
                        {formatDate(purchase.fecha)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <span className="font-medium text-slate-700">
                        {getSupplierName(purchase, suppliers)}
                      </span>
                      {purchase.id_contacto && (
                        <span className="mt-0.5 block text-xs text-slate-400">
                          ID: {purchase.id_contacto}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-800">
                      {purchase.total != null
                        ? currency(purchase.total)
                        : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
                        {purchase.estado || 'Registrada'}
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredPurchases.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-5 py-12 text-center">
                      <ClipboardList
                        size={30}
                        className="mx-auto mb-3 text-slate-300"
                      />
                      <p className="font-medium text-slate-600">
                        No se encontraron compras
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Las compras registradas aparecerán en este listado.
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
