import { ArrowUpRight, CreditCard, Info, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PAYMENT_METHODS } from '../../services/paymentService'

const labels = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  yape: 'Yape',
  plin: 'Plin',
  transferencia: 'Transferencia',
}

export default function Pagos() {
  return (
    <section className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-800">Métodos de pago</h1><p className="mt-1 text-sm text-slate-500">Los pagos se registran como parte de cada venta.</p></div>

      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-5 text-blue-800">
        <Info size={21} className="mt-0.5 shrink-0" />
        <div><p className="font-semibold">No existe un módulo de pagos separado</p><p className="mt-1 text-sm leading-6">La API no expone endpoints de pagos ni abonos parciales. El método se selecciona al confirmar la venta y queda guardado dentro de ella.</p></div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4"><div className="rounded-lg bg-teal-50 p-2.5 text-teal-700"><WalletCards size={21} /></div><div><h2 className="font-semibold text-slate-800">Métodos disponibles</h2><p className="text-xs text-slate-500">Opciones admitidas al registrar una venta.</p></div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PAYMENT_METHODS.map((method) => <div key={method} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><div className="rounded-lg bg-slate-50 p-2 text-slate-500"><CreditCard size={18} /></div><span className="text-sm font-semibold text-slate-700">{labels[method]}</span></div>)}
        </div>
        <div className="mt-6 flex justify-end"><Link to="/ventas" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700">Ir a ventas<ArrowUpRight size={17} /></Link></div>
      </div>
    </section>
  )
}
