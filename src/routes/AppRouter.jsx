import { Navigate, Route, Routes } from 'react-router-dom'

import MainLayout from '../components/layout/MainLayout'
import ProtectedRoute from './ProtectedRoute'

import Dashboard from '../pages/dashboard/Dashboard'
import Productos from '../pages/productos/Productos'
import Categorias from '../pages/categorias/Categorias'
import Proveedores from '../pages/proveedores/Proveedores'
import Clientes from '../pages/clientes/Clientes'
import Inventario from '../pages/inventario/Inventario'
import Compras from '../pages/compras/Compras'
import Ventas from '../pages/ventas/Ventas'
import Pagos from '../pages/pagos/Pagos'
import Devoluciones from '../pages/devoluciones/Devoluciones'
import Reportes from '../pages/reportes/Reportes'
import Login from '../pages/auth/Login'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/categorias" element={<Categorias />} />
          <Route path="/proveedores" element={<Proveedores />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/compras" element={<Compras />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/pagos" element={<Pagos />} />
          <Route path="/devoluciones" element={<Devoluciones />} />
          <Route path="/reportes" element={<Reportes />} />
        </Route>
      </Route>

      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
    </Routes>
  )
}