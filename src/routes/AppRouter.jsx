import { Navigate, Route, Routes } from 'react-router-dom'

import MainLayout from '../components/layout/MainLayout'
import { useAuth } from '../context/useAuth'
import ProtectedRoute from './ProtectedRoute'
import { getRoleHome } from './roleHome'

import Dashboard from '../pages/dashboard/Dashboard'
import Categorias from '../pages/categorias/Categorias'
import Proveedores from '../pages/proveedores/Proveedores'
import Clientes from '../pages/clientes/Clientes'
import Inventario from '../pages/inventario/Inventario'
import Compras from '../pages/compras/Compras'
import Ventas from '../pages/ventas/Ventas'
import Pagos from '../pages/pagos/Pagos'
import Devoluciones from '../pages/devoluciones/Devoluciones'
import Reportes from '../pages/reportes/Reportes'
import Alertas from '../pages/inventario/Alertas'
import Movimientos from '../pages/inventario/Movimientos'
import Stock from '../pages/inventario/Stock'
import Login from '../pages/auth/Login'

const ADMIN_ROLES = ['admin']

function RoleHomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={getRoleHome(user?.rol)} replace />
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<RoleHomeRedirect />} />

        <Route element={<MainLayout />}>
          <Route path="/productos" element={<Stock />} />
          <Route path="/categorias" element={<Categorias />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/pagos" element={<Pagos />} />
          <Route path="/alertas" element={<Alertas />} />

          <Route element={<ProtectedRoute allowedRoles={ADMIN_ROLES} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/proveedores" element={<Proveedores />} />
            <Route path="/compras" element={<Compras />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/kardex" element={<Movimientos />} />
            <Route path="/devoluciones" element={<Devoluciones />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
