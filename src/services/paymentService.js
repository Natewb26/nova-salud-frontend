import api from './api'
import { DEMO_DATA_MODE } from './dataMode'
import {
  getDemoState,
  updateDemoState,
  getNextDemoId,
} from './demoStore'

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100

const enrichOperations = (operations, payments) => {
  return operations.map((operation) => {
    const relatedPayments = payments.filter(
      (payment) =>
        Number(payment.id_operacion) === Number(operation.id_operacion),
    )

    const totalPagado = roundMoney(
      relatedPayments.reduce(
        (sum, payment) => sum + Number(payment.importe),
        0,
      ),
    )

    const total = roundMoney(operation.total ?? 0)
    const saldoPendiente = roundMoney(Math.max(0, total - totalPagado))

    let estadoPago = 'Pendiente'

    if (saldoPendiente === 0 && total > 0) {
      estadoPago = 'Pagada'
    } else if (totalPagado > 0) {
      estadoPago = 'Parcial'
    }

    return {
      ...operation,
      total_pagado: totalPagado,
      saldo_pendiente: saldoPendiente,
      estado_pago: estadoPago,
    }
  })
}

export const getPaymentData = async () => {
  if (DEMO_DATA_MODE) {
    const state = getDemoState()

    const payments = state.payments
      .slice()
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

    return {
      operations: enrichOperations(state.operations, payments)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
      payments,
    }
  }

  const response = await api.get('/api/operaciones', {
    params: { limit: 100, offset: 0 },
  })

  return {
    operations: response.data,
    payments: [],
  }
}

export const getPaymentOperations = async () => {
  const data = await getPaymentData()
  return data.operations
}

export const createPayment = async (paymentData) => {
  if (!DEMO_DATA_MODE) {
    throw new Error(
      'El registro de pagos mediante API estará disponible cuando se defina el contrato de integración.',
    )
  }

  const state = getDemoState()

  const operation = state.operations.find(
    (entry) =>
      Number(entry.id_operacion) === Number(paymentData.id_operacion),
  )

  if (!operation) {
    throw new Error('La operación seleccionada no existe.')
  }

  if (!['venta', 'compra'].includes(operation.tipo)) {
    throw new Error('El tipo de operación no permite registrar pagos.')
  }

  const importe = roundMoney(paymentData.importe)

  if (!Number.isFinite(importe) || importe <= 0) {
    throw new Error('El importe debe ser mayor que cero.')
  }

  const metodo = String(paymentData.metodo_pago ?? '').trim()

  if (!metodo) {
    throw new Error('Selecciona un método de pago.')
  }

  const existingPayments = state.payments.filter(
    (entry) =>
      Number(entry.id_operacion) === Number(operation.id_operacion),
  )

  const totalPagado = roundMoney(
    existingPayments.reduce(
      (sum, entry) => sum + Number(entry.importe),
      0,
    ),
  )

  const total = roundMoney(operation.total ?? 0)
  const saldo = roundMoney(total - totalPagado)

  if (saldo <= 0) {
    throw new Error('Esta operación ya se encuentra pagada.')
  }

  if (importe > saldo) {
    throw new Error(
      `El importe supera el saldo pendiente de S/ ${saldo.toFixed(2)}.`,
    )
  }

  let created

  updateDemoState((current) => {
    const id = getNextDemoId(current.payments, 'id_pago')

    created = {
      id_pago: id,
      id_operacion: Number(operation.id_operacion),
      tipo: operation.tipo === 'venta' ? 'cobro' : 'pago',
      tipo_operacion: operation.tipo,
      id_contacto: operation.id_contacto ?? null,
      nombre_contacto: operation.nombre_contacto ?? '',
      importe,
      metodo_pago: metodo,
      fecha: new Date().toISOString(),
      observacion: String(paymentData.observacion ?? '').trim(),
    }

    return {
      ...current,
      payments: [...current.payments, created],
    }
  })

  return created
}
