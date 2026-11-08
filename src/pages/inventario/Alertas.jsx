import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  CalendarClock,
  LoaderCircle,
  PackageMinus,
  RefreshCw,
} from 'lucide-react'
import { getErrorMessage } from '../../services/apiErrors'
import {
  getExpirationAlerts,
  getReplenishmentAlerts,
} from '../../services/inventoryService'

const tabs = [
  { id: 'reposicion', label: 'Reposición', icon: PackageMinus },
  { id: 'vencimiento', label: 'Vencimiento', icon: CalendarClock },
]

const productName = (item) =>
  item.nombre_producto ?? item.producto?.nombre ?? item.nombre ?? 'Producto'

const alertStatus = (item, type) => {
  if (type === 'reposicion') {
    return String(item.nivel_stock ?? item.estado ?? 'bajo').toLowerCase()
  }
  const explicit = item.estado_alerta ?? item.nivel_alerta ?? item.estado
  if (explicit) return String(explicit).toLowerCase().replaceAll('_', ' ')
  const days = Number(item.dias_restantes ?? item.dias_para_vencer)
  if (days < 0) return 'vencido'
  if (days <= 30) return 'crítico'
  return 'por vencer'
}

const statusClass = (status) => {
  if (status.includes('agotado') || status.includes('vencido')) {
    return 'bg-red-50 text-red-700'
  }
  if (status.includes('crítico') || status.includes('critico') || status.includes('bajo')) {
    return 'bg-amber-50 text-amber-700'
  }
  return 'bg-blue-50 text-blue-700'
}

export default function Alertas() {
  const [activeTab, setActiveTab] = useState('reposicion')
  const replenishmentQuery = useQuery({
    queryKey: ['alertas', 'reposicion'],
    queryFn: getReplenishmentAlerts,
  })
  const expirationQuery = useQuery({
    queryKey: ['alertas', 'vencimiento'],
    queryFn: getExpirationAlerts,
  })
  const activeQuery = activeTab === 'reposicion'
    ? replenishmentQuery
    : expirationQuery
  const records = activeQuery.data ?? []

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><h1 className="text-2xl font-bold text-slate-800">Alertas de inventario</h1><p className="mt-1 text-sm text-slate-500">Revisa productos por reponer y lotes próximos a vencer.</p></div>
        <button type="button" onClick={() => activeQuery.refetch()} disabled={activeQuery.isFetching} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={17} className={activeQuery.isFetching ? 'animate-spin' : ''} />Actualizar</button>
      </div>

      <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setActiveTab(id)} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${activeTab === id ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Icon size={18} />{label}
            <span className={`rounded-full px-2 py-0.5 text-xs ${activeTab === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {(id === 'reposicion' ? replenishmentQuery.data : expirationQuery.data)?.length ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {activeQuery.isError ? (
          <div className="m-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={20} className="shrink-0" />{getErrorMessage(activeQuery.error)}</div>
        ) : activeQuery.isPending ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><LoaderCircle size={20} className="animate-spin" />Cargando alertas...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center"><AlertCircle size={34} className="mx-auto mb-3 text-slate-300" /><p className="font-medium text-slate-600">No hay alertas en esta categoría</p></div>
        ) : activeTab === 'reposicion' ? (
          <ReplenishmentTable records={records} />
        ) : (
          <ExpirationTable records={records} />
        )}
        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">{records.length} alertas</div>
      </div>
    </section>
  )
}

function ReplenishmentTable({ records }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-150 text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Producto</th><th className="px-5 py-4">Stock disponible</th><th className="px-5 py-4">Stock mínimo</th><th className="px-5 py-4">Estado</th></tr></thead><tbody className="divide-y divide-slate-100">{records.map((item, index) => { const status = alertStatus(item, 'reposicion'); return <tr key={item.id_producto ?? index}><td className="px-5 py-4 font-semibold text-slate-800">{productName(item)}</td><td className="px-5 py-4 text-slate-600">{item.stock_disponible ?? item.stock ?? 0}</td><td className="px-5 py-4 text-slate-600">{item.stock_minimo ?? 0}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(status)}`}>{status}</span></td></tr> })}</tbody></table></div>
}

function ExpirationTable({ records }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-180 text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Producto</th><th className="px-5 py-4">Lote</th><th className="px-5 py-4">Vencimiento</th><th className="px-5 py-4">Días restantes</th><th className="px-5 py-4">Estado</th></tr></thead><tbody className="divide-y divide-slate-100">{records.map((item, index) => { const status = alertStatus(item, 'vencimiento'); const days = item.dias_restantes ?? item.dias_para_vencer; return <tr key={item.id_lote ?? index}><td className="px-5 py-4 font-semibold text-slate-800">{productName(item)}</td><td className="px-5 py-4 text-slate-600">{item.codigo_lote ?? '—'}</td><td className="px-5 py-4 text-slate-600">{formatDate(item.fecha_vencimiento)}</td><td className="px-5 py-4 font-medium text-slate-700">{days != null ? `${days} días` : '—'}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(status)}`}>{status}</span></td></tr> })}</tbody></table></div>
}

function formatDate(value) {
  if (!value) return '—'
  const [year, month, day] = String(value).slice(0, 10).split('-')
  return year && month && day ? `${day}/${month}/${year}` : String(value)
}
