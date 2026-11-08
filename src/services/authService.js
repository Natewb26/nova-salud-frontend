import api from './api'

// Consultar si el backend está disponible.
export const checkApiHealth = async () => {
  const response = await api.get('/api/health')
  return response.data
}

// Iniciar sesión con las credenciales del usuario.
export const loginRequest = async (credentials) => {
  const response = await api.post('/api/auth/login', credentials)

  // Guardar el token para las siguientes solicitudes protegidas.
  if (response.data.access_token) {
    sessionStorage.setItem(
      'nova_access_token',
      response.data.access_token,
    )
  }

  return response.data
}

// Consultar el perfil del usuario autenticado.
export const getCurrentUser = async () => {
  const response = await api.get('/api/auth/me')
  return response.data
}

// Cerrar la sesión local del frontend.
export const logoutRequest = () => {
  sessionStorage.removeItem('nova_access_token')
}
