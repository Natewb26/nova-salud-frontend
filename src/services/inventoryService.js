import api from './api'
import { DEMO_DATA_MODE } from './dataMode'
import {
  getDemoState,
  getNextDemoId,
  updateDemoState,
} from './demoStore'

const normalizeCategory = (product) =>
  product.categoria?.nombre ??
  product.nombre_categoria ??
  product.categoria ??
  product.category ??
  ''

const getProductId = (product) => Number(product.id_producto ?? product.id)

const getStockLevel = (stock, minimum) => {
  if (stock <= 0) return 'agotado'
  if (stock <= minimum) return 'bajo'
  return 'normal'
}

const getNextExpiry = (productId, lots) => {
  const today = new Date().toISOString().slice(0, 10)

  return lots
    .filter(
      (lot) =>
        Number(lot.id_producto) === Number(productId) &&
        Number(lot.cantidad ?? lot.stock_disponible ?? 0) > 0 &&
        lot.fecha_vencimiento >= today,
    )
    .map((lot) => lot.fecha_vencimiento)
    .sort()[0] ?? null
}

const normalizeDemoProduct = (product, lots = getDemoState().lots) => {
  const stock = Number(product.stock_disponible ?? product.stock ?? 0)
  const minimum = Number(product.stock_minimo ?? 0)
  const id = getProductId(product)

  return {
    ...product,
    id_producto: id,
    nombre: product.nombre ?? product.name,
    codigo_barras: product.codigo_barras ?? product.sku,
    categoria: normalizeCategory(product),
    precio_venta: Number(product.precio_venta ?? product.price ?? 0),
    stock_disponible: stock,
    nivel_stock: product.nivel_stock ?? getStockLevel(stock, minimum),
    proximo_vencimiento:
      product.proximo_vencimiento ?? getNextExpiry(id, lots),
    estado: product.estado ?? 'activo',
  }
}

const createDemoApiError = (code, message, details) => {
  const error = new Error(message)
  error.response = {
    status: code === 'DUPLICADO' ? 409 : 422,
    data: { error: { code, message, details } },
  }
  return error
}

const unwrapList = (response) => ({
  data: Array.isArray(response.data?.data) ? response.data.data : [],
  meta: response.data?.meta ?? {
    page: 1,
    page_size: response.data?.data?.length ?? 0,
    total: response.data?.data?.length ?? 0,
    total_pages: 1,
  },
})

export const getProductos = async (params = {}) => {
  if (!DEMO_DATA_MODE) {
    const response = await api.get('/productos', { params })
    return unwrapList(response)
  }

  const state = getDemoState()
  const search = String(params.search ?? '').trim().toLowerCase()
  const category = String(params.categoria ?? '')
  const stockLevel = String(params.nivel_stock ?? '')
  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(params.page_size) || 20))

  let products = state.products.map((product) =>
    normalizeDemoProduct(product, state.lots),
  )

  if (search) {
    products = products.filter((product) =>
      [product.nombre, product.principio_activo, product.codigo_barras]
        .some((value) => String(value ?? '').toLowerCase().includes(search)),
    )
  }

  if (category) {
    products = products.filter((product) =>
      [product.id_categoria, product.categoria]
        .some((value) => String(value ?? '') === category),
    )
  }

  if (stockLevel) {
    products = products.filter(
      (product) => product.nivel_stock === stockLevel,
    )
  }

  const sort = String(params.sort ?? 'nombre')
  const descending = sort.startsWith('-')
  const sortField = descending ? sort.slice(1) : sort

  products.sort((left, right) => {
    const leftValue = left[sortField] ?? ''
    const rightValue = right[sortField] ?? ''
    const result =
      typeof leftValue === 'number' && typeof rightValue === 'number'
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue), 'es')

    return descending ? -result : result
  })

  const total = products.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = (page - 1) * pageSize

  return {
    data: products.slice(start, start + pageSize),
    meta: {
      page,
      page_size: pageSize,
      total,
      total_pages: totalPages,
    },
  }
}

