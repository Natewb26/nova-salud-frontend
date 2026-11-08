import api from './api'
import { DEMO_DATA_MODE } from './dataMode'
import { getDemoState } from './demoStore'

export const getReportOperations = async () => {
  if (DEMO_DATA_MODE) {
    return getDemoState().operations
      .slice()
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  }

  const response = await api.get('/api/operaciones', {
    params: { limit: 100, offset: 0 },
  })
  return response.data
}

export const getReportInventory = async () => {
  if (DEMO_DATA_MODE) {
    return getDemoState().products.map((product) => ({
      id_producto: product.id_producto ?? product.id,
      nombre: product.nombre ?? product.name,
      stock: Number(product.stock ?? 0),
      stock_minimo: Number(product.stock_minimo ?? 10),
      categoria: product.categoria ?? product.category,
    }))
  }

  const response = await api.get('/api/inventario/stock')
  return response.data
}
