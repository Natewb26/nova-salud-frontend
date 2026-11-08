import api from './api'
import { DEMO_DATA_MODE } from './dataMode'
import { getDemoState, getNextDemoId, updateDemoState } from './demoStore'

const productId = (product) => Number(product.id_producto ?? product.id)
const saleId = (sale) => Number(sale.id_venta ?? sale.id_operacion ?? sale.id)

const normalizeProduct = (product) => ({
  ...product,
  id_producto: productId(product),
  nombre: product.nombre ?? product.name,
  codigo_barras: product.codigo_barras ?? product.sku,
  precio_venta: Number(product.precio_venta ?? product.price ?? 0),
  stock_disponible: Number(product.stock_disponible ?? product.stock ?? 0),
})

const createDemoError = (code, message, status = 422) => {
  const error = new Error(message)
  error.response = { status, data: { error: { code, message } } }
  return error
}

const listMeta = (page, pageSize, total) => ({
  page,
  page_size: pageSize,
  total,
  total_pages: Math.max(1, Math.ceil(total / pageSize)),
})

const unwrapList = (response) => ({
  data: Array.isArray(response.data?.data) ? response.data.data : [],
  meta: response.data?.meta ?? listMeta(1, 20, 0),
})

export const getSalesProducts = async (params = {}) => {
  if (!DEMO_DATA_MODE) {
    const response = await api.get('/productos', { params })
    return unwrapList(response)
  }

  const search = String(params.search ?? '').trim().toLowerCase()
  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(params.page_size) || 10))
  let products = getDemoState().products
    .filter((product) => product.estado !== 'inactivo')
    .map(normalizeProduct)

  if (search) {
    products = products.filter((product) =>
      [product.nombre, product.codigo_barras].some((value) =>
        String(value ?? '').toLowerCase().includes(search),
      ),
    )
  }

  const total = products.length
  const start = (page - 1) * pageSize
  return {
    data: products.slice(start, start + pageSize),
    meta: listMeta(page, pageSize, total),
  }
}

export const getProductByBarcode = async (barcode) => {
  if (!DEMO_DATA_MODE) {
    const response = await api.get('/productos', {
      params: { codigo_barras: barcode, page: 1, page_size: 1 },
    })
    return response.data?.data?.[0] ?? null
  }

  const product = getDemoState().products.find(
    (item) =>
      item.estado !== 'inactivo' &&
      String(item.codigo_barras ?? item.sku) === String(barcode),
  )
  return product ? normalizeProduct(product) : null
}

export const getSalesProduct = async (id) => {
  if (!DEMO_DATA_MODE) {
    const response = await api.get(`/productos/${id}`)
    return response.data?.data ?? null
  }

  const product = getDemoState().products.find(
    (item) => productId(item) === Number(id),
  )
  return product ? normalizeProduct(product) : null
}

export const getSalesCustomers = async (params = {}) => {
  const requestParams = { ...params, tipo: 'cliente' }

  if (!DEMO_DATA_MODE) {
    const response = await api.get('/contactos', { params: requestParams })
    return unwrapList(response)
  }

  const search = String(params.search ?? '').trim().toLowerCase()
  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(params.page_size) || 10))
  let customers = getDemoState().contacts.filter(
    (contact) => contact.tipo === 'cliente',
  )

  if (search) {
    customers = customers.filter((customer) =>
      [customer.nombre, customer.documento].some((value) =>
        String(value ?? '').toLowerCase().includes(search),
      ),
    )
  }

  const total = customers.length
  const start = (page - 1) * pageSize
  return {
    data: customers.slice(start, start + pageSize),
    meta: listMeta(page, pageSize, total),
  }
}

export const getSales = async (params = {}) => {
  if (!DEMO_DATA_MODE) {
    const response = await api.get('/ventas', { params })
    return unwrapList(response)
  }

  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(params.page_size) || 20))
  let sales = getDemoState().operations
    .filter((operation) => operation.tipo === 'venta')
    .sort((left, right) => new Date(right.fecha) - new Date(left.fecha))

  if (params.desde) {
    sales = sales.filter((sale) => String(sale.fecha).slice(0, 10) >= params.desde)
  }
  if (params.hasta) {
    sales = sales.filter((sale) => String(sale.fecha).slice(0, 10) <= params.hasta)
  }
  if (params.estado) {
    sales = sales.filter(
      (sale) => String(sale.estado).toLowerCase() === params.estado.toLowerCase(),
    )
  }

  const total = sales.length
  const start = (page - 1) * pageSize
  return {
    data: sales.slice(start, start + pageSize),
    meta: listMeta(page, pageSize, total),
  }
}

