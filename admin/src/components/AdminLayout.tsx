import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  CategoriesIcon,
  CustomersIcon,
  DashboardIcon,
  MediaIcon,
  OrdersIcon,
  ProductsIcon,
  SettingsIcon,
} from './icons'
import styles from './AdminLayout.module.css'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', exact: true, Icon: DashboardIcon },
  { to: '/orders', label: 'Pedidos', exact: false, Icon: OrdersIcon },
  { to: '/products', label: 'Productos', exact: false, Icon: ProductsIcon },
  { to: '/categories', label: 'Categorías', exact: false, Icon: CategoriesIcon },
  { to: '/contenido-multimedia', label: 'Contenido Multimedia', exact: false, Icon: MediaIcon },
  { to: '/customers', label: 'Clientes', exact: false, Icon: CustomersIcon },
  { to: '/settings', label: 'Configuración', exact: false, Icon: SettingsIcon },
] as const

function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className={styles.shell}>
      <div className={styles.mobileBar} aria-hidden="true" />
      <button
        className={styles.hamburger}
        onClick={() => setIsSidebarOpen(true)}
        aria-label="Abrir menú"
      >
        ☰
      </button>

      {isSidebarOpen && <div className={styles.overlay} onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <span className={styles.brandName}>Antojos Ya</span>
          <span className={styles.brandLabel}>Admin</span>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
              onClick={() => setIsSidebarOpen(false)}
            >
              <item.Icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.footer}>
          <span className={styles.userEmail}>{user?.email}</span>
          <button className={styles.signOutButton} onClick={handleSignOut}>
            Salir
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
