import api from './api'
import { DEMO_DATA_MODE } from './dataMode'
import { getDemoState } from './demoStore'

const productId = (product) => Number(product.id_producto ?? product.id)

const listMeta = (page, pageSize, total) => ({
  page,
  page_size: pageSize,
  total,
  total_pages: Math.max(1, Math.ceil(total / pageSize)),
})

export const getReportSummary = async () => {
  if (!DEMO_DATA_MODE) {
    const response = await api.get('/reportes/resumen')
    return response.data?.data ?? {}
  }

  const state = getDemoState()
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const month = today.slice(0, 7)
  const validSales = state.operations.filter(
    (operation) =>
      operation.tipo === 'venta' &&
      String(operation.estado ?? '').toLowerCase() !== 'anulada',
  )
  const summarize = (sales) => ({
    cantidad: sales.length,
    total: sales.reduce((sum, sale) => sum + Number(sale.total ?? 0), 0),
  })

  const productTotals = new Map()
  validSales
    .filter((sale) => String(sale.fecha).slice(0, 7) === month)
    .flatMap((sale) => sale.items ?? [])
    .forEach((item) => {
      const id = Number(item.id_producto)
      const current = productTotals.get(id) ?? {
        id_producto: id,
        nombre: item.nombre_producto ?? `Producto #${id}`,
        cantidad: 0,
        total: 0,
      }
      current.cantidad += Number(item.cantidad ?? 0)
      current.total += Number(
        item.subtotal ?? Number(item.cantidad ?? 0) * Number(item.precio_unitario ?? 0),
      )
      productTotals.set(id, current)
    })

  const products = state.products.map((product) => ({
    ...product,
    id_producto: productId(product),
    stock_disponible: Number(product.stock_disponible ?? product.stock ?? 0),
    stock_minimo: Number(product.stock_minimo ?? 0),
  }))
  const todayDate = new Date(`${today}T00:00:00`)
  const expirationCount = state.lots.filter((lot) => {
    if (Number(lot.cantidad ?? 0) <= 0) return false
    const days = Math.ceil(
      (new Date(`${lot.fecha_vencimiento}T00:00:00`) - todayDate) / 86400000,
    )
    return days <= 90
  }).length
  const replenishmentCount = products.filter(
    (product) => product.stock_disponible <= product.stock_minimo,
  ).length

  return {
    ventas_hoy: summarize(validSales.filter(
      (sale) => String(sale.fecha).slice(0, 10) === today,
    )),
    ventas_mes: summarize(validSales.filter(
      (sale) => String(sale.fecha).slice(0, 7) === month,
    )),
    top_productos: [...productTotals.values()]
      .sort((left, right) => right.cantidad - left.cantidad)
      .slice(0, 5),
    alertas: {
      reposicion: replenishmentCount,
      vencimiento: expirationCount,
      total: replenishmentCount + expirationCount,
    },
  }
}

export const getMovements = async (params = {}) => {
  if (!DEMO_DATA_MODE) {
    const response = await api.get('/movimientos', { params })
    return {
      data: Array.isArray(response.data?.data) ? response.data.data : [],
      meta: response.data?.meta ?? listMeta(1, 20, 0),
    }
  }

  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(params.page_size) || 20))
  let movements = getDemoState().movements
    .slice()
    .sort((left, right) => new Date(right.fecha) - new Date(left.fecha))

  if (params.id_producto) {
    movements = movements.filter(
      (movement) => Number(movement.id_producto) === Number(params.id_producto),
    )
  }
  if (params.tipo) {
    movements = movements.filter(
      (movement) => String(movement.tipo).toLowerCase() === String(params.tipo).toLowerCase(),
    )
  }
  if (params.desde) {
    movements = movements.filter(
      (movement) => String(movement.fecha).slice(0, 10) >= params.desde,
    )
  }
  if (params.hasta) {
    movements = movements.filter(
      (movement) => String(movement.fecha).slice(0, 10) <= params.hasta,
    )
  }

  const state = getDemoState()
  movements = movements.map((movement) => ({
    ...movement,
    nombre_producto: movement.nombre_producto ?? state.products.find(
      (product) => productId(product) === Number(movement.id_producto),
    )?.nombre,
  }))
  const total = movements.length
  const start = (page - 1) * pageSize
  return {
    data: movements.slice(start, start + pageSize),
    meta: listMeta(page, pageSize, total),
  }
}

// [SIN USO] Fuente heredada reemplazada por getReportSummary; no existe endpoint combinado.
// export const getReportOperations = async () =>
//   DEMO_DATA_MODE
//     ? getDemoState().operations.slice().sort((left, right) => new Date(right.fecha) - new Date(left.fecha))
//     : []

// [SIN USO] Fuente heredada reemplazada por getReportSummary; no existe endpoint de reporte de inventario.
// export const getReportInventory = async () =>
//   DEMO_DATA_MODE
//     ? getDemoState().products.map((product) => ({
//         ...product,
//         id_producto: productId(product),
//         nombre: product.nombre ?? product.name,
//         stock: Number(product.stock_disponible ?? product.stock ?? 0),
//       }))
//     : []
