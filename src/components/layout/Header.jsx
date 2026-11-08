import { LogOut, Menu } from 'lucide-react'
import { useAuth } from '../../context/useAuth'

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth()

  const initials = (user?.nombre || 'Usuario')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')

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
            onClick={logout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={19} />
          </button>
        </div>
      </div>
    </header>
  )
}
