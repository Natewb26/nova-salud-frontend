import { useState } from 'react'
import {
  Boxes,
  CalendarClock,
  ClipboardList,
  Package,
} from 'lucide-react'

import Stock from './Stock'
import Lotes from './Lotes'
import Movimientos from './Movimientos'
import Alertas from './Alertas'

const sections = [
  { id: 'stock', label: 'Stock', icon: Boxes },
  { id: 'lotes', label: 'Lotes', icon: Package },
  { id: 'movimientos', label: 'Movimientos', icon: ClipboardList },
  { id: 'alertas', label: 'Alertas', icon: CalendarClock },
]

export default function Inventario() {
  const [activeSection, setActiveSection] = useState('stock')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Inventario
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Controla las existencias, los lotes y los movimientos de productos.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveSection(id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              activeSection === id
                ? 'bg-teal-600 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>

      {activeSection === 'stock' && <Stock />}
      {activeSection === 'lotes' && <Lotes />}
      {activeSection === 'movimientos' && <Movimientos />}
      {activeSection === 'alertas' && <Alertas />}
    </div>
  )
}
