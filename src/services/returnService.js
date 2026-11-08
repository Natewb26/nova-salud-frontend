import api from './api'
import { DEMO_DATA_MODE } from './dataMode'
import { getDemoState, updateDemoState, getNextDemoId } from './demoStore'

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100

const getReturnedQuantity = (
  returns,
  operationId,
  productId,
  lotCode = null,
) =>
  (returns ?? [])
    .filter(
      (entry) => Number(entry.id_operacion) === Number(operationId),
    )
    .flatMap((entry) => entry.items ?? [])
    .filter(
      (item) =>
        Number(item.id_producto) === Number(productId) &&
        (lotCode == null || item.codigo_lote === lotCode),
    )
    .reduce((sum, item) => sum + Number(item.cantidad), 0)

// Agrupa líneas repetidas del mismo producto.
// En compras, cada lote se conserva como una línea independiente.
const aggregateOperationItems = (operation) => {
  const grouped = new Map()

  for (const item of operation.items ?? []) {
    const productId = Number(item.id_producto)
    const lotCode =
      operation.tipo === 'compra'
        ? String(item.codigo_lote ?? '').trim()
        : null

    const key =
      operation.tipo === 'compra'
        ? `${productId}::${lotCode}`
        : String(productId)

    const quantity = Number(item.cantidad ?? 0)
    const unitPrice = Number(item.precio_unitario ?? 0)

    if (!grouped.has(key)) {
      grouped.set(key, {
        id_producto: productId,
        nombre: item.nombre ?? item.nombre_producto ?? 'Producto',
        cantidad: 0,
        precio_total: 0,
        precio_unitario: 0,
        ...(operation.tipo === 'compra'
          ? {
              codigo_lote: lotCode,
              fecha_vencimiento: item.fecha_vencimiento ?? '',
            }
          : {}),
      })
    }

    const groupedItem = grouped.get(key)
    groupedItem.cantidad += quantity
    groupedItem.precio_total += quantity * unitPrice
  }

  return [...grouped.values()].map((item) => ({
    ...item,
    precio_unitario:
      item.cantidad > 0 ? item.precio_total / item.cantidad : 0,
    precio_total: undefined,
  }))
}

const getMatchingLotIndices = (lots, item) =>
  lots
    .map((lot, index) => ({ lot, index }))
    .filter(({ lot }) => {
      const matchesProduct =
        Number(lot.id_producto) === Number(item.id_producto)
      const matchesCode = lot.codigo_lote === item.codigo_lote
      const matchesExpiry =
        !item.fecha_vencimiento ||
        lot.fecha_vencimiento === item.fecha_vencimiento

      return matchesProduct && matchesCode && matchesExpiry
    })
    .sort((a, b) =>
      String(a.lot.fecha_vencimiento ?? '').localeCompare(
        String(b.lot.fecha_vencimiento ?? ''),
      ),
    )
    .map(({ index }) => index)

const getAvailablePurchaseLotQuantity = (lots, item) =>
  getMatchingLotIndices(lots, item).reduce(
    (sum, index) => sum + Math.max(0, Number(lots[index].cantidad) || 0),
    0,
  )

const getEligibleOperations = (state) =>
  (state.operations ?? [])
    .filter((operation) => ['venta', 'compra'].includes(operation.tipo))
    .map((operation) => ({
      ...operation,
      items: aggregateOperationItems(operation).map((item) => {
        const devuelta = getReturnedQuantity(
          state.returns,
          operation.id_operacion,
          item.id_producto,
          operation.tipo === 'compra' ? item.codigo_lote : null,
        )

        const remaining = Math.max(0, item.cantidad - devuelta)

        const available =
          operation.tipo === 'compra'
            ? Math.min(
                remaining,
                getAvailablePurchaseLotQuantity(state.lots ?? [], item),
              )
            : remaining

        return {
          ...item,
          cantidad_devuelta: devuelta,
          cantidad_disponible: available,
        }
      }),
    }))
    .filter((operation) =>
      operation.items.some((item) => item.cantidad_disponible > 0),
    )
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

