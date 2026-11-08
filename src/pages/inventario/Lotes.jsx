import InventoryDataView from '../../components/common/InventoryDataView'
import { getInventoryLots } from '../../services/inventoryService'

export default function Lotes() {
  return (
    <InventoryDataView
      titulo="Control de lotes"
      descripcion="Consulta los lotes registrados y sus fechas de vencimiento."
      loader={getInventoryLots}
    />
  )
}
