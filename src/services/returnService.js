import api from './api'
import { DEMO_DATA_MODE } from './dataMode'
import { updateDemoState } from './demoStore'

export const anularVenta = async (id, motivo) => {
  if (!DEMO_DATA_MODE) {
    const response = await api.post(`/ventas/${id}/anular`, { motivo })
    return response.data?.data
  }

  let cancelled = null
  updateDemoState((current) => ({
    ...current,
    operations: current.operations.map((operation) => {
      const operationId = operation.id_venta ?? operation.id_operacion ?? operation.id
      if (operation.tipo !== 'venta' || Number(operationId) !== Number(id)) {
        return operation
      }
      cancelled = {
        ...operation,
        estado: 'anulada',
        motivo_anulacion: motivo,
      }
      return cancelled
    }),
  }))

  return cancelled
}
