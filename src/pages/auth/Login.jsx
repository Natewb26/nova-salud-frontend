import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  Pill,
} from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { getErrorMessage, getFieldErrors } from '../../services/apiErrors'
import { DEMO_DATA_MODE } from '../../services/dataMode'
import { getRoleHome } from '../../routes/roleHome'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const { login, user, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-teal-600" size={40} />
          <p className="mt-4 text-sm text-slate-500">
            Verificando sesión...
          </p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={getRoleHome(user?.rol)} replace />
  }

  const validateForm = () => {
    const normalizedEmail = email.trim()
    const nextErrors = {}

    if (!normalizedEmail) {
      nextErrors.email = 'Ingresa tu correo electrónico'
    } else if (normalizedEmail.length > 254) {
      nextErrors.email = 'El correo no puede superar los 254 caracteres'
    } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
      nextErrors.email = 'Ingresa un correo electrónico válido'
    }

    if (!password) {
      nextErrors.password = 'Ingresa tu contraseña'
    } else if (password.length > 200) {
      nextErrors.password = 'La contraseña no puede superar los 200 caracteres'
    }

    setEmail(normalizedEmail)
    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!validateForm()) return

    setSubmitting(true)

    try {
      const authenticatedUser = await login(email.trim(), password)
      const originalLocation = location.state?.from
      const destination =
        originalLocation?.pathname && originalLocation.pathname !== '/login'
          ? originalLocation
          : getRoleHome(authenticatedUser.rol)

      navigate(destination, { replace: true })
    } catch (requestError) {
      const code =
        requestError.response?.data?.error?.code ?? requestError.code

      if (code === 'VALIDACION') {
        const apiFieldErrors = getFieldErrors(requestError)
        setFieldErrors(apiFieldErrors)

        if (Object.keys(apiFieldErrors).length === 0) {
          setError(getErrorMessage(requestError))
        }
      } else if (code === 'CREDENCIALES_INVALIDAS') {
        setError('Correo o contraseña incorrectos')
      } else if (code === 'USUARIO_INACTIVO') {
        setError('Tu usuario está inactivo. Contacta al administrador')
      } else {
        setError(getErrorMessage(requestError))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const emailError = fieldErrors.email ?? fieldErrors.correo
  const passwordError =
    fieldErrors.password ??
    fieldErrors.contrasena ??
    fieldErrors.contraseña

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
          {DEMO_DATA_MODE && (
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

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Correo electrónico
            </label>

            <div
              className={`flex items-center gap-3 rounded-lg border px-3 focus-within:ring-2 ${
                emailError
                  ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-100'
                  : 'border-slate-300 focus-within:border-teal-600 focus-within:ring-teal-100'
              }`}
            >
              <Mail size={18} className="text-slate-400" />

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setFieldErrors((current) => ({
                    ...current,
                    email: '',
                    correo: '',
                  }))
                }}
                placeholder="usuario@novasalud.com"
                autoComplete="username"
                maxLength={254}
                disabled={submitting}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'email-error' : undefined}
                className="w-full py-3 text-sm text-slate-700 outline-none disabled:cursor-not-allowed disabled:bg-white"
              />
            </div>

            {emailError && (
              <p id="email-error" className="mt-1.5 text-xs text-red-600">
                {emailError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Contraseña
            </label>

            <div
              className={`flex items-center gap-3 rounded-lg border px-3 focus-within:ring-2 ${
                passwordError
                  ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-100'
                  : 'border-slate-300 focus-within:border-teal-600 focus-within:ring-teal-100'
              }`}
            >
              <LockKeyhole size={18} className="text-slate-400" />

              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setFieldErrors((current) => ({
                    ...current,
                    password: '',
                    contrasena: '',
                    contraseña: '',
                  }))
                }}
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                maxLength={200}
                disabled={submitting}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? 'password-error' : undefined}
                className="w-full py-3 text-sm text-slate-700 outline-none disabled:cursor-not-allowed disabled:bg-white"
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                disabled={submitting}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="text-slate-400 hover:text-slate-600 disabled:cursor-not-allowed"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {passwordError && (
              <p id="password-error" className="mt-1.5 text-xs text-red-600">
                {passwordError}
              </p>
            )}
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
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 className="animate-spin" size={18} />}
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
