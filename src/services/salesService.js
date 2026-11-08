import api from './api'
import { DEMO_DATA_MODE } from './dataMode'
import { getDemoState, updateDemoState, getNextDemoId } from './demoStore'

export const getSalesCustomers = async () => {
  if (DEMO_DATA_MODE) {
    return getDemoState().contacts.filter((contact) => contact.tipo === 'cliente')
  }

  const response = await api.get('/api/contactos')
  return response.data.filter((contact) => contact.tipo === 'cliente')
}

export const getSalesProducts = async () => {
  if (DEMO_DATA_MODE) {
    return getDemoState().products
      .filter((product) => product.estado !== 'inactivo')
      .map((product) => ({
        ...product,
        id_producto: product.id_producto ?? product.id,
        nombre: product.nombre ?? product.name,
        precio_venta: Number(product.precio_venta ?? product.price ?? 0),
        codigo_barras: product.codigo_barras ?? product.sku,
      }))
  }

  const response = await api.get('/api/productos', {
    params: { limit: 100, offset: 0 },
  })
  return response.data.filter((product) => product.estado !== 'inactivo')
}

export const getSalesHistory = async () => {
  if (DEMO_DATA_MODE) {
    return getDemoState().operations
      .filter((operation) => operation.tipo === 'venta')
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  }

  const response = await api.get('/api/operaciones', {
    params: { tipo: 'venta', limit: 100, offset: 0 },
  })
  return response.data
}

export const createSale = async (sale) => {
  if (DEMO_DATA_MODE) {
    const state = getDemoState()

    if (!Array.isArray(sale.items) || sale.items.length === 0) {
      throw new Error('Agrega al menos un producto a la venta.')
    }

    if (sale.id_contacto != null) {
      const customer = state.contacts.find(
        (contact) =>
          contact.id_contacto === Number(sale.id_contacto) &&
          contact.tipo === 'cliente',
      )
      if (!customer) throw new Error('El cliente seleccionado no es válido.')
    }

    const quantities = new Map()

    sale.items.forEach((item) => {
      const id = Number(item.id_producto)
      const cantidad = Number(item.cantidad)
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        throw new Error('La cantidad debe ser un entero positivo.')
      }
      quantities.set(id, (quantities.get(id) ?? 0) + cantidad)
    })

    const normalizedItems = [...quantities.entries()].map(([id, cantidad]) => {
      const product = state.products.find(
        (entry) => Number(entry.id_producto ?? entry.id) === id,
      )

      if (!product || product.estado === 'inactivo') {
        throw new Error('Uno de los productos no está disponible.')
      }

      if (Number(product.stock ?? 0) < cantidad) {
        throw new Error(`Stock insuficiente para ${product.nombre ?? product.name}. Disponible: ${product.stock}.`)
      }

      return {
        id_producto: id,
        nombre: product.nombre ?? product.name,
        cantidad,
        precio_unitario: Number(product.precio_venta ?? product.price ?? 0),
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
        const sold = normalizedItems.find((item) => item.id_producto === productId)

        return sold
          ? { ...product, stock: Number(product.stock ?? 0) - sold.cantidad }
          : product
      })

      let lots = [...current.lots]

      normalizedItems.forEach((item) => {
        let remaining = item.cantidad

        const productLots = lots
          .filter((lot) => Number(lot.id_producto) === item.id_producto)
          .sort((a, b) => String(a.fecha_vencimiento).localeCompare(String(b.fecha_vencimiento)))

        productLots.forEach((lot) => {
          if (remaining <= 0) return

          const available = Number(lot.cantidad ?? 0)
          const reduction = Math.min(available, remaining)
          lot.cantidad = available - reduction
          remaining -= reduction
        })
      })

      const movementStartId = getNextDemoId(current.movements, 'id_movimiento')
      const newMovements = normalizedItems.map((item, index) => ({
        id_movimiento: movementStartId + index,
        id_producto: item.id_producto,
        nombre_producto: item.nombre,
        tipo: 'salida',
        cantidad: item.cantidad,
        fecha,
        referencia: `Venta #${id}`,
      }))

      created = {
        id_operacion: id,
        tipo: 'venta',
        id_contacto: sale.id_contacto ?? null,
        nombre_contacto:
          current.contacts.find((contact) => contact.id_contacto === Number(sale.id_contacto))?.nombre ?? 'Cliente general',
        fecha,
        total,
        estado: 'Registrada',
        metodo_pago: sale.metodo_pago ?? null,
        items: normalizedItems,
        resultado: 'registrada',
      }

      return {
        ...current,
        products,
        lots,
        movements: [...current.movements, ...newMovements],
        operations: [...current.operations, created],
      }
    })

    return created
  }

  const response = await api.post('/api/ventas', sale)
  return response.data
}