export const getSale = async (id) => {
  if (!DEMO_DATA_MODE) {
    const response = await api.get(`/ventas/${id}`)
    return response.data?.data ?? null
  }

  return getDemoState().operations.find(
    (operation) => operation.tipo === 'venta' && saleId(operation) === Number(id),
  ) ?? null
}

export const createSale = async (sale) => {
  if (!DEMO_DATA_MODE) {
    const response = await api.post('/ventas', sale)
    return response.data?.data
  }

  const state = getDemoState()
  const normalizedItems = sale.items.map((item) => {
    const product = state.products.find(
      (candidate) => productId(candidate) === Number(item.id_producto),
    )
    const quantity = Number(item.cantidad)
    const available = Number(product?.stock ?? product?.stock_disponible ?? 0)

    if (!product || available < quantity) {
      throw createDemoError(
        'STOCK_INSUFICIENTE',
        `Stock insuficiente para ${product?.nombre ?? product?.name ?? 'el producto seleccionado'}. Disponible: ${available}.`,
        409,
      )
    }

    const unitPrice = Number(product.precio_venta ?? product.price ?? 0)
    return {
      id_producto: productId(product),
      nombre_producto: product.nombre ?? product.name,
      cantidad: quantity,
      precio_unitario: unitPrice,
      subtotal: quantity * unitPrice,
    }
  })

  let created

  updateDemoState((current) => {
    const id = getNextDemoId(current.operations, 'id_operacion')
    const fecha = new Date().toISOString()
    const products = current.products.map((product) => {
      const sold = normalizedItems.find(
        (item) => item.id_producto === productId(product),
      )
      return sold
        ? { ...product, stock: Number(product.stock ?? 0) - sold.cantidad }
        : product
    })
    const lots = current.lots.map((lot) => ({ ...lot }))

    normalizedItems.forEach((item) => {
      let remaining = item.cantidad
      lots
        .filter((lot) => Number(lot.id_producto) === item.id_producto)
        .sort((left, right) =>
          String(left.fecha_vencimiento).localeCompare(String(right.fecha_vencimiento)),
        )
        .forEach((lot) => {
          const reduction = Math.min(Number(lot.cantidad ?? 0), remaining)
          lot.cantidad = Number(lot.cantidad ?? 0) - reduction
          remaining -= reduction
        })
    })

    created = {
      id_venta: id,
      id_operacion: id,
      tipo: 'venta',
      id_contacto: sale.id_contacto ?? null,
      cliente: current.contacts.find(
        (contact) => Number(contact.id_contacto) === Number(sale.id_contacto),
      ) ?? null,
      fecha,
      total: normalizedItems.reduce((sum, item) => sum + item.subtotal, 0),
      estado: 'registrada',
      metodo_pago: sale.metodo_pago,
      vendedor: { id: 'demo-admin-001', nombre: 'Administrador de prueba' },
      items: normalizedItems,
    }

    return {
      ...current,
      products,
      lots,
      operations: [...current.operations, created],
    }
  })

  return created
}

export const cancelSale = async (id, reason) => {
  if (!DEMO_DATA_MODE) {
    const response = await api.post(`/ventas/${id}/anular`, { motivo: reason })
    return response.data?.data
  }

  let cancelled = null
  updateDemoState((current) => ({
    ...current,
    operations: current.operations.map((operation) => {
      if (saleId(operation) !== Number(id)) return operation
      cancelled = {
        ...operation,
        estado: 'anulada',
        motivo_anulacion: reason,
      }
      return cancelled
    }),
  }))
  return cancelled
}

// [SIN USO] Alias de compatibilidad sin consumidores; las pantallas usan getSales.
// export const getSalesHistory = async () =>
//   (await getSales({ page: 1, page_size: 100, sort: '-fecha' })).data
