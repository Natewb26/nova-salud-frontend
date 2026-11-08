import api from './api'
import { DEMO_DATA_MODE } from './dataMode'
import { getDemoState } from './demoStore'

const parseLocalDate = (value) => {
  const match = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (!match) return null

  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))

  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null
  }

  return date
}

const getDaysBetween = (start, end) => {
  const startUtc = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  )

  const endUtc = Date.UTC(
    end.getFullYear(),
    end.getMonth(),
    end.getDate(),
  )

  return Math.round((endUtc - startUtc) / 86400000)
}

export const getInventoryStock = async () => {
  if (DEMO_DATA_MODE) {
    return getDemoState().products.map((product) => ({
      id_producto: product.id_producto ?? product.id,
      nombre: product.nombre ?? product.name,
      codigo_barras: product.codigo_barras ?? product.sku,
      categoria: product.categoria ?? product.category,
      stock: Number(product.stock ?? 0),
      stock_minimo: Number(product.stock_minimo ?? 10),
      estado: product.estado ?? 'activo',
    }))
  }

  const response = await api.get('/api/inventario/stock')
  return response.data
}

export const getInventoryLots = async () => {
  if (DEMO_DATA_MODE) {
    return getDemoState().lots.map((lot) => ({
      ...lot,
      estado: Number(lot.cantidad) <= 0 ? 'Agotado' : lot.estado,
    }))
  }

  const response = await api.get('/api/inventario/lotes')
  return response.data
}

export const getInventoryMovements = async (limit = 50, offset = 0) => {
  if (DEMO_DATA_MODE) {
    return getDemoState().movements
      .slice()
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(offset, offset + limit)
  }

  const response = await api.get('/api/inventario/movimientos', {
    params: { limit, offset },
  })

  return response.data
}

export const getReplenishmentAlerts = async () => {
  if (DEMO_DATA_MODE) {
    return getDemoState().products
      .filter(
        (product) =>
          Number(product.stock ?? 0) <= Number(product.stock_minimo ?? 10),
      )
      .map((product) => ({
        id_producto: product.id_producto ?? product.id,
        nombre: product.nombre ?? product.name,
        stock: Number(product.stock ?? 0),
        stock_minimo: Number(product.stock_minimo ?? 10),
        faltante: Math.max(
          0,
          Number(product.stock_minimo ?? 10) - Number(product.stock ?? 0),
        ),
        estado: Number(product.stock ?? 0) === 0 ? 'Agotado' : 'Stock bajo',
      }))
  }

  const response = await api.get('/api/inventario/alertas/reposicion')
  return response.data
}

export const getExpirationAlerts = async () => {
  if (DEMO_DATA_MODE) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const limit = new Date(today)
    limit.setDate(limit.getDate() + 90)

    return getDemoState().lots
      .map((lot) => {
        const expiry = parseLocalDate(lot.fecha_vencimiento)

        if (!expiry) return null

        const days = getDaysBetween(today, expiry)

        if (
          Number(lot.cantidad) <= 0 ||
          days < 0 ||
          expiry > limit
        ) {
          return null
        }

        return {
          ...lot,
          dias_para_vencer: days,
          estado: days === 0 ? 'Vence hoy' : 'Próximo a vencer',
        }
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          a.dias_para_vencer - b.dias_para_vencer,
      )
  }

  const response = await api.get('/api/inventario/alertas/vencimiento')
  return response.data
}
