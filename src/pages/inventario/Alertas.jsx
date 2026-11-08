import InventoryDataView from '../../components/common/InventoryDataView'
import {
  getExpirationAlerts,
  getReplenishmentAlerts,
} from '../../services/inventoryService'

export default function Alertas() {
  return (
    <div className="space-y-6">
      <InventoryDataView
        titulo="Alertas de reposición"
        descripcion="Productos que necesitan reabastecimiento según sus existencias."
        loader={getReplenishmentAlerts}
      />

      <InventoryDataView
        titulo="Alertas de vencimiento"
        descripcion="Lotes que requieren seguimiento por su fecha de vencimiento."
        loader={getExpirationAlerts}
      />
    </div>
  )
}