export const getProducto = async (id) => {
  if (!DEMO_DATA_MODE) {
    const response = await api.get(`/productos/${id}`)
    return response.data?.data ?? null
  }

  const product = getDemoState().products.find(
    (item) => getProductId(item) === Number(id),
  )

  return product ? normalizeDemoProduct(product) : null
}

export const crearProducto = async (product) => {
  if (!DEMO_DATA_MODE) {
    const response = await api.post('/productos', product)
    return response.data?.data
  }

  const state = getDemoState()
  const barcode = String(product.codigo_barras ?? '').trim().toLowerCase()

  if (
    state.products.some(
      (item) =>
        String(item.codigo_barras ?? item.sku ?? '').trim().toLowerCase() ===
        barcode,
    )
  ) {
    throw createDemoApiError(
      'DUPLICADO',
      'Ya existe un producto con ese código de barras',
      [{ campo: 'codigo_barras', mensaje: 'El código de barras ya está registrado' }],
    )
  }

  let created

  updateDemoState((current) => {
    const id = getNextDemoId(current.products, 'id_producto')
    created = normalizeDemoProduct({
      ...product,
      categoria: product.categoria ?? product.id_categoria,
      id,
      id_producto: id,
      stock: 0,
      stock_disponible: 0,
      estado: 'activo',
    }, current.lots)

    return { ...current, products: [...current.products, created] }
  })

  return created
}

export const editarProducto = async (id, product) => {
  if (!DEMO_DATA_MODE) {
    const response = await api.patch(`/productos/${id}`, product)
    return response.data?.data
  }

  const state = getDemoState()
  const barcode = String(product.codigo_barras ?? '').trim().toLowerCase()

  if (
    barcode &&
    state.products.some(
      (item) =>
        getProductId(item) !== Number(id) &&
        String(item.codigo_barras ?? item.sku ?? '').trim().toLowerCase() ===
          barcode,
    )
  ) {
    throw createDemoApiError(
      'DUPLICADO',
      'Ya existe un producto con ese código de barras',
      [{ campo: 'codigo_barras', mensaje: 'El código de barras ya está registrado' }],
    )
  }

  let updated = null

  updateDemoState((current) => ({
    ...current,
    products: current.products.map((item) => {
      if (getProductId(item) !== Number(id)) return item
      updated = normalizeDemoProduct({
        ...item,
        ...product,
        categoria: product.categoria ?? product.id_categoria ?? item.categoria,
      }, current.lots)
      return updated
    }),
  }))

  return updated
}

export const getCategorias = async () => {
  if (!DEMO_DATA_MODE) {
    const response = await api.get('/categorias')
    return Array.isArray(response.data?.data) ? response.data.data : []
  }

  return getDemoState().categories.map((name, index) => ({
    id_categoria: name,
    nombre: name,
    orden: index + 1,
  }))
}

export const getLotes = async (params = {}) => {
  if (!DEMO_DATA_MODE) {
    const response = await api.get('/lotes', { params })
    return unwrapList(response)
  }

  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(params.page_size) || 100))
  let lots = getDemoState().lots.map((lot) => ({ ...lot }))

  if (params.id_producto != null) {
    lots = lots.filter(
      (lot) => Number(lot.id_producto) === Number(params.id_producto),
    )
  }

  const total = lots.length
  const start = (page - 1) * pageSize

  return {
    data: lots.slice(start, start + pageSize),
    meta: {
      page,
      page_size: pageSize,
      total,
      total_pages: Math.max(1, Math.ceil(total / pageSize)),
    },
  }
}

