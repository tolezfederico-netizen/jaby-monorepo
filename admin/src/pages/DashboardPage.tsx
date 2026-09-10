import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToggleAppActive } from '../hooks/useStoreConfig'
import { useStoreConfig } from '../hooks/useStoreConfig'
import { useOrders } from '../hooks/useOrders'
import { useLongOutOfStockProductCount } from '../hooks/useProducts'
import { formatPrice } from '@jaby/shared'
import ConfirmModal from '../components/ConfirmModal'
import styles from './DashboardPage.module.css'

function getTodayOrders(orders: ReturnType<typeof useOrders>['data']) {
  if (!orders) return []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return orders.filter((o) => new Date(o.created_at ?? '') >= today)
}

function getTodayLabel(): string {
  return new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  in_progress: 'En curso',
  completed: 'Completado',
} as const

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function getLastSevenDays(orders: ReturnType<typeof useOrders>['data']) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))
    const nextDate = new Date(date)
    nextDate.setDate(date.getDate() + 1)
    return {
      key: date.toDateString(),
      label: date.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', ''),
      count: (orders ?? []).filter((order) => {
        const createdAt = new Date(order.created_at ?? '')
        return createdAt >= date && createdAt < nextDate
      }).length,
    }
  })
}

function DashboardPage() {
  const navigate = useNavigate()
  const { data: config, isLoading: configLoading } = useStoreConfig()
  const { data: orders, isLoading: ordersLoading } = useOrders()
  const { data: longOutOfStockCount = 0 } = useLongOutOfStockProductCount()
  const toggleApp = useToggleAppActive()

  const todayOrders = getTodayOrders(orders)
  const latestOrders = [...(orders ?? [])]
    .sort((a, b) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime())
    .slice(0, 5)
  const weeklyOrders = getLastSevenDays(orders)
  const weeklyMax = Math.max(...weeklyOrders.map((day) => day.count), 1)
  const todayRevenue = todayOrders
    .filter((order) => ['confirmed', 'in_progress', 'completed'].includes(order.status))
    .reduce((total, order) => total + order.total + (order.delivery_cost ?? 0), 0)

  const counts = {
    pending: todayOrders.filter((o) => o.status === 'pending').length,
    confirmed: todayOrders.filter((o) => o.status === 'confirmed').length,
    in_progress: todayOrders.filter((o) => o.status === 'in_progress').length,
    completed: todayOrders.filter((o) => o.status === 'completed').length,
  }

  const [toggleError, setToggleError] = useState<string | null>(null)
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)

  const handleToggleApp = () => {
    if (toggleApp.isPending) return
    toggleApp.mutate(undefined, {
      onSuccess: () => setToggleError(null),
      onError: () => {
        setToggleError('Error al cambiar el estado de la aplicación. Intentá de nuevo.')
      },
    })
  }

  const handleToggleRequest = () => {
    if (config?.is_app_active) {
      setShowDeactivateConfirm(true)
      return
    }
    handleToggleApp()
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <h1 className={styles.title}>
            {configLoading ? 'Hola 👋' : `Hola, ${config?.store_name || 'tu tienda'} 👋`}
          </h1>
          <span className={styles.titleSub}>{getTodayLabel()}</span>
        </div>
        <div className={styles.appStatusChip}>
          <div className={styles.appStatusInfo}>
            {configLoading ? (
              <span className={styles.statusLoading}>Cargando...</span>
            ) : (
              <>
                <span
                  className={`${styles.statusDot} ${
                    config?.is_app_active ? styles.statusDotActive : styles.statusDotInactive
                  }`}
                />
                <span className={styles.statusLabel}>
                  {config?.is_app_active ? 'Aplicación activa' : 'Aplicación desactivada'}
                </span>
              </>
            )}
          </div>
          <button
            className={`${styles.toggleButton} ${
              config?.is_app_active ? styles.toggleButtonDeactivate : styles.toggleButtonActivate
            }`}
            onClick={handleToggleRequest}
            disabled={configLoading || toggleApp.isPending}
          >
            {toggleApp.isPending
              ? 'Guardando...'
              : config?.is_app_active
              ? 'Desactivar'
              : 'Activar'}
          </button>
        </div>
      </div>

      {toggleError && (
        <p className={styles.toggleError} role="alert">{toggleError}</p>
      )}

      <div className={styles.devTip}>
        💡 Para una mejor experiencia al notificar clientes, se recomienda usar <strong>WhatsApp Desktop</strong>.
      </div>

      {longOutOfStockCount > 0 && (
        <div className={styles.stockAlert} role="status">
          <span className={styles.stockAlertIcon} aria-hidden="true">!</span>
          <span>
            {longOutOfStockCount} {longOutOfStockCount === 1 ? 'producto lleva' : 'productos llevan'} agotado{longOutOfStockCount === 1 ? '' : 's'} más de una semana.
          </span>
          <button onClick={() => navigate('/products?filter=out_of_stock')}>
            Ver productos
          </button>
        </div>
      )}

      {/* Pedidos del día */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Pedidos de hoy
          <span className={styles.sectionCount}>{todayOrders.length}</span>
        </h2>

        {ordersLoading ? (
          <p className={styles.loadingText}>Cargando pedidos...</p>
        ) : (
          <div className={styles.statsGrid}>
            <button
              type="button"
              className={`${styles.statCard} ${styles.statPending}`}
              onClick={() => navigate('/orders?status=pending')}
            >
              <span className={styles.statNumber}>{counts.pending}</span>
              <span className={styles.statLabel}>Pendientes</span>
            </button>
            <button
              type="button"
              className={`${styles.statCard} ${styles.statConfirmed}`}
              onClick={() => navigate('/orders?status=confirmed')}
            >
              <span className={styles.statNumber}>{counts.confirmed}</span>
              <span className={styles.statLabel}>Confirmados</span>
            </button>
            <button
              type="button"
              className={`${styles.statCard} ${styles.statInProgress}`}
              onClick={() => navigate('/orders?status=in_progress')}
            >
              <span className={styles.statNumber}>{counts.in_progress}</span>
              <span className={styles.statLabel}>En curso</span>
            </button>
            <button
              type="button"
              className={`${styles.statCard} ${styles.statCompleted}`}
              onClick={() => navigate('/orders?status=completed')}
            >
              <span className={styles.statNumber}>{counts.completed}</span>
              <span className={styles.statLabel}>Completados</span>
            </button>
            <div className={`${styles.statCard} ${styles.statRevenue}`}>
              <span className={styles.statNumber}>{formatPrice(todayRevenue)}</span>
              <span className={styles.statLabel}>Vendido hoy</span>
              <span className={styles.statHint}>Confirmados, en curso y completados</span>
            </div>
          </div>
        )}
      </section>

      <div className={styles.dashboardGrid}>
        <section className={`${styles.section} ${styles.dashboardCard}`}>
          <div className={styles.cardHeading}>
            <h2 className={styles.sectionTitle}>Últimos pedidos</h2>
            <button className={styles.textLink} onClick={() => navigate('/orders')}>
              Ver todos
            </button>
          </div>
          {ordersLoading ? (
            <p className={styles.loadingText}>Cargando pedidos...</p>
          ) : latestOrders.length === 0 ? (
            <p className={styles.emptyText}>Todavía no hay pedidos.</p>
          ) : (
            <div className={styles.recentOrders}>
              {latestOrders.map((order) => (
                <button
                  key={order.id}
                  className={styles.recentOrder}
                  onClick={() => navigate(`/orders?orderId=${order.id}`)}
                >
                  <span className={styles.recentOrderMain}>
                    <span className={styles.recentOrderName}>{order.customer_name}</span>
                    <span className={styles.recentOrderTime}>{formatTime(order.created_at)}</span>
                  </span>
                  <span className={styles.recentOrderMeta}>
                    <span>{formatPrice(order.total + (order.delivery_cost ?? 0))}</span>
                    <span className={`${styles.orderStatus} ${styles[`orderStatus_${order.status}`]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
          <button className={styles.ordersFooterLink} onClick={() => navigate('/orders')}>
            Ver todos los pedidos →
          </button>
        </section>

        <section className={`${styles.section} ${styles.dashboardCard}`}>
          <h2 className={styles.sectionTitle}>Pedidos de los últimos 7 días</h2>
          <div className={styles.chart} aria-label="Cantidad de pedidos por día durante los últimos siete días">
            {weeklyOrders.map((day) => (
              <div key={day.key} className={styles.chartColumn}>
                <span className={styles.chartValue}>{day.count}</span>
                <div className={styles.chartTrack}>
                  <div className={styles.chartBar} style={{ height: `${(day.count / weeklyMax) * 100}%` }} />
                </div>
                <span className={styles.chartLabel}>{day.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Accesos rápidos */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Accesos rápidos</h2>
        <div className={styles.quickLinks}>
          <button
            className={styles.quickLink}
            onClick={() => navigate('/orders')}
          >
            <span className={styles.quickLinkIcon} aria-hidden="true">▤</span>
            <span className={styles.quickLinkTitle}>Pedidos</span>
            <span className={styles.quickLinkDesc}>Ver y gestionar todos los pedidos</span>
          </button>
          <button
            className={styles.quickLink}
            onClick={() => navigate('/products')}
          >
            <span className={styles.quickLinkIcon} aria-hidden="true">□</span>
            <span className={styles.quickLinkTitle}>Productos</span>
            <span className={styles.quickLinkDesc}>Agregar, editar y pausar productos</span>
          </button>
          <button
            className={styles.quickLink}
            onClick={() => navigate('/settings')}
          >
            <span className={styles.quickLinkIcon} aria-hidden="true">⚙</span>
            <span className={styles.quickLinkTitle}>Configuración</span>
            <span className={styles.quickLinkDesc}>Horarios, delivery y banner</span>
          </button>
        </div>
      </section>

      {showDeactivateConfirm && (
        <ConfirmModal
          title="Desactivar tienda"
          message="¿Seguro que querés desactivar la tienda? Los clientes no podrán hacer pedidos mientras esté desactivada."
          confirmLabel="Desactivar"
          isDanger={true}
          onConfirm={() => {
            setShowDeactivateConfirm(false)
            handleToggleApp()
          }}
          onCancel={() => setShowDeactivateConfirm(false)}
        />
      )}
    </div>
  )
}

export default DashboardPage
