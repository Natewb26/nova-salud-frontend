import axios from 'axios'

// URL base del backend configurada en el archivo .env.
const API_URL = import.meta.env.VITE_API_URL

// Cliente HTTP centralizado para todas las solicitudes de Nova Salud.
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
})

// Agrega el token de autenticación a las solicitudes protegidas.
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('nova_access_token')

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error),
)

// Centraliza el tratamiento de errores devueltos por el backend.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const backendMessage = error.response?.data?.error

    if (error.response?.status === 401) {
      // La sesión será gestionada por el contexto de autenticación.
      sessionStorage.removeItem('nova_access_token')
    }

    error.message =
      backendMessage ||
      error.message ||
      'Error de conexión con el servidor.'

    return Promise.reject(error)
  },
)

export default api
