import { useQuery } from '@tanstack/react-query'
import { Bell, LogOut, Menu } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { getAlertSummary } from '../../services/inventoryService'

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const alertsQuery = useQuery({
    queryKey: ['alertas', 'resumen'],
    queryFn: getAlertSummary,
    refetchInterval: 30000,
  })
  const alertTotal = Number(
    alertsQuery.data?.total ??
    alertsQuery.data?.total_alertas ??
    Number(alertsQuery.data?.reposicion ?? 0) +
      Number(alertsQuery.data?.vencimiento ?? 0),
  )

  const initials = (user?.nombre || 'Usuario')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menú de navegación"
          aria-expanded={undefined}
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
        >
          <Menu size={22} />
        </button>

        <div className="min-w-0">
          <p className="hidden text-sm text-slate-500 sm:block">
            Sistema de gestión
          </p>
          <h2 className="truncate text-base font-semibold text-slate-800 sm:text-lg">
            Panel administrativo
          </h2>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <Link
          to="/alertas"
          title="Ver alertas"
          aria-label={`${alertTotal} alertas de inventario`}
          className="relative rounded-lg p-2 text-slate-500 transition hover:bg-amber-50 hover:text-amber-700"
        >
          <Bell size={20} />
          {alertTotal > 0 && (
            <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {alertTotal > 99 ? '99+' : alertTotal}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 sm:border-l sm:border-slate-200 sm:pl-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
            {initials}
          </div>

          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-800">
              {user?.nombre || 'Usuario'}
            </p>
            <p className="text-xs capitalize text-slate-500">
              {user?.rol || 'Sin rol'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="flex items-center gap-2 rounded-lg p-2 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={19} />
            <span className="hidden md:inline">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </header>
  )
}
