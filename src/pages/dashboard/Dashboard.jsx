import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Package,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  ClipboardList,
  RefreshCw,
  Clock,
  CalendarClock,
} from 'lucide-react'

import { DEMO_DATA_MODE } from '../../services/dataMode'
import {
  getDemoState,
  subscribeDemoStore,
} from '../../services/demoStore'
import {
  getReportOperations,
  getReportInventory,
} from '../../services/reportService'
import {
  getReplenishmentAlerts,
  getExpirationAlerts,
} from '../../services/inventoryService'

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(Number(value) || 0)

const formatDateTime = (value) => {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

const getTodaySales = (operations) => {
  const today = new Date().toLocaleDateString('en-CA')

  return operations
    .filter((operation) => {
      if (operation.tipo !== 'venta' || !operation.fecha) return false

      return new Date(operation.fecha).toLocaleDateString('en-CA') === today
    })
    .reduce((total, operation) => total + Number(operation.total || 0), 0)
}

const quickActions = [
  {
    label: 'Registrar venta',
    description: 'Crear una nueva venta',
    icon: ShoppingCart,
    to: '/ventas',
  },
  {
    label: 'Agregar producto',
    description: 'Gestionar el catálogo',
    icon: Plus,
    to: '/productos',
  },
  {
    label: 'Registrar compra',
    description: 'Ingresar mercadería',
    icon: ClipboardList,
    to: '/compras',
  },
]

export default function Dashboard() {
  const [data, setData] = useState({
    operations: [],
    inventory: [],
    replenishmentAlerts: [],
    expirationAlerts: [],
    contacts: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    setError('')

    try {
      const [
        operations,
        inventory,
        replenishmentAlerts,
        expirationAlerts,
      ] = await Promise.all([
        getReportOperations(),
        getReportInventory(),
        getReplenishmentAlerts(),
        getExpirationAlerts(),
      ])

      const contacts = DEMO_DATA_MODE
        ? getDemoState().contacts
        : []

      setData({
        operations,
        inventory,
        replenishmentAlerts,
        expirationAlerts,
        contacts,
      })
    } catch (err) {
      setError(err.message || 'No se pudo cargar el Dashboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = DEMO_DATA_MODE
      ? subscribeDemoStore(loadDashboard)
      : undefined

    Promise.resolve().then(loadDashboard)

    return unsubscribe
  }, [loadDashboard])

  const salesToday = getTodaySales(data.operations)
  const salesCount = data.operations.filter(
    (operation) => operation.tipo === 'venta',
  ).length
  const purchaseCount = data.operations.filter(
    (operation) => operation.tipo === 'compra',
  ).length
  const alertCount =
    data.replenishmentAlerts.length + data.expirationAlerts.length

  const statistics = [
    {
      title: 'Ventas del día',
      value: formatCurrency(salesToday),
      description: 'Total vendido hoy',
      icon: TrendingUp,
    },
    {
      title: 'Productos registrados',
      value: data.inventory.length.toLocaleString('es-PE'),
      description: 'Productos en el catálogo',
      icon: Package,
    },
    {
      title: 'Operaciones registradas',
      value: data.operations.length.toLocaleString('es-PE'),
      description: `${salesCount} ventas · ${purchaseCount} compras`,
      icon: ClipboardList,
    },
    {
      title: 'Alertas de inventario',
      value: alertCount.toLocaleString('es-PE'),
      description: `${data.replenishmentAlerts.length} de stock · ${data.expirationAlerts.length} por vencer`,
      icon: AlertTriangle,
    },
  ]

  const recentOperations = data.operations.slice(0, 5)

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Bienvenido a Nova Salud
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Resumen actualizado de la actividad de tu farmacia.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboard}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} />
          Actualizar
        </button>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Cargando información del Dashboard...
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {statistics.map((stat) => {
              const Icon = stat.icon

              return (
                <article
                  key={stat.title}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-500">
                      {stat.title}
                    </p>
                    <div className="rounded-lg bg-teal-50 p-2.5 text-teal-700">
                      <Icon size={21} />
                    </div>
                  </div>

                  <h2 className="mt-4 text-2xl font-bold text-slate-800">
                    {stat.value}
                  </h2>

                  <p className="mt-3 text-xs text-slate-400">
                    {stat.description}
                  </p>
                </article>
              )
            })}
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-800">
                    Actividad reciente
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Últimas compras y ventas registradas.
                  </p>
                </div>

                <Link
                  to="/reportes"
                  className="text-sm font-medium text-teal-700 hover:text-teal-800"
                >
                  Ver reportes
                </Link>
              </div>

              <div className="mt-5 divide-y divide-slate-100">
                {recentOperations.length === 0 ? (
                  <div className="py-8 text-center">
                    <Clock className="mx-auto text-slate-300" size={28} />
                    <p className="mt-3 text-sm text-slate-500">
                      Todavía no hay operaciones registradas.
                    </p>
                  </div>
                ) : (
                  recentOperations.map((operation) => (
                    <div
                      key={operation.id_operacion}
                      className="flex flex-col justify-between gap-2 py-4 sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="text-sm font-medium capitalize text-slate-800">
                          {operation.tipo === 'venta'
                            ? 'Venta registrada'
                            : 'Compra registrada'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {`#${operation.id_operacion} · ${operation.nombre_contacto || 'Contacto general'}`}
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-sm font-semibold text-slate-800">
                          {formatCurrency(operation.total)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatDateTime(operation.fecha)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <h2 className="font-semibold text-slate-800">
                  Accesos rápidos
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Operaciones frecuentes.
                </p>
              </div>

              <div className="space-y-3">
                {quickActions.map((action) => {
                  const Icon = action.icon

                  return (
                    <Link
                      key={action.to}
                      to={action.to}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-teal-300 hover:bg-teal-50"
                    >
                      <span className="flex items-center gap-3">
                        <Icon size={19} className="shrink-0 text-teal-700" />
                        <span>
                          <span className="block text-sm font-medium text-slate-700">
                            {action.label}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-400">
                            {action.description}
                          </span>
                        </span>
                      </span>
                      <ArrowUpRight
                        size={17}
                        className="shrink-0 text-slate-400"
                      />
                    </Link>
                  )
                })}
              </div>

              <div className="rounded-lg bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle size={19} />
                  <p className="text-sm font-semibold">
                    Atención de inventario
                  </p>
                </div>

                <p className="mt-2 text-xs leading-5 text-amber-800">
                  {alertCount > 0
                    ? `Hay ${data.replenishmentAlerts.length} productos con stock bajo y ${data.expirationAlerts.length} lotes próximos a vencer.`
                    : 'No hay alertas de stock bajo ni lotes próximos a vencer.'}
                </p>

                <Link
                  to="/inventario"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:underline"
                >
                  Revisar inventario
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700">
                <ShoppingCart size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Compras registradas
                </p>
                <p className="text-xs text-slate-500">
                  {purchaseCount} operaciones
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="rounded-lg bg-violet-50 p-2.5 text-violet-700">
                <CalendarClock size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Contactos registrados
                </p>
                <p className="text-xs text-slate-500">
                  {DEMO_DATA_MODE
                    ? `${data.contacts.length} clientes y proveedores`
                    : 'Información disponible al integrar contactos'}
                </p>
              </div>
            </div>
          </section>
        </>
      )}

      <p className="text-xs text-slate-400">
        Los indicadores se calculan a partir de las operaciones y los datos de inventario disponibles.
      </p>
    </div>
  )
}
