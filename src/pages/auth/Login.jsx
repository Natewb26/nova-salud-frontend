import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LockKeyhole, Mail, Pill, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/useAuth'

const DEMO_MODE =
  import.meta.env.DEV && import.meta.env.VITE_DEMO_AUTH === 'true'

export default function Login() {
  const { login, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">Verificando sesión...</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login({ email: email.trim(), password })

      const destination = location.state?.from?.pathname || '/dashboard'
      navigate(destination, { replace: true })
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'No se pudo iniciar sesión. Inténtalo nuevamente.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20">
            <Pill size={32} />
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-800">
            Nova Salud
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Sistema de gestión de farmacia
          </p>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-800">
            Iniciar sesión
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Ingresa tus credenciales para continuar.
          </p>
          {DEMO_MODE && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left">
              <p className="text-sm font-semibold text-amber-800">
                Modo de demostración
              </p>
              <p className="mt-1 text-xs text-amber-700">
                Correo: admin@novasalud.test
              </p>
              <p className="text-xs text-amber-700">
                Contraseña: NovaSalud2026!
              </p>
              <p className="mt-2 text-xs text-amber-700">
                Acceso temporal para pruebas locales. No utiliza datos reales.
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Correo electrónico
            </label>

            <div className="flex items-center gap-3 rounded-lg border border-slate-300 px-3 focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-100">
              <Mail size={18} className="text-slate-400" />

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="usuario@novasalud.com"
                autoComplete="username"
                required
                className="w-full py-3 text-sm text-slate-700 outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Contraseña
            </label>

            <div className="flex items-center gap-3 rounded-lg border border-slate-300 px-3 focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-100">
              <LockKeyhole size={18} className="text-slate-400" />

              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                required
                className="w-full py-3 text-sm text-slate-700 outline-none"
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-teal-600 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Ingresando...' : 'Ingresar al sistema'}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-slate-400">
          © 2026 Nova Salud. Sistema de gestión.
        </p>
      </section>
    </main>
  )
}