const validateExpiryDate = (value, productName) => {
  const dateValue = String(value ?? '').trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    throw new Error(
      `Indica una fecha de vencimiento válida para ${productName}.`,
    )
  }

  const expiry = new Date(`${dateValue}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (
    Number.isNaN(expiry.getTime()) ||
    expiry.toISOString().slice(0, 10) !== dateValue ||
    expiry < today
  ) {
    throw new Error(
      `El producto ${productName} tiene una fecha de vencimiento inválida o pasada. Regístralo como no apto para reingreso.`,
    )
  }

  return dateValue
}

export const getReturnData = async () => {
  if (!DEMO_DATA_MODE) {
    const response = await api.get('/api/devoluciones')

    return {
      operations: [],
      returns: response.data,
    }
  }

  const state = getDemoState()
  const safeState = {
    ...state,
    operations: state.operations ?? [],
    returns: state.returns ?? [],
    lots: state.lots ?? [],
  }

  return {
    operations: getEligibleOperations(safeState),
    returns: safeState.returns
      .slice()
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
  }
}

export const createReturn = async (returnData) => {
  if (!DEMO_DATA_MODE) {
    throw new Error(
      'El registro de devoluciones mediante API estará disponible cuando se defina el contrato de integración.',
    )
  }

  const state = getDemoState()
  const operation = (state.operations ?? []).find(
    (entry) =>
      Number(entry.id_operacion) === Number(returnData.id_operacion),
  )

  if (!operation || !['venta', 'compra'].includes(operation.tipo)) {
    throw new Error('Selecciona una compra o venta válida.')
  }

  const motivo = String(returnData.motivo ?? '').trim()

  if (motivo.length < 3 || motivo.length > 250) {
    throw new Error('El motivo debe tener entre 3 y 250 caracteres.')
  }

  if (!Array.isArray(returnData.items) || returnData.items.length === 0) {
    throw new Error('Selecciona al menos un producto para devolver.')
  }

  const originalItems = aggregateOperationItems(operation)
  const selectedKeys = new Set()

  const normalizedItems = returnData.items.map((entry) => {
    const productId = Number(entry.id_producto)
    const lotCode =
      operation.tipo === 'compra'
        ? String(entry.codigo_lote ?? '').trim()
        : null

    const key =
      operation.tipo === 'compra'
        ? `${productId}::${lotCode}`
        : String(productId)

    if (selectedKeys.has(key)) {
      throw new Error(
        'Hay productos o lotes repetidos en la solicitud. Agrupa sus cantidades en una sola línea.',
      )
    }

    selectedKeys.add(key)

    const original = originalItems.find(
      (item) =>
        Number(item.id_producto) === productId &&
        (operation.tipo !== 'compra' ||
          item.codigo_lote === lotCode),
    )

    if (!original) {
      throw new Error(
        'Un producto o lote no pertenece a la operación seleccionada.',
      )
    }

    const cantidad = Number(entry.cantidad)

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new Error('Las cantidades deben ser enteros positivos.')
    }

    const alreadyReturned = getReturnedQuantity(
      state.returns ?? [],
      operation.id_operacion,
      productId,
      operation.tipo === 'compra' ? lotCode : null,
    )

    const remaining = Math.max(
      0,
      Number(original.cantidad) - alreadyReturned,
    )

    const available =
      operation.tipo === 'compra'
        ? Math.min(
            remaining,
            getAvailablePurchaseLotQuantity(state.lots ?? [], original),
          )
        : remaining

    if (cantidad > available) {
      throw new Error(
        `Solo quedan ${available} unidades disponibles para devolver de ${original.nombre}${lotCode ? ` (lote ${lotCode})` : ''}.`,
      )
    }

    const item = {
      id_producto: productId,
      nombre: original.nombre,
      cantidad,
      precio_unitario: Number(original.precio_unitario ?? 0),
    }

    if (operation.tipo === 'compra') {
      if (!lotCode) {
        throw new Error(
          `La compra no tiene un código de lote válido para ${original.nombre}.`,
        )
      }

      item.codigo_lote = lotCode

      if (original.fecha_vencimiento) {
        item.fecha_vencimiento = original.fecha_vencimiento
      }
    } else {
      const condicion =
        entry.condicion === 'danado' ? 'danado' : 'reintegrar'

      item.condicion = condicion

      if (condicion === 'reintegrar') {
        const codigoLote = String(entry.codigo_lote ?? '').trim()

        if (!codigoLote) {
          throw new Error(
            `Indica el código de lote del empaque de ${original.nombre}.`,
          )
        }

        item.codigo_lote = codigoLote
        item.fecha_vencimiento = validateExpiryDate(
          entry.fecha_vencimiento,
          original.nombre,
        )
      }
    }

    return item
  })

  const totalEstimado = roundMoney(
    normalizedItems.reduce(
      (sum, item) => sum + item.cantidad * item.precio_unitario,
      0,
    ),
  )

  let created

  updateDemoState((current) => {
    const currentReturns = current.returns ?? []
    const currentLots = current.lots ?? []
    const currentMovements = current.movements ?? []

    const currentOperation = (current.operations ?? []).find(
      (entry) =>
        Number(entry.id_operacion) === Number(operation.id_operacion),
    )

    if (!currentOperation) {
      throw new Error('La operación original ya no está disponible.')
    }

    let products = [...(current.products ?? [])]
    let lots = [...currentLots]
    let movements = [...currentMovements]

    const id = getNextDemoId(currentReturns, 'id_devolucion')
    const fecha = new Date().toISOString()

    normalizedItems.forEach((item) => {
      const productIndex = products.findIndex(
        (product) =>
          Number(product.id_producto ?? product.id) === item.id_producto,
      )

      if (productIndex < 0) {
        throw new Error(`No se encontró el producto ${item.nombre}.`)
      }

      const product = products[productIndex]
      const originalItemsNow = aggregateOperationItems(currentOperation)

      const originalNow = originalItemsNow.find(
        (entry) =>
          Number(entry.id_producto) === item.id_producto &&
          (currentOperation.tipo !== 'compra' ||
            entry.codigo_lote === item.codigo_lote),
      )

      if (!originalNow) {
        throw new Error(
          `No se encontró el producto ${item.nombre} en la operación original.`,
        )
      }

      const alreadyReturnedNow = getReturnedQuantity(
        currentReturns,
        currentOperation.id_operacion,
        item.id_producto,
        currentOperation.tipo === 'compra'
          ? item.codigo_lote
          : null,
      )

      const remainingNow = Math.max(
        0,
        Number(originalNow.cantidad) - alreadyReturnedNow,
      )

      if (item.cantidad > remainingNow) {
        throw new Error(
          `La cantidad disponible de ${item.nombre} cambió. Actualiza la información e inténtalo nuevamente.`,
        )
      }

      if (currentOperation.tipo === 'compra') {
        const matchingIndices = getMatchingLotIndices(lots, {
          ...item,
          fecha_vencimiento:
            item.fecha_vencimiento ?? originalNow.fecha_vencimiento,
        })

        const lotAvailable = matchingIndices.reduce(
          (sum, index) =>
            sum + Math.max(0, Number(lots[index].cantidad) || 0),
          0,
        )

        if (
          lotAvailable < item.cantidad ||
          Number(product.stock ?? 0) < item.cantidad
        ) {
          throw new Error(
            `No hay unidades suficientes del lote ${item.codigo_lote} de ${item.nombre} para devolver al proveedor.`,
          )
        }

        let quantityToRemove = item.cantidad

        for (const lotIndex of matchingIndices) {
          if (quantityToRemove <= 0) break

          const lot = lots[lotIndex]
          const lotQuantity = Math.max(0, Number(lot.cantidad) || 0)
          const removed = Math.min(lotQuantity, quantityToRemove)

          lots[lotIndex] = {
            ...lot,
            cantidad: lotQuantity - removed,
          }

          quantityToRemove -= removed
        }

        products[productIndex] = {
          ...product,
          stock: Number(product.stock ?? 0) - item.cantidad,
        }

        movements.push({
          id_movimiento: getNextDemoId(
            [...currentMovements, ...movements.slice(currentMovements.length)],
            'id_movimiento',
          ),
          id_producto: item.id_producto,
          nombre_producto: item.nombre,
          tipo: 'salida',
          cantidad: item.cantidad,
          fecha,
          referencia: `Devolución de compra #${id}`,
        })
      } else if (item.condicion === 'reintegrar') {
        products[productIndex] = {
          ...product,
          stock: Number(product.stock ?? 0) + item.cantidad,
        }

        const existingLotIndex = lots.findIndex(
          (lot) =>
            Number(lot.id_producto) === item.id_producto &&
            lot.codigo_lote === item.codigo_lote &&
            lot.fecha_vencimiento === item.fecha_vencimiento,
        )

        if (existingLotIndex >= 0) {
          lots[existingLotIndex] = {
            ...lots[existingLotIndex],
            cantidad:
              Number(lots[existingLotIndex].cantidad) + item.cantidad,
          }
        } else {
          lots.push({
            id_lote: getNextDemoId(lots, 'id_lote'),
            id_producto: item.id_producto,
            nombre_producto: item.nombre,
            codigo_lote: item.codigo_lote,
            cantidad: item.cantidad,
            fecha_vencimiento: item.fecha_vencimiento,
            estado: 'vigente',
          })
        }

        movements.push({
          id_movimiento: getNextDemoId(
            [...currentMovements, ...movements.slice(currentMovements.length)],
            'id_movimiento',
          ),
          id_producto: item.id_producto,
          nombre_producto: item.nombre,
          tipo: 'entrada',
          cantidad: item.cantidad,
          fecha,
          referencia: `Devolución de venta #${id}`,
        })
      }
    })

    created = {
      id_devolucion: id,
      id_operacion: Number(currentOperation.id_operacion),
      tipo:
        currentOperation.tipo === 'venta'
          ? 'devolucion_venta'
          : 'devolucion_compra',
      tipo_operacion: currentOperation.tipo,
      id_contacto: currentOperation.id_contacto ?? null,
      nombre_contacto: currentOperation.nombre_contacto ?? '',
      fecha,
      motivo,
      items: normalizedItems,
      total_estimado: totalEstimado,
      estado: 'Registrada',
      estado_financiero: 'Sin movimiento financiero',
    }

    return {
      ...current,
      products,
      lots,
      movements,
      returns: [...currentReturns, created],
    }
  })

  return created
}
