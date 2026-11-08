import InventoryDataView from '../../components/common/InventoryDataView'
import { getInventoryMovements } from '../../services/inventoryService'

export default function Movimientos() {
  return (
    <InventoryDataView
      titulo="Kardex de inventario"
      descripcion="Consulta el historial de movimientos. Se muestran hasta 50 registros por consulta."
      loader={getInventoryMovements}
    />
  )
}
