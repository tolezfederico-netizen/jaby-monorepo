import { createBrowserRouter, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import CatalogPage from './pages/CatalogPage'
import CheckoutPage from './pages/CheckoutPage'
import PrivacyPage from './pages/PrivacyPage'
import NotFoundPage from './pages/NotFoundPage'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return <Outlet />
}

export const router = createBrowserRouter([
  {
    element: <ScrollToTop />,
    children: [
      {
        path: '/',
        element: <CatalogPage />,
      },
      {
        path: '/checkout',
        element: <CheckoutPage />,
      },
      {
        path: '/privacidad',
        element: <PrivacyPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
