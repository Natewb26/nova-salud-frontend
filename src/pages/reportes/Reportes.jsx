import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  ShoppingCart,
  Package,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'

import { DEMO_DATA_MODE } from '../../services/dataMode'
import { subscribeDemoStore } from '../../services/demoStore'
import {
  getReportOperations,
  getReportInventory,
} from '../../services/reportService'

const formatNumber = (value) =>
  new Intl.NumberFormat('es-PE').format(Number(value) || 0)

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(Number(value) || 0)

const formatDate = (value) => {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
  }).format(date)
}

export default function Reportes() {
  const [operations, setOperations] = useState([])
  const [inventory, setInventory] = useState([])
  const [period, setPeriod] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadReports = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [operationsData, inventoryData] = await Promise.all([
        getReportOperations(),
        getReportInventory(),
      ])

      setOperations(
        Array.isArray(operationsData) ? operationsData : [],
      )
      setInventory(
        Array.isArray(inventoryData) ? inventoryData : [],
      )
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los reportes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = DEMO_DATA_MODE
      ? subscribeDemoStore(loadReports)
      : undefined

    Promise.resolve().then(loadReports)

    return unsubscribe
  }, [loadReports])

  const filteredOperations = useMemo(() => {
    if (period === 'all') return operations

    const days = Number(period)
    const limit = new Date()
    limit.setHours(0, 0, 0, 0)
    limit.setDate(limit.getDate() - days + 1)

    return operations.filter((operation) => {
      if (!operation.fecha) return false

      const date = new Date(operation.fecha)

      return !Number.isNaN(date.getTime()) && date >= limit
    })
  }, [operations, period])

  const sales = filteredOperations.filter(
    (operation) => operation.tipo === 'venta',
  )
  const purchases = filteredOperations.filter(
    (operation) => operation.tipo === 'compra',
  )

  const salesTotal = sales.reduce(
    (total, operation) => total + Number(operation.total || 0),
    0,
  )
  const purchasesTotal = purchases.reduce(
    (total, operation) => total + Number(operation.total || 0),
    0,
  )

  const lowStockProducts = inventory.filter(
    (product) =>
      Number(product.stock || 0) <= Number(product.stock_minimo ?? 10),
  )

  const totalUnits = inventory.reduce(
    (total, product) => total + Number(product.stock || 0),
    0,
  )

  const cards = [
    {
      title: 'Total de ventas',
      value: formatCurrency(salesTotal),
      detail: `${formatNumber(sales.length)} operaciones`,
      icon: TrendingUp,
    },
    {
      title: 'Total de compras',
      value: formatCurrency(purchasesTotal),
      detail: `${formatNumber(purchases.length)} operaciones`,
      icon: ShoppingCart,
    },
    {
      title: 'Productos registrados',
      value: formatNumber(inventory.length),
      detail: `${formatNumber(totalUnits)} unidades disponibles`,
      icon: Package,
    },
    {
      title: 'Productos con stock bajo',
      value: formatNumber(lowStockProducts.length),
      detail: 'Igual o por debajo del stock mínimo',
      icon: AlertTriangle,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Reportes
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Resumen de ventas, compras e inventario.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            aria-label="Filtrar reportes por período"
          >
            <option value="all">Todo el historial</option>
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
          </select>

          <button
            type="button"
            onClick={loadReports}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Cargando reportes...
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon

              return (
                <article
                  key={card.title}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-500">
                      {card.title}
                    </p>
                    <Icon className="shrink-0 text-teal-600" size={20} />
                  </div>

                  <p className="mt-3 text-2xl font-bold text-slate-800">
                    {card.value}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    {card.detail}
                  </p>
                </article>
              )
            })}
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-800">
                  Resumen de operaciones
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {formatNumber(filteredOperations.length)} operaciones en el período seleccionado.
                </p>
              </div>

              <BarChart3 className="text-teal-600" size={22} />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-3 font-semibold">Identificador</th>
                    <th className="p-3 font-semibold">Tipo</th>
                    <th className="p-3 font-semibold">Contacto</th>
                    <th className="p-3 font-semibold">Fecha</th>
                    <th className="p-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOperations.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="p-8 text-center text-slate-500"
                      >
                        No hay operaciones para el período seleccionado.
                      </td>
                    </tr>
                  ) : (
                    filteredOperations.map((operation) => (
                      <tr
                        key={operation.id_operacion}
                        className="border-b last:border-0 hover:bg-slate-50"
                      >
                        <td className="p-3 font-medium text-slate-700">
                          #{operation.id_operacion}
                        </td>
                        <td className="p-3">
                          <span
                            className={
                              operation.tipo === 'venta'
                                ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700'
                                : 'rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700'
                            }
                          >
                            {operation.tipo === 'venta' ? 'Venta' : 'Compra'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">
                          {operation.nombre_contacto || 'Contacto general'}
                        </td>
                        <td className="p-3 text-slate-600">
                          {formatDate(operation.fecha)}
                        </td>
                        <td className="p-3 text-right font-medium text-slate-800">
                          {formatCurrency(operation.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="font-semibold text-slate-800">
                Estado del inventario
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Existencias actuales comparadas con el stock mínimo.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-3 font-semibold">Producto</th>
                    <th className="p-3 font-semibold">Categoría</th>
                    <th className="p-3 text-right font-semibold">Stock</th>
                    <th className="p-3 text-right font-semibold">Mínimo</th>
                    <th className="p-3 text-right font-semibold">Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {inventory.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="p-8 text-center text-slate-500"
                      >
                        No hay productos de inventario disponibles.
                      </td>
                    </tr>
                  ) : (
                    inventory.map((product) => {
                      const stock = Number(product.stock || 0)
                      const minimum = Number(product.stock_minimo ?? 10)
                      const low = stock <= minimum

                      return (
                        <tr
                          key={product.id_producto}
                          className="border-b last:border-0"
                        >
                          <td className="p-3 font-medium text-slate-700">
                            {product.nombre}
                          </td>
                          <td className="p-3 text-slate-500">
                            {product.categoria || '-'}
                          </td>
                          <td className="p-3 text-right text-slate-700">
                            {formatNumber(stock)}
                          </td>
                          <td className="p-3 text-right text-slate-500">
                            {formatNumber(minimum)}
                          </td>
                          <td className="p-3 text-right">
                            <span
                              className={
                                low
                                  ? 'rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700'
                                  : 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700'
                              }
                            >
                              {low ? 'Stock bajo' : 'Normal'}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
