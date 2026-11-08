import api from './api'
import { DEMO_DATA_MODE } from './dataMode'
import { clearSession, saveSession } from './tokenStorage'

const DEMO_SESSION_KEY = 'nova_demo_session'

const DEMO_USER = {
  id: 'demo-admin-001',
  nombre: 'Administrador de prueba',
  email: 'admin@novasalud.test',
  rol: 'admin',
}

const DEMO_PASSWORD = 'NovaSalud2026!'

const getDemoStorage = () =>
  typeof window === 'undefined' ? null : window.sessionStorage

const createDemoLoginError = () => {
  const error = new Error('Correo o contraseña incorrectos')
  error.code = 'CREDENCIALES_INVALIDAS'
  return error
}

export const clearLocalSession = () => {
  getDemoStorage()?.removeItem(DEMO_SESSION_KEY)
  clearSession()
}

export const login = async (email, password) => {
  if (DEMO_DATA_MODE) {
    if (email !== DEMO_USER.email || password !== DEMO_PASSWORD) {
      throw createDemoLoginError()
    }

    clearSession()
    getDemoStorage()?.setItem(DEMO_SESSION_KEY, 'true')
    return DEMO_USER
  }

  const response = await api.post('/auth/login', { email, password })
  const data = response.data?.data

  if (!data?.access_token || !data?.refresh_token || !data?.usuario) {
    clearSession()
    throw new Error('La API no devolvió una sesión válida')
  }

  saveSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  })

  return data.usuario
}

export const getMe = async () => {
  if (DEMO_DATA_MODE) {
    const hasDemoSession =
      getDemoStorage()?.getItem(DEMO_SESSION_KEY) === 'true'

    return hasDemoSession ? DEMO_USER : null
  }

  const response = await api.get('/auth/me')
  return response.data?.data ?? null
}

export const logout = async () => {
  if (DEMO_DATA_MODE) {
    clearLocalSession()
    return
  }

  try {
    await api.post('/auth/logout')
  } catch {
    // El cierre local debe completarse aunque el servidor no responda.
  } finally {
    clearLocalSession()
  }
}
