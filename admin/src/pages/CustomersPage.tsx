import { useState } from 'react'
import * as XLSX from 'xlsx-js-style'
import { useCustomers, useDeleteCustomer } from '../hooks/useCustomers'
import type { CustomerType } from '../hooks/useCustomers'
import ConfirmModal from '../components/ConfirmModal'
import styles from './CustomersPage.module.css'

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return ''
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return `hace ${Math.floor(diff / 86400)} d`
}

function exportToExcel(customers: CustomerType[]) {
  const headers = [
    'Nombre',
    'Teléfono',
    'Pedidos realizados',
    'Última modalidad',
    'Última dirección',
    'Historial de direcciones',
    'Primer pedido',
    'Último pedido',
  ]

  const colWidths = [25, 18, 22, 20, 30, 45, 25, 25]

  const rows = customers.map((c) => [
    c.name,
    c.phone,
    c.total_orders,
    c.last_modality === 'delivery'
      ? 'Delivery'
      : c.last_modality === 'pickup'
        ? 'Retiro en local'
        : '',
    c.last_address ?? '',
    c.address_history.join(' / '),
    c.first_seen_at
      ? new Date(c.first_seen_at).toLocaleString('es-AR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : '',
    c.last_seen_at
      ? new Date(c.last_seen_at).toLocaleString('es-AR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : '',
  ])

  const wsData = [headers, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Anchos de columna
  ws['!cols'] = colWidths.map((w) => ({ wch: w }))

  // Estilos del header
  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Calibri', sz: 11 },
    fill: { fgColor: { rgb: '1E3A5F' }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'C0C8D0' } },
      bottom: { style: 'thin', color: { rgb: 'C0C8D0' } },
      left: { style: 'thin', color: { rgb: 'C0C8D0' } },
      right: { style: 'thin', color: { rgb: 'C0C8D0' } },
    },
  }

  // Estilos de filas de datos
  const rowStyleEven = {
    font: { name: 'Calibri', sz: 11 },
    fill: { fgColor: { rgb: 'F0F4F8' }, patternType: 'solid' },
    alignment: { vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'C0C8D0' } },
      bottom: { style: 'thin', color: { rgb: 'C0C8D0' } },
      left: { style: 'thin', color: { rgb: 'C0C8D0' } },
      right: { style: 'thin', color: { rgb: 'C0C8D0' } },
    },
  }

  const rowStyleOdd = {
    font: { name: 'Calibri', sz: 11 },
    fill: { fgColor: { rgb: 'FFFFFF' }, patternType: 'solid' },
    alignment: { vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'C0C8D0' } },
      bottom: { style: 'thin', color: { rgb: 'C0C8D0' } },
      left: { style: 'thin', color: { rgb: 'C0C8D0' } },
      right: { style: 'thin', color: { rgb: 'C0C8D0' } },
    },
  }

  const totalRows = wsData.length
  const totalCols = headers.length

  for (let R = 0; R < totalRows; R++) {
    for (let C = 0; C < totalCols; C++) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C })
      if (!ws[cellRef]) ws[cellRef] = { v: '', t: 's' }
      ws[cellRef].s = R === 0
        ? headerStyle
        : R % 2 === 0
          ? rowStyleEven
          : rowStyleOdd
    }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes')

  XLSX.writeFile(wb, 'clientes-antojos-express.xlsx', { cellStyles: true })
}

interface CustomerCardProps {
  customer: CustomerType
  isSelected: boolean
  onClick: () => void
}

function CustomerCard({ customer, isSelected, onClick }: CustomerCardProps) {
  return (
    <div
      className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
      onClick={onClick}
    >
      <div className={styles.cardHeader}>
        <span className={styles.customerName}>{customer.name}</span>
        <span className={styles.totalOrders}>
          {customer.total_orders} pedido{customer.total_orders !== 1 ? 's' : ''}
        </span>
      </div>
      <div className={styles.cardBody}>
        <span className={styles.phone}>📱 {customer.phone}</span>
        <div className={styles.cardBodyRight}>
          <span className={styles.lastSeen}>{timeAgo(customer.last_seen_at)}</span>
        </div>
      </div>
    </div>
  )
}

interface CustomerDetailPanelProps {
  customer: CustomerType | null
  onClose: () => void
  isPanelOpen: boolean
  onDelete: (customer: CustomerType) => void
}

