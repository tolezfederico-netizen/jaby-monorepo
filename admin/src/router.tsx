import { createBrowserRouter } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './components/AdminLayout'

// Cada sección se carga recién al entrar, para no bajar todo el admin (y xlsx) de una
const page = (load: () => Promise<{ default: React.ComponentType }>) => async () => ({
  Component: (await load()).default,
})

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        lazy: page(() => import('./pages/DashboardPage')),
      },
      {
        path: 'orders',
        lazy: page(() => import('./pages/OrdersPage')),
      },
      {
        path: 'categories',
        lazy: page(() => import('./pages/CategoriesPage')),
      },
      {
        path: 'products',
        lazy: page(() => import('./pages/ProductsPage')),
      },
      {
        path: 'customers',
        lazy: page(() => import('./pages/CustomersPage')),
      },
      {
        path: 'settings',
        lazy: page(() => import('./pages/SettingsPage')),
      },
      {
        path: 'contenido-multimedia',
        lazy: page(() => import('./pages/MediaContentPage')),
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