export const ajustarLote = async (idLote, adjustment) => {
  if (!DEMO_DATA_MODE) {
    const response = await api.post(`/lotes/${idLote}/ajustes`, adjustment)
    return response.data?.data
  }

  const quantity = Number(adjustment.cantidad)
  const state = getDemoState()
  const currentLot = state.lots.find(
    (lot) => Number(lot.id_lote) === Number(idLote),
  )

  if (!currentLot || Number(currentLot.cantidad) + quantity < 0) {
    throw createDemoApiError(
      'VALIDACION',
      'El ajuste dejaría el lote con stock negativo',
      [{ campo: 'cantidad', mensaje: 'La cantidad disponible no puede ser negativa' }],
    )
  }

  let updated

  updateDemoState((current) => {
    const lots = current.lots.map((lot) => {
      if (Number(lot.id_lote) !== Number(idLote)) return lot
      updated = { ...lot, cantidad: Number(lot.cantidad) + quantity }
      return updated
    })

    const products = current.products.map((product) =>
      getProductId(product) === Number(currentLot.id_producto)
        ? { ...product, stock: Number(product.stock ?? 0) + quantity }
        : product,
    )

    const movementId = getNextDemoId(current.movements, 'id_movimiento')
    const movement = {
      id_movimiento: movementId,
      id_producto: currentLot.id_producto,
      id_lote: currentLot.id_lote,
      tipo: 'ajuste',
      cantidad: quantity,
      motivo: adjustment.motivo,
      fecha: new Date().toISOString(),
    }

    return {
      ...current,
      lots,
      products,
      movements: [...current.movements, movement],
    }
  })

  return updated
}

// [SIN USO] Export heredado sin consumidores; el stock usa getProductos directamente.
// export const getInventoryStock = async () =>
//   (await getProductos({ page: 1, page_size: 100 })).data

export const getInventoryLots = async () =>
  (await getLotes({ page: 1, page_size: 100 })).data

// [SIN USO] Implementación heredada sin consumidores; el kardex usa reportService.getMovements.
// export const getInventoryMovements = async () => {
//   if (DEMO_DATA_MODE) {
//     return getDemoState().movements
//       .slice()
//       .sort((left, right) => new Date(right.fecha) - new Date(left.fecha))
//       .slice(0, 50)
//   }
//
//   const response = await api.get('/movimientos', {
//     params: { page: 1, page_size: 50, sort: '-fecha' },
//   })
//   return Array.isArray(response.data?.data) ? response.data.data : []
// }

export const getReplenishmentAlerts = async () => {
  if (DEMO_DATA_MODE) {
    return (await getProductos({ page: 1, page_size: 100 })).data.filter(
      (product) => ['agotado', 'bajo'].includes(product.nivel_stock),
    )
  }

  const response = await api.get('/alertas/reposicion')
  return Array.isArray(response.data?.data) ? response.data.data : []
}

export const getExpirationAlerts = async () => {
  if (DEMO_DATA_MODE) {
    const today = new Date().toISOString().slice(0, 10)
    const limit = new Date()
    limit.setDate(limit.getDate() + 90)
    const limitDate = limit.toISOString().slice(0, 10)

    const state = getDemoState()
    const todayDate = new Date(`${today}T00:00:00`)
    return state.lots
      .filter(
        (lot) =>
          Number(lot.cantidad) > 0 &&
          lot.fecha_vencimiento <= limitDate,
      )
      .map((lot) => {
        const days = Math.ceil(
          (new Date(`${lot.fecha_vencimiento}T00:00:00`) - todayDate) / 86400000,
        )
        return {
          ...lot,
          nombre_producto: lot.nombre_producto ?? state.products.find(
            (product) => getProductId(product) === Number(lot.id_producto),
          )?.nombre,
          dias_restantes: days,
          estado: days < 0 ? 'vencido' : days <= 30 ? 'crítico' : 'por vencer',
        }
      })
  }

  const response = await api.get('/alertas/vencimiento')
  return Array.isArray(response.data?.data) ? response.data.data : []
}

export const getAlertSummary = async () => {
  if (!DEMO_DATA_MODE) {
    const response = await api.get('/alertas/resumen')
    return response.data?.data ?? { total: 0 }
  }

  const [replenishment, expiration] = await Promise.all([
    getReplenishmentAlerts(),
    getExpirationAlerts(),
  ])
  return {
    reposicion: replenishment.length,
    vencimiento: expiration.length,
    total: replenishment.length + expiration.length,
  }
}
