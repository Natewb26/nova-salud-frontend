import { useEffect, useState } from 'react'
import { AuthContext } from './authContext'
import {
  clearLocalSession,
  getMe,
  login as loginSession,
  logout as logoutSession,
} from '../services/authService'
import { DEMO_DATA_MODE } from '../services/dataMode'
import { getAccessToken } from '../services/tokenStorage'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const restoreSession = async () => {
      if (!DEMO_DATA_MODE && !getAccessToken()) {
        clearLocalSession()
        if (active) setLoading(false)
        return
      }

      try {
        const currentUser = await getMe()

        if (active) {
          setUser(currentUser)
        }

        if (!currentUser) {
          clearLocalSession()
        }
      } catch {
        clearLocalSession()

        if (active) {
          setUser(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    restoreSession()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const handleLogout = () => {
      clearLocalSession()
      setUser(null)
    }

    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [])

  const login = async (email, password) => {
    const authenticatedUser = await loginSession(email, password)
    setUser(authenticatedUser)
    return authenticatedUser
  }

  const logout = async () => {
    try {
      await logoutSession()
    } finally {
      setUser(null)
    }
  }

  const hasRole = (...roles) => roles.includes(user?.rol)

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
