import api from './api'
import { DEMO_DATA_MODE } from './dataMode'
import { getDemoState, getNextDemoId, updateDemoState } from './demoStore'

const productId = (product) => Number(product.id_producto ?? product.id)
const purchaseId = (purchase) => Number(
  purchase.id_compra ?? purchase.id_operacion ?? purchase.id,
)

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

const createDemoError = (code, message, status = 422, details = []) => {
  const error = new Error(message)
  error.response = { status, data: { error: { code, message, details } } }
  return error
}

export const getPurchaseSuppliers = async (params = {}) => {
  const requestParams = { page: 1, page_size: 100, ...params, tipo: 'proveedor' }

  if (!DEMO_DATA_MODE) {
    const response = await api.get('/contactos', { params: requestParams })
    return unwrapList(response)
  }

  const search = String(params.search ?? '').trim().toLowerCase()
  let suppliers = getDemoState().contacts.filter(
    (contact) => contact.tipo === 'proveedor',
  )
  if (search) {
    suppliers = suppliers.filter((supplier) =>
      [supplier.nombre, supplier.documento].some((value) =>
        String(value ?? '').toLowerCase().includes(search),
      ),
    )
  }
  suppliers.sort((left, right) =>
    String(left.nombre ?? '').localeCompare(String(right.nombre ?? ''), 'es'),
  )
  return {
    data: suppliers.slice(0, 100),
    meta: listMeta(1, 100, suppliers.length),
  }
}

export const getPurchaseProducts = async (params = {}) => {
  const requestParams = { page: 1, page_size: 100, sort: 'nombre', ...params }

  if (!DEMO_DATA_MODE) {
    const response = await api.get('/productos', { params: requestParams })
    return unwrapList(response)
  }

  const products = getDemoState().products
    .filter((product) => product.estado !== 'inactivo')
    .map((product) => ({
      ...product,
      id_producto: productId(product),
      nombre: product.nombre ?? product.name,
      codigo_barras: product.codigo_barras ?? product.sku,
    }))
    .sort((left, right) => left.nombre.localeCompare(right.nombre, 'es'))
  return {
    data: products.slice(0, 100),
    meta: listMeta(1, 100, products.length),
  }
}

export const getPurchases = async (params = {}) => {
  if (!DEMO_DATA_MODE) {
    const response = await api.get('/compras', { params })
    return unwrapList(response)
  }

  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(params.page_size) || 20))
  const search = String(params.search ?? '').trim().toLowerCase()
  let purchases = getDemoState().operations
    .filter((operation) => operation.tipo === 'compra')
    .sort((left, right) => new Date(right.fecha) - new Date(left.fecha))
  if (search) {
    purchases = purchases.filter((purchase) =>
      [purchaseId(purchase), purchase.nombre_contacto, purchase.proveedor?.nombre]
        .some((value) => String(value ?? '').toLowerCase().includes(search)),
    )
  }

  const total = purchases.length
  const start = (page - 1) * pageSize
  return {
    data: purchases.slice(start, start + pageSize),
    meta: listMeta(page, pageSize, total),
  }
}

export const getPurchase = async (id) => {
  if (!DEMO_DATA_MODE) {
    const response = await api.get(`/compras/${id}`)
    return response.data?.data ?? null
  }

  const state = getDemoState()
  const purchase = state.operations.find(
    (operation) => operation.tipo === 'compra' && purchaseId(operation) === Number(id),
  )
  if (!purchase) return null
  const lotes = (purchase.items ?? []).map((item) => ({
    ...item,
    ...state.lots.find((lot) =>
      Number(lot.id_producto) === Number(item.id_producto) &&
      lot.codigo_lote === item.codigo_lote,
    ),
  }))
  return { ...purchase, lotes }
}

