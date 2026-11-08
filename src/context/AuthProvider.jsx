import { useEffect, useState } from 'react'
import { AuthContext } from './authContext'
import {
  getCurrentUser,
  loginRequest,
  logoutRequest,
} from '../services/authService'

// El modo demo solo está disponible durante el desarrollo local.
const DEMO_MODE =
  import.meta.env.DEV && import.meta.env.VITE_DEMO_AUTH === 'true'

const DEMO_SESSION_KEY = 'nova_demo_session'
const ACCESS_TOKEN_KEY = 'nova_access_token'

const DEMO_USER = {
  id: 'demo-admin-001',
  nombre: 'Administrador de prueba',
  rol: 'admin',
  estado: 'activo',
}

const DEMO_EMAIL = 'admin@novasalud.test'
const DEMO_PASSWORD = 'NovaSalud2026!'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Recuperar la sesión correspondiente al modo activo.
  useEffect(() => {
    let active = true

    const verifySession = async () => {
      if (DEMO_MODE) {
        // En modo demo no se utilizan tokens ni servicios de la API.
        sessionStorage.removeItem(ACCESS_TOKEN_KEY)

        const hasDemoSession =
          sessionStorage.getItem(DEMO_SESSION_KEY) === 'true'

        if (active) {
          setUser(hasDemoSession ? DEMO_USER : null)
          setLoading(false)
        }

        return
      }

      // Fuera del modo demo se utiliza exclusivamente la API.
      sessionStorage.removeItem(DEMO_SESSION_KEY)

      const token = sessionStorage.getItem(ACCESS_TOKEN_KEY)

      if (!token) {
        if (active) {
          setUser(null)
          setLoading(false)
        }
        return
      }

      try {
        const currentUser = await getCurrentUser()

        if (active) {
          setUser(currentUser)
        }
      } catch {
        logoutRequest()

        if (active) {
          setUser(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    verifySession()

    return () => {
      active = false
    }
  }, [])

  // Iniciar sesión en modo demo o mediante la API.
  const login = async (credentials) => {
    if (DEMO_MODE) {
      const validEmail = credentials.email === DEMO_EMAIL
      const validPassword = credentials.password === DEMO_PASSWORD

      if (!validEmail || !validPassword) {
        throw new Error(
          'Correo o contraseña de prueba incorrectos.',
        )
      }

      sessionStorage.removeItem(ACCESS_TOKEN_KEY)
      sessionStorage.setItem(DEMO_SESSION_KEY, 'true')

      setUser(DEMO_USER)

      return DEMO_USER
    }

    sessionStorage.removeItem(DEMO_SESSION_KEY)

    const response = await loginRequest(credentials)

    if (!response.access_token || !response.usuario) {
      logoutRequest()

      throw new Error(
        'La respuesta del servidor no contiene una sesión válida.',
      )
    }

    setUser(response.usuario)

    return response.usuario
  }

  // Cerrar la sesión activa.
  const logout = () => {
    if (DEMO_MODE) {
      sessionStorage.removeItem(DEMO_SESSION_KEY)
      sessionStorage.removeItem(ACCESS_TOKEN_KEY)
    } else {
      logoutRequest()
      sessionStorage.removeItem(DEMO_SESSION_KEY)
    }

    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