function CustomerDetailPanel({ customer, onClose, isPanelOpen, onDelete }: CustomerDetailPanelProps) {
  if (!customer) {
    return (
      <div className={`${styles.panel} ${isPanelOpen ? styles.panelVisible : ''}`}>
        <div className={styles.panelEmpty}>
          <span className={styles.panelEmptyIcon}>👤</span>
          <p className={styles.panelEmptyTitle}>Ningún cliente seleccionado</p>
          <p className={styles.panelEmptyDesc}>Seleccioná un cliente de la lista para ver su detalle.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.panel} ${isPanelOpen ? styles.panelVisible : ''}`}>
      <div className={styles.panelHeader}>
        <div className={styles.panelHeaderLeft}>
          <span className={styles.panelCustomerName}>{customer.name}</span>
        </div>
        <button className={styles.deleteButton} onClick={() => onDelete(customer)}>
          Eliminar
        </button>
        <button className={styles.panelCloseBtn} onClick={onClose}>✕</button>
      </div>

      <div className={styles.panelBody}>
        <div className={styles.panelSection}>
          <span className={styles.panelLabel}>Teléfono</span>
          <span className={styles.panelValue}>📱 {customer.phone}</span>
        </div>

        <div className={styles.panelSection}>
          <span className={styles.panelLabel}>Última modalidad</span>
          <span className={styles.panelValue}>
            {customer.last_modality === 'delivery'
              ? '🚗 Delivery'
              : customer.last_modality === 'pickup'
                ? '🏪 Retiro en local'
                : '—'}
          </span>
        </div>

        <div className={styles.panelSection}>
          <span className={styles.panelLabel}>Última dirección</span>
          <span className={styles.panelValue}>{customer.last_address ?? '—'}</span>
        </div>

        {customer.address_history.length > 1 && (
          <div className={styles.panelSection}>
            <span className={styles.panelLabel}>Historial de direcciones</span>
            <ul className={styles.addressList}>
              {customer.address_history.map((addr, i) => (
                <li key={i} className={styles.addressItem}>{addr}</li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.panelSection}>
          <span className={styles.panelLabel}>Pedidos realizados</span>
          <span className={styles.panelValue}>{customer.total_orders}</span>
        </div>

        <div className={styles.panelSection}>
          <span className={styles.panelLabel}>Historial</span>
          <div className={styles.timestamps}>
            <div className={styles.timestampRow}>
              <span className={styles.timestampDot} />
              <span>Primer pedido: {formatDate(customer.first_seen_at)}</span>
            </div>
            <div className={styles.timestampRow}>
              <span className={`${styles.timestampDot} ${styles.timestampDotConfirmed}`} />
              <span>Último pedido: {formatDate(customer.last_seen_at)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CustomersPage() {
  const { data: customers, isLoading } = useCustomers()
  const deleteCustomer = useDeleteCustomer()
  const [search, setSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<CustomerType | null>(null)

  const allCustomers = customers ?? []

  const handleDeleteRequest = (customer: CustomerType) => setCustomerToDelete(customer)

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return
    try {
      await deleteCustomer.mutateAsync(customerToDelete.id)
      if (selectedCustomerId === customerToDelete.id) {
        setSelectedCustomerId(null)
        setIsPanelOpen(false)
      }
      setCustomerToDelete(null)
    } catch {
      console.error('Error al eliminar el cliente', customerToDelete.id)
      setCustomerToDelete(null)
    }
  }

  const handleDeleteCancel = () => setCustomerToDelete(null)

  const filtered = allCustomers.filter((c) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.phone.includes(q)
  })

  const selectedCustomer = selectedCustomerId
    ? (allCustomers.find((c) => c.id === selectedCustomerId) ?? null)
    : null

  return (
    <div className={styles.page}>
      <div className={styles.listColumn}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Clientes</h1>
          <button
            className={styles.exportButton}
            onClick={() => exportToExcel(allCustomers)}
            disabled={allCustomers.length === 0}
          >
            Exportar Excel
          </button>
        </div>

        <div className={styles.searchWrapper}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar por nombre o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <p className={styles.countText}>
          {allCustomers.length} cliente{allCustomers.length !== 1 ? 's' : ''} registrados
        </p>

        {isLoading ? (
          <p className={styles.loadingText}>Cargando clientes...</p>
        ) : filtered.length === 0 ? (
          <p className={styles.emptyText}>No se encontraron clientes.</p>
        ) : (
          <div className={styles.list}>
            {filtered.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                isSelected={selectedCustomer?.id === customer.id}
                onClick={() => {
                  setSelectedCustomerId(customer.id)
                  setIsPanelOpen(true)
                }}
              />
            ))}
          </div>
        )}
      </div>

      {isPanelOpen && (
        <div className={styles.panelOverlay} onClick={() => setIsPanelOpen(false)} />
      )}
      <CustomerDetailPanel
        customer={selectedCustomer}
        onClose={() => setIsPanelOpen(false)}
        isPanelOpen={isPanelOpen}
        onDelete={handleDeleteRequest}
      />

      {customerToDelete && (
        <ConfirmModal
          title="Eliminar cliente"
          message={`¿Eliminar a ${customerToDelete.name} (${customerToDelete.phone}) de la base de datos? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          isDanger={true}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </div>
  )
}

export default CustomersPage
