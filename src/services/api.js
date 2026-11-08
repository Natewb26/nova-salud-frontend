import axios from 'axios'
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  saveSession,
} from './tokenStorage'

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')
const API_BASE_URL = `${API_URL}/api/v1`
const REQUEST_TIMEOUT = 15000

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: REQUEST_TIMEOUT,
})

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: REQUEST_TIMEOUT,
})

let refreshPromise = null

const dispatchLogout = () => {
  clearSession()

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth:logout'))
  }
}

const isAuthRequest = (url = '') =>
  ['/auth/login', '/auth/refresh'].some((path) => url.includes(path))

const refreshSession = () => {
  if (!refreshPromise) {
    const refreshToken = getRefreshToken()

    if (!refreshToken) {
      dispatchLogout()
      return Promise.reject(new Error('No hay un token de renovación disponible.'))
    }

    refreshPromise = refreshClient
      .post('/auth/refresh', { refresh_token: refreshToken })
      .then((response) => {
        const session = response.data?.data ?? response.data

        if (!session?.access_token) {
          throw new Error('La API no devolvió un token de acceso válido.')
        }

        saveSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token ?? refreshToken,
        })

        return session.access_token
      })
      .catch((error) => {
        dispatchLogout()
        throw error
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken()

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status
    const errorCode = error.response?.data?.error?.code

    if (status !== 401) {
      return Promise.reject(error)
    }

    const canRefresh =
      errorCode === 'TOKEN_EXPIRADO' &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRequest(originalRequest.url)

    if (!canRefresh) {
      dispatchLogout()
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      const accessToken = await refreshSession()
      originalRequest.headers.Authorization = `Bearer ${accessToken}`
      return api(originalRequest)
    } catch {
      return Promise.reject(error)
    }
  },
)

export default api
