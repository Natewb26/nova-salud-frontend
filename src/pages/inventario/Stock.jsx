import InventoryDataView from '../../components/common/InventoryDataView'
import { getInventoryStock } from '../../services/inventoryService'

export default function Stock() {
  return (
    <InventoryDataView
      titulo="Stock disponible"
      descripcion="Consulta las existencias actuales de los productos."
      loader={getInventoryStock}
    />
  )
}
