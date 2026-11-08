import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CalendarClock,
  LoaderCircle,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react'
import { getErrorMessage } from '../../services/apiErrors'
import { getReportSummary } from '../../services/reportService'

const money = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
})
const number = new Intl.NumberFormat('es-PE')

const salesMetric = (summary, period) => {
  const source =
    summary[`ventas_${period}`] ??
    summary.ventas?.[period] ??
    summary[period] ??
    {}
  return {
    cantidad: Number(source.cantidad ?? source.total_ventas ?? source.numero_ventas ?? 0),
    total: Number(source.total ?? source.monto_total ?? source.importe ?? 0),
  }
}

const productQuantity = (product) =>
  Number(product.cantidad ?? product.cantidad_vendida ?? product.unidades ?? 0)

const productTotal = (product) =>
  Number(product.total ?? product.total_vendido ?? product.monto ?? 0)

const productName = (product) =>
  product.nombre ?? product.nombre_producto ?? product.producto?.nombre ??
  `Producto #${product.id_producto ?? product.id ?? '—'}`

export default function Reportes() {
  const reportQuery = useQuery({
    queryKey: ['reportes', 'resumen'],
    queryFn: getReportSummary,
  })
  const summary = reportQuery.data ?? {}
  const today = salesMetric(summary, 'hoy')
  const month = salesMetric(summary, 'mes')
  const topProducts = (
    summary.top_productos ??
    summary.top_productos_mes ??
    summary.productos_mas_vendidos ??
    []
  ).slice(0, 5)
  const alerts = summary.alertas ?? summary.contadores_alertas ?? {}
  const replenishment = Number(
    alerts.reposicion ?? alerts.stock ?? alerts.stock_bajo ?? 0,
  )
  const expiration = Number(
    alerts.vencimiento ?? alerts.por_vencer ?? 0,
  )
  const totalAlerts = Number(
    alerts.total ?? replenishment + expiration,
  )
  const averageToday = today.cantidad ? today.total / today.cantidad : 0
  const averageMonth = month.cantidad ? month.total / month.cantidad : 0
  const todayShare = month.total > 0
    ? Math.min(100, (today.total / month.total) * 100)
    : 0
  const maxQuantity = Math.max(1, ...topProducts.map(productQuantity))

  const cards = [
    {
      title: 'Ventas de hoy',
      value: money.format(today.total),
      detail: `${number.format(today.cantidad)} operaciones`,
      icon: TrendingUp,
    },
    {
      title: 'Ventas del mes',
      value: money.format(month.total),
      detail: `${number.format(month.cantidad)} operaciones`,
      icon: CalendarDays,
    },
    {
      title: 'Ticket promedio mensual',
      value: money.format(averageMonth),
      detail: `Hoy: ${money.format(averageToday)}`,
      icon: ShoppingCart,
    },
    {
      title: 'Alertas activas',
      value: number.format(totalAlerts),
      detail: `${replenishment} de stock · ${expiration} de vencimiento`,
      icon: AlertTriangle,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reportes y analítica</h1>
          <p className="mt-1 text-sm text-slate-500">Indicadores comerciales del día y del mes actual.</p>
        </div>
        <button type="button" onClick={() => reportQuery.refetch()} disabled={reportQuery.isFetching} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
          <RefreshCw size={17} className={reportQuery.isFetching ? 'animate-spin' : ''} />
          Actualizar datos
        </button>
      </div>

      {reportQuery.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getErrorMessage(reportQuery.error)}
        </div>
      )}

      {reportQuery.isPending ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-14 text-sm text-slate-500">
          <LoaderCircle size={21} className="animate-spin text-teal-600" />
          Cargando analítica...
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ title, value, detail, icon: Icon }) => (
              <article key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-500">{title}</p>
                  <div className="rounded-lg bg-teal-50 p-2.5 text-teal-700"><Icon size={21} /></div>
                </div>
                <p className="mt-4 text-2xl font-bold text-slate-800">{value}</p>
                <p className="mt-2 text-xs text-slate-400">{detail}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div><h2 className="font-semibold text-slate-800">Rendimiento de ventas</h2><p className="mt-1 text-xs text-slate-500">Participación de las ventas de hoy en el total mensual.</p></div>
                <BarChart3 size={22} className="text-teal-600" />
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Metric label="Operaciones de hoy" value={number.format(today.cantidad)} helper={`${month.cantidad} en el mes`} />
                <Metric label="Ingreso de hoy" value={money.format(today.total)} helper={`${todayShare.toFixed(1)}% del ingreso mensual`} />
              </div>
              <div className="mt-6">
                <div className="mb-2 flex justify-between text-xs text-slate-500"><span>Avance respecto al mes</span><span>{todayShare.toFixed(1)}%</span></div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${todayShare}%` }} /></div>
              </div>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div><h2 className="font-semibold text-slate-800">Estado de alertas</h2><p className="mt-1 text-xs text-slate-500">Situaciones que requieren atención.</p></div>
              <div className="mt-5 space-y-4">
                <AlertMetric icon={AlertTriangle} label="Reposición" value={replenishment} color="red" />
                <AlertMetric icon={CalendarClock} label="Vencimiento" value={expiration} color="amber" />
              </div>
              <Link to="/alertas" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">Ver detalle de alertas<ArrowUpRight size={15} /></Link>
            </article>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div><h2 className="font-semibold text-slate-800">Top 5 productos del mes</h2><p className="mt-1 text-xs text-slate-500">Clasificación por unidades vendidas.</p></div>
              <Package size={22} className="text-teal-600" />
            </div>
            <div className="divide-y divide-slate-100">
              {topProducts.map((product, index) => {
                const quantity = productQuantity(product)
                const width = (quantity / maxQuantity) * 100
                return (
                  <div key={product.id_producto ?? product.id ?? index} className="grid gap-3 px-5 py-4 md:grid-cols-[2rem_1fr_7rem_8rem] md:items-center">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700">{index + 1}</span>
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{productName(product)}</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-500" style={{ width: `${width}%` }} /></div></div>
                    <p className="text-sm text-slate-600"><span className="font-semibold text-slate-800">{number.format(quantity)}</span> unidades</p>
                    <p className="text-sm font-semibold text-slate-800 md:text-right">{money.format(productTotal(product))}</p>
                  </div>
                )
              })}
              {topProducts.length === 0 && <div className="p-12 text-center text-sm text-slate-400"><Package size={32} className="mx-auto mb-3 text-slate-300" />Todavía no hay ventas del mes para construir el ranking.</div>}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function Metric({ label, value, helper }) {
  return <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-medium uppercase text-slate-400">{label}</p><p className="mt-2 text-xl font-bold text-slate-800">{value}</p><p className="mt-1 text-xs text-slate-500">{helper}</p></div>
}

function AlertMetric({ icon: Icon, label, value, color }) {
  const classes = color === 'red' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
  return <div className="flex items-center justify-between rounded-xl border border-slate-100 p-4"><span className="flex items-center gap-3"><span className={`rounded-lg p-2 ${classes}`}><Icon size={18} /></span><span className="text-sm font-medium text-slate-700">{label}</span></span><span className="text-xl font-bold text-slate-800">{value}</span></div>
}
