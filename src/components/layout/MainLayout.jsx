import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  const openMenu = () => setMenuOpen(true)
  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        isOpen={menuOpen}
        onClose={closeMenu}
      />

      <div className="min-w-0 flex-1">
        <Header onMenuClick={openMenu} />

        <main className="p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
