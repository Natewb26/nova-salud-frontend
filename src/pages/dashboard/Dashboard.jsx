import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowUpRight,
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

const salesMetric = (summary, period) => {
  const source = summary[`ventas_${period}`] ?? summary[period] ?? {}
  return {
    cantidad: Number(source.cantidad ?? source.total_ventas ?? 0),
    total: Number(source.total ?? source.monto_total ?? 0),
  }
}

export default function Dashboard() {
  const summaryQuery = useQuery({
    queryKey: ['reportes', 'resumen'],
    queryFn: getReportSummary,
  })
  const summary = summaryQuery.data ?? {}
  const today = salesMetric(summary, 'hoy')
  const month = salesMetric(summary, 'mes')
  const topProducts = (
    summary.top_productos ?? summary.top_productos_mes ?? summary.productos_mas_vendidos ?? []
  ).slice(0, 5)
  const alerts = summary.alertas ?? summary.contadores_alertas ?? {}
  const replenishment = Number(alerts.reposicion ?? alerts.stock ?? alerts.stock_bajo ?? 0)
  const expiration = Number(alerts.vencimiento ?? alerts.por_vencer ?? 0)

  const statistics = [
    { title: 'Ventas de hoy', value: money.format(today.total), description: `${today.cantidad} ventas`, icon: TrendingUp },
    { title: 'Ventas del mes', value: money.format(month.total), description: `${month.cantidad} ventas`, icon: CalendarDays },
    { title: 'Alertas de reposición', value: replenishment, description: 'Productos agotados o con stock bajo', icon: AlertTriangle },
    { title: 'Alertas de vencimiento', value: expiration, description: 'Lotes que requieren atención', icon: CalendarClock },
  ]

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><h1 className="text-2xl font-bold text-slate-800">Dashboard</h1><p className="mt-1 text-sm text-slate-500">Resumen comercial y de inventario de Nova Salud.</p></div>
        <button type="button" onClick={() => summaryQuery.refetch()} disabled={summaryQuery.isFetching} className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={16} className={summaryQuery.isFetching ? 'animate-spin' : ''} />Actualizar</button>
      </section>

      {summaryQuery.isError && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{getErrorMessage(summaryQuery.error)}</div>}

      {summaryQuery.isPending ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-12 text-sm text-slate-500"><LoaderCircle size={20} className="animate-spin" />Cargando resumen...</div>
      ) : (
        <>
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {statistics.map(({ title, value, description, icon: Icon }) => (
              <article key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-500">{title}</p><div className="rounded-lg bg-teal-50 p-2.5 text-teal-700"><Icon size={21} /></div></div>
                <h2 className="mt-4 text-2xl font-bold text-slate-800">{value}</h2><p className="mt-3 text-xs text-slate-400">{description}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
              <div className="border-b border-slate-100 p-5"><h2 className="font-semibold text-slate-800">Top 5 productos del mes</h2><p className="mt-1 text-xs text-slate-500">Productos con mayor cantidad vendida.</p></div>
              <div className="overflow-x-auto"><table className="w-full min-w-125 text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Posición</th><th className="px-5 py-4">Producto</th><th className="px-5 py-4">Cantidad</th><th className="px-5 py-4">Total</th></tr></thead><tbody className="divide-y divide-slate-100">
                {topProducts.map((product, index) => <tr key={product.id_producto ?? product.id ?? index}><td className="px-5 py-4"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700">{index + 1}</span></td><td className="px-5 py-4 font-semibold text-slate-800">{product.nombre ?? product.nombre_producto ?? product.producto?.nombre ?? `Producto #${product.id_producto}`}</td><td className="px-5 py-4 text-slate-600">{product.cantidad ?? product.cantidad_vendida ?? 0}</td><td className="px-5 py-4 font-medium text-slate-700">{money.format(Number(product.total ?? product.total_vendido ?? 0))}</td></tr>)}
                {topProducts.length === 0 && <tr><td colSpan="4" className="p-10 text-center text-slate-400"><Package size={30} className="mx-auto mb-2 text-slate-300" />No hay ventas del mes para mostrar.</td></tr>}
              </tbody></table></div>
            </div>

            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div><h2 className="font-semibold text-slate-800">Accesos rápidos</h2><p className="mt-1 text-xs text-slate-500">Operaciones frecuentes.</p></div>
              <QuickLink to="/ventas" icon={ShoppingCart} title="Registrar venta" />
              <QuickLink to="/compras" icon={Package} title="Registrar compra" />
              <QuickLink to="/alertas" icon={AlertTriangle} title="Revisar alertas" />
              <QuickLink to="/kardex" icon={CalendarClock} title="Consultar kardex" />
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function QuickLink({ to, icon: Icon, title }) {
  return <Link to={to} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm font-medium text-slate-700 hover:border-teal-300 hover:bg-teal-50"><span className="flex items-center gap-3"><Icon size={19} className="text-teal-700" />{title}</span><ArrowUpRight size={17} className="text-slate-400" /></Link>
}