export const createPurchase = async (purchase) => {
  if (!DEMO_DATA_MODE) {
    const response = await api.post('/compras', purchase)
    return response.data?.data
  }

  const state = getDemoState()
  const supplier = state.contacts.find((contact) =>
    Number(contact.id_contacto) === Number(purchase.id_contacto) &&
    contact.tipo === 'proveedor',
  )
  if (!supplier) {
    throw createDemoError('REFERENCIA_INVALIDA', 'Selecciona un proveedor válido', 409)
  }

  const duplicate = purchase.items.find((item) => state.lots.some((lot) =>
    Number(lot.id_producto) === Number(item.id_producto) &&
    String(lot.codigo_lote).toLowerCase() ===
      String(item.codigo_lote).trim().toLowerCase(),
  ))
  if (duplicate) {
    throw createDemoError(
      'DUPLICADO',
      'El código de lote ya existe para el producto seleccionado',
      409,
      [{ campo: 'codigo_lote', mensaje: 'Este lote ya está registrado para el producto' }],
    )
  }

  const normalizedItems = purchase.items.map((item) => {
    const product = state.products.find(
      (candidate) => productId(candidate) === Number(item.id_producto),
    )
    if (!product) {
      throw createDemoError('REFERENCIA_INVALIDA', 'Uno de los productos no existe', 409)
    }
    return {
      id_producto: productId(product),
      nombre_producto: product.nombre ?? product.name,
      cantidad: Number(item.cantidad),
      precio_unitario: Number(item.precio_unitario),
      codigo_lote: String(item.codigo_lote).trim(),
      fecha_vencimiento: item.fecha_vencimiento,
    }
  })

  let created
  updateDemoState((current) => {
    const id = getNextDemoId(current.operations, 'id_operacion')
    const fecha = new Date().toISOString()
    let nextLotId = getNextDemoId(current.lots, 'id_lote')
    const newLots = normalizedItems.map((item) => ({
      id_lote: nextLotId++,
      id_compra: id,
      id_producto: item.id_producto,
      nombre_producto: item.nombre_producto,
      codigo_lote: item.codigo_lote,
      cantidad: item.cantidad,
      cantidad_inicial: item.cantidad,
      fecha_vencimiento: item.fecha_vencimiento,
      estado: 'vigente',
    }))
    created = {
      id_compra: id,
      id_operacion: id,
      tipo: 'compra',
      id_contacto: Number(purchase.id_contacto),
      proveedor: supplier,
      nombre_contacto: supplier.nombre,
      metodo_pago: purchase.metodo_pago ?? null,
      fecha,
      estado: 'registrada',
      total: normalizedItems.reduce(
        (sum, item) => sum + item.cantidad * item.precio_unitario,
        0,
      ),
      items: normalizedItems,
      lotes: newLots,
    }
    return {
      ...current,
      products: current.products.map((product) => {
        const quantity = normalizedItems
          .filter((item) => item.id_producto === productId(product))
          .reduce((sum, item) => sum + item.cantidad, 0)
        return quantity
          ? { ...product, stock: Number(product.stock ?? 0) + quantity }
          : product
      }),
      lots: [...current.lots, ...newLots],
      operations: [...current.operations, created],
    }
  })
  return created
}

export const cancelPurchase = async (id, reason) => {
  if (!DEMO_DATA_MODE) {
    const response = await api.post(`/compras/${id}/anular`, { motivo: reason })
    return response.data?.data
  }

  const state = getDemoState()
  const purchase = await getPurchase(id)
  if (!purchase) throw createDemoError('NO_ENCONTRADO', 'La compra no existe', 404)
  const affectedLots = state.lots.filter((lot) => (purchase.items ?? []).some(
    (item) => Number(item.id_producto) === Number(lot.id_producto) &&
      item.codigo_lote === lot.codigo_lote,
  ))
  if (affectedLots.some((lot) => {
    const purchasedItem = (purchase.items ?? []).find((item) =>
      Number(item.id_producto) === Number(lot.id_producto) &&
      item.codigo_lote === lot.codigo_lote,
    )
    const initialQuantity = lot.cantidad_inicial ?? purchasedItem?.cantidad
    return initialQuantity != null && Number(lot.cantidad) < Number(initialQuantity)
  })) {
    throw createDemoError(
      'REFERENCIA_INVALIDA',
      'No se puede anular la compra porque uno de sus lotes ya tuvo ventas',
      409,
    )
  }

  let cancelled
  updateDemoState((current) => ({
    ...current,
    products: current.products.map((product) => {
      const quantity = (purchase.items ?? [])
        .filter((item) => Number(item.id_producto) === productId(product))
        .reduce((sum, item) => sum + Number(item.cantidad), 0)
      return quantity
        ? { ...product, stock: Math.max(0, Number(product.stock ?? 0) - quantity) }
        : product
    }),
    lots: current.lots.filter((lot) => !affectedLots.some(
      (affected) => Number(affected.id_lote) === Number(lot.id_lote),
    )),
    operations: current.operations.map((operation) => {
      if (purchaseId(operation) !== Number(id)) return operation
      cancelled = { ...operation, estado: 'anulada', motivo_anulacion: reason }
      return cancelled
    }),
  }))
  return cancelled
}

// [SIN USO] Alias de compatibilidad sin consumidores; la pantalla usa getPurchases.
// export const getPurchaseHistory = async () =>
//   (await getPurchases({ page: 1, page_size: 100, sort: '-fecha' })).data
