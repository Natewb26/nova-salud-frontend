import api from './api'
import { DEMO_DATA_MODE } from './dataMode'
import { getDemoState, updateDemoState, getNextDemoId } from './demoStore'

export const getPurchaseSuppliers = async () => {
  if (DEMO_DATA_MODE) {
    return getDemoState().contacts.filter((contact) => contact.tipo === 'proveedor')
  }

  const response = await api.get('/api/contactos')
  return response.data.filter((contact) => contact.tipo === 'proveedor')
}

export const getPurchaseProducts = async () => {
  if (DEMO_DATA_MODE) {
    return getDemoState().products
      .filter((product) => product.estado !== 'inactivo')
      .map((product) => ({
        ...product,
        id_producto: product.id_producto ?? product.id,
        nombre: product.nombre ?? product.name,
        codigo_barras: product.codigo_barras ?? product.sku,
      }))
  }

  const response = await api.get('/api/productos', {
    params: { limit: 100, offset: 0 },
  })
  return response.data
}

export const getPurchaseHistory = async () => {
  if (DEMO_DATA_MODE) {
    return getDemoState().operations
      .filter((operation) => operation.tipo === 'compra')
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  }

  const response = await api.get('/api/operaciones', {
    params: { tipo: 'compra', limit: 100, offset: 0 },
  })
  return response.data
}

export const createPurchase = async (purchase) => {
  if (DEMO_DATA_MODE) {
    const state = getDemoState()

    const supplier = state.contacts.find(
      (contact) =>
        contact.id_contacto === Number(purchase.id_contacto) &&
        contact.tipo === 'proveedor',
    )

    if (!supplier) throw new Error('Selecciona un proveedor válido.')
    if (!Array.isArray(purchase.items) || purchase.items.length === 0) {
      throw new Error('Agrega al menos un producto a la compra.')
    }

    const normalizedItems = purchase.items.map((item) => {
      const product = state.products.find(
        (entry) => Number(entry.id_producto ?? entry.id) === Number(item.id_producto),
      )

      const cantidad = Number(item.cantidad)
      const precio = Number(item.precio_unitario)

      if (!product) throw new Error('Uno de los productos no existe.')
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        throw new Error('La cantidad de cada producto debe ser un entero positivo.')
      }
      if (!Number.isFinite(precio) || precio < 0) {
        throw new Error('El precio de compra no es válido.')
      }
      if (!String(item.codigo_lote ?? '').trim() || !item.fecha_vencimiento) {
        throw new Error('Cada producto debe tener lote y fecha de vencimiento.')
      }

      return {
        id_producto: Number(item.id_producto),
        nombre: product.nombre ?? product.name,
        cantidad,
        precio_unitario: precio,
        codigo_lote: String(item.codigo_lote).trim(),
        fecha_vencimiento: item.fecha_vencimiento,
      }
    })

    const total = normalizedItems.reduce(
      (sum, item) => sum + item.cantidad * item.precio_unitario,
      0,
    )

    let created

    updateDemoState((current) => {
      const id = getNextDemoId(current.operations, 'id_operacion')
      const fecha = new Date().toISOString()

      const products = current.products.map((product) => {
        const productId = Number(product.id_producto ?? product.id)
        const purchased = normalizedItems
          .filter((item) => item.id_producto === productId)
          .reduce((sum, item) => sum + item.cantidad, 0)

        return purchased
          ? { ...product, stock: Number(product.stock ?? 0) + purchased }
          : product
      })

      let nextLotId = getNextDemoId(current.lots, 'id_lote')

      const newLots = normalizedItems.map((item) => ({
        id_lote: nextLotId++,
        id_producto: item.id_producto,
        nombre_producto: item.nombre,
        codigo_lote: item.codigo_lote,
        cantidad: item.cantidad,
        fecha_vencimiento: item.fecha_vencimiento,
        estado: 'vigente',
      }))

      const movementStartId = getNextDemoId(current.movements, 'id_movimiento')
      const newMovements = normalizedItems.map((item, index) => ({
        id_movimiento: movementStartId + index,
        id_producto: item.id_producto,
        nombre_producto: item.nombre,
        tipo: 'entrada',
        cantidad: item.cantidad,
        fecha,
        referencia: `Compra #${id}`,
      }))

      created = {
        id_operacion: id,
        tipo: 'compra',
        id_contacto: supplier.id_contacto,
        nombre_contacto: supplier.nombre,
        fecha,
        total,
        estado: 'Registrada',
        metodo_pago: purchase.metodo_pago ?? null,
        items: normalizedItems,
        resultado: 'registrada',
      }

      return {
        ...current,
        products,
        lots: [...current.lots, ...newLots],
        movements: [...current.movements, ...newMovements],
        operations: [...current.operations, created],
      }
    })

    return created
  }

  const response = await api.post('/api/compras', purchase)
  return response.data
}
