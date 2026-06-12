import { useNavigate } from 'react-router-dom'
import { useToggleAppActive } from '../hooks/useStoreConfig'
import { useStoreConfig } from '../hooks/useStoreConfig'
import { useOrders } from '../hooks/useOrders'
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

function DashboardPage() {
  const navigate = useNavigate()
  const { data: config, isLoading: configLoading } = useStoreConfig()
  const { data: orders, isLoading: ordersLoading } = useOrders()
  const toggleApp = useToggleAppActive()

  const todayOrders = getTodayOrders(orders)

  const counts = {
    pending: todayOrders.filter((o) => o.status === 'pending').length,
    confirmed: todayOrders.filter((o) => o.status === 'confirmed').length,
    in_progress: todayOrders.filter((o) => o.status === 'in_progress').length,
    completed: todayOrders.filter((o) => o.status === 'completed').length,
  }

  const handleToggleApp = () => {
    if (toggleApp.isPending) return
    toggleApp.mutate()
  }

  return (
    <div className={styles.page}>
      <div className={styles.titleWrapper}>
        <h1 className={styles.title}>Dashboard</h1>
        <span className={styles.titleSub}>{getTodayLabel()}</span>
      </div>

      <div className={styles.devTip}>
        💡 Para una mejor experiencia al notificar clientes, se recomienda usar <strong>WhatsApp Desktop</strong>.
      </div>

      {/* Estado de la app */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Estado de la aplicación</h2>
        <div className={styles.appStatusCard}>
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
            onClick={handleToggleApp}
            disabled={configLoading || toggleApp.isPending}
          >
            {toggleApp.isPending
              ? 'Guardando...'
              : config?.is_app_active
              ? 'Desactivar'
              : 'Activar'}
          </button>
        </div>
      </section>

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
            <div className={`${styles.statCard} ${styles.statPending}`}>
              <span className={styles.statNumber}>{counts.pending}</span>
              <span className={styles.statLabel}>Pendientes</span>
            </div>
            <div className={`${styles.statCard} ${styles.statConfirmed}`}>
              <span className={styles.statNumber}>{counts.confirmed}</span>
              <span className={styles.statLabel}>Confirmados</span>
            </div>
            <div className={`${styles.statCard} ${styles.statInProgress}`}>
              <span className={styles.statNumber}>{counts.in_progress}</span>
              <span className={styles.statLabel}>En curso</span>
            </div>
            <div className={`${styles.statCard} ${styles.statCompleted}`}>
              <span className={styles.statNumber}>{counts.completed}</span>
              <span className={styles.statLabel}>Completados</span>
            </div>
          </div>
        )}
      </section>

      {/* Accesos rápidos */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Accesos rápidos</h2>
        <div className={styles.quickLinks}>
          <button
            className={styles.quickLink}
            onClick={() => navigate('/orders')}
          >
            <span className={styles.quickLinkTitle}>Pedidos</span>
            <span className={styles.quickLinkDesc}>Ver y gestionar todos los pedidos</span>
          </button>
          <button
            className={styles.quickLink}
            onClick={() => navigate('/products')}
          >
            <span className={styles.quickLinkTitle}>Productos</span>
            <span className={styles.quickLinkDesc}>Agregar, editar y pausar productos</span>
          </button>
          <button
            className={styles.quickLink}
            onClick={() => navigate('/settings')}
          >
            <span className={styles.quickLinkTitle}>Configuración</span>
            <span className={styles.quickLinkDesc}>Horarios, delivery y banner</span>
          </button>
        </div>
      </section>
    </div>
  )
}

export default DashboardPage
