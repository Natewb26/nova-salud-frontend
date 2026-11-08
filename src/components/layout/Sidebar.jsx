import {
  Bell,
  Boxes,
  ChartNoAxesCombined,
  CreditCard,
  LayoutDashboard,
  Package,
  Pill,
  RotateCcw,
  ShoppingCart,
  Tags,
  Truck,
  Users,
  X,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

const menuGroups = [
  {
    title: 'PRINCIPAL',
    items: [
      {
        name: 'Dashboard',
        path: '/dashboard',
        icon: LayoutDashboard,
        roles: ['admin'],
      },
    ],
  },
  {
    title: 'GESTIÓN COMERCIAL',
    items: [
      { name: 'Productos', path: '/productos', icon: Package },
      { name: 'Categorías', path: '/categorias', icon: Tags },
      {
        name: 'Proveedores',
        path: '/proveedores',
        icon: Truck,
        roles: ['admin'],
      },
      {
        name: 'Compras',
        path: '/compras',
        icon: ShoppingCart,
        roles: ['admin'],
      },
    ],
  },
  {
    title: 'OPERACIONES',
    items: [
      { name: 'Inventario', path: '/inventario', icon: Boxes },
      { name: 'Clientes', path: '/clientes', icon: Users },
      { name: 'Ventas', path: '/ventas', icon: CreditCard },
      { name: 'Métodos de pago', path: '/pagos', icon: CreditCard },
      {
        name: 'Anular ventas',
        path: '/devoluciones',
        icon: RotateCcw,
        roles: ['admin'],
      },
    ],
  },
  {
    title: 'ANÁLISIS',
    items: [
      {
        name: 'Alertas',
        path: '/alertas',
        icon: Bell,
      },
      {
        name: 'Kardex',
        path: '/kardex',
        icon: Boxes,
        roles: ['admin'],
      },
      {
        name: 'Reportes',
        path: '/reportes',
        icon: ChartNoAxesCombined,
        roles: ['admin'],
      },
    ],
  },
]

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const { hasRole } = useAuth()

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex min-h-screen w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:z-auto lg:w-64 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
              <Pill size={23} />
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-800">
                Nova Salud
              </h1>
              <p className="text-xs text-slate-500">Sistema de gestión</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          {menuGroups.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.roles || hasRole(...item.roles),
            )

            if (visibleItems.length === 0) return null

            return (
              <div key={group.title} className="mb-7">
                <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.15em] text-slate-400">
                  {group.title}
                </p>

                <nav className="space-y-1" aria-label={group.title}>
                  {visibleItems.map((item) => {
                    const Icon = item.icon

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                            isActive
                              ? 'bg-teal-50 text-teal-700'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`
                        }
                      >
                        <Icon size={18} />
                        {item.name}
                      </NavLink>
                    )
                  })}
                </nav>
              </div>
            )
          })}
        </div>

        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
              NS
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Nova Salud</p>
              <p className="text-xs text-slate-500">Panel administrativo</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
