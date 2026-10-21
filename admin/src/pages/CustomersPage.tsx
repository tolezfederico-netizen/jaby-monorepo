import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as XLSX from 'xlsx-js-style'
import { useCustomers, useDeleteCustomer } from '../hooks/useCustomers'
import type { CustomerType } from '../hooks/useCustomers'
import ConfirmModal from '../components/ConfirmModal'
import {
  AlertIcon,
  CloseIcon,
  PinIcon,
  ScooterIcon,
  StoreIcon,
  TrashIcon,
  WhatsAppIcon,
} from '../components/icons'
import { toWhatsAppNumber } from '@jaby/shared'
import styles from './CustomersPage.module.css'

type SortKey = 'recent' | 'orders' | 'name'
type PromoFilter = 'all' | 'accepted'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function modalityLabel(modality: string | null): string | null {
  if (modality === 'delivery') return 'Delivery'
  if (modality === 'pickup') return 'Retiro'
  return null
}

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

function exportToExcel(customers: CustomerType[], fileName: string) {
  const headers = [
    'Nombre',
    'Teléfono',
    'Pedidos realizados',
    'Última modalidad',
    'Última dirección',
    'Historial de direcciones',
    'Primer pedido',
    'Último pedido',
    'Acepta promociones',
  ]

  const colWidths = [25, 18, 22, 20, 30, 45, 25, 25, 20]

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
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '',
    c.last_seen_at
      ? new Date(c.last_seen_at).toLocaleString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '',
    c.marketing_consent ? 'Sí' : 'No',
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
      ws[cellRef].s = R === 0 ? headerStyle : R % 2 === 0 ? rowStyleEven : rowStyleOdd
    }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes')

  XLSX.writeFile(wb, fileName, { cellStyles: true })
}

function ModalityIcon({ modality }: { modality: string | null }) {
  if (modality === 'delivery') return <ScooterIcon size={14} />
  if (modality === 'pickup') return <StoreIcon size={14} />
  return null
}

interface CustomerCardProps {
  customer: CustomerType
  onClick: () => void
}

function CustomerCard({ customer, onClick }: CustomerCardProps) {
  const modality = modalityLabel(customer.last_modality)
  return (
    <div className={styles.card} onClick={onClick}>
      <span className={styles.avatar}>{initials(customer.name)}</span>
      <div className={styles.cardInfo}>
        <span className={styles.customerName} title={customer.name}>
          {customer.name}
        </span>
        <span className={styles.phone}>{customer.phone}</span>
        <span className={styles.cardMeta}>
          {modality && (
            <span className={styles.modality}>
              <ModalityIcon modality={customer.last_modality} />
              {modality}
            </span>
          )}
          <span>{timeAgo(customer.last_seen_at)}</span>
        </span>
      </div>
      <span className={styles.totalOrders}>
        {customer.total_orders} pedido{customer.total_orders !== 1 ? 's' : ''}
      </span>
    </div>
  )
}

interface CustomerDialogProps {
  customer: CustomerType
  onClose: () => void
  onDelete: (customer: CustomerType) => void
}

function CustomerDialog({ customer, onClose, onDelete }: CustomerDialogProps) {
  const modality = modalityLabel(customer.last_modality)
  return createPortal(
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.dialog} role="dialog" aria-modal="true">
        <div className={styles.dialogHeader}>
          <span className={styles.avatarLarge}>{initials(customer.name)}</span>
          <div className={styles.dialogTitleBlock}>
            <h2 className={styles.dialogTitle}>{customer.name}</h2>
            <span className={styles.dialogSubtitle}>
              {customer.total_orders} pedido{customer.total_orders !== 1 ? 's' : ''} realizados
            </span>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className={styles.dialogBody}>
          <div className={styles.section}>
            <span className={styles.label}>Teléfono</span>
            <div className={styles.valueRow}>
              <span className={styles.value}>{customer.phone}</span>
              <a
                className={styles.waLink}
                href={`https://wa.me/${toWhatsAppNumber(customer.phone)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon size={15} /> WhatsApp
              </a>
            </div>
          </div>

          <div className={styles.section}>
            <span className={styles.label}>Última modalidad</span>
            <span className={styles.value}>
              {modality ? (
                <span className={styles.modality}>
                  <ModalityIcon modality={customer.last_modality} />
                  {customer.last_modality === 'pickup' ? 'Retiro en local' : modality}
                </span>
              ) : (
                '—'
              )}
            </span>
          </div>

          <div className={styles.section}>
            <span className={styles.label}>Última dirección</span>
            <div className={styles.valueRow}>
              <span className={styles.value}>{customer.last_address ?? '—'}</span>
              {customer.last_address && (
                <a
                  className={styles.mapsLink}
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.last_address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <PinIcon size={15} /> Ver en Maps
                </a>
              )}
            </div>
          </div>

          {customer.address_history.length > 1 && (
            <div className={styles.section}>
              <span className={styles.label}>Historial de direcciones</span>
              <ul className={styles.addressList}>
                {customer.address_history.map((addr, i) => (
                  <li key={i} className={styles.addressItem}>
                    {addr}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.section}>
            <span className={styles.label}>Promociones por WhatsApp</span>
            <span className={styles.value}>
              {customer.marketing_consent
                ? 'Aceptó recibir novedades y promociones (confirmalo por WhatsApp antes del primer envío)'
                : 'No aceptó (solo contactar por sus pedidos)'}
            </span>
          </div>

          <div className={styles.section}>
            <span className={styles.label}>Historial</span>
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

        <div className={styles.dialogFooter}>
          <button className={styles.deleteButton} onClick={() => onDelete(customer)}>
            <TrashIcon size={16} />
            Eliminar cliente
          </button>
          <span className={styles.footerSpacer} />
          <button className={styles.closeAction} onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}

function CustomersPage() {
  const { data: customers, isLoading } = useCustomers()
  const deleteCustomer = useDeleteCustomer()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')
  const [promoFilter, setPromoFilter] = useState<PromoFilter>('all')
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [customerToDelete, setCustomerToDelete] = useState<CustomerType | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const allCustomers = customers ?? []

  const showToast = (message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3500)
  }
  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  useEffect(() => {
    if (!exportOpen) return
    const onDown = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExportOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [exportOpen])

  const acceptedCustomers = allCustomers.filter((c) => c.marketing_consent)

  useEffect(() => {
    if (!selectedCustomerId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !customerToDelete) setSelectedCustomerId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedCustomerId, customerToDelete])

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return
    try {
      await deleteCustomer.mutateAsync(customerToDelete.id)
      if (selectedCustomerId === customerToDelete.id) setSelectedCustomerId(null)
    } catch {
      showToast('No se pudo eliminar el cliente. Intentá de nuevo.')
    }
    setCustomerToDelete(null)
  }

  const filtered = allCustomers
    .filter((c) => promoFilter === 'all' || c.marketing_consent)
    .filter((c) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return c.name.toLowerCase().includes(q) || c.phone.includes(q)
    })
    .sort((a, b) => {
      if (sort === 'orders') return b.total_orders - a.total_orders
      if (sort === 'name') return a.name.localeCompare(b.name, 'es')
      return new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime()
    })

  const selectedCustomer = selectedCustomerId
    ? (allCustomers.find((c) => c.id === selectedCustomerId) ?? null)
    : null

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'recent', label: 'Recientes' },
    { key: 'orders', label: 'Más pedidos' },
    { key: 'name', label: 'Nombre A–Z' },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Buscar por nombre o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className={styles.chipGroup}>
          <span className={styles.filterLabel}>Ordenar</span>
          {sortOptions.map((o) => (
            <button
              key={o.key}
              type="button"
              className={`${styles.chip} ${sort === o.key ? styles.chipActive : ''}`}
              onClick={() => setSort(o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className={styles.chipGroup}>
          <span className={styles.filterLabel}>Promociones</span>
          <button
            type="button"
            className={`${styles.chip} ${promoFilter === 'all' ? styles.chipActive : ''}`}
            onClick={() => setPromoFilter('all')}
          >
            Todos
          </button>
          <button
            type="button"
            className={`${styles.chip} ${promoFilter === 'accepted' ? styles.chipActive : ''}`}
            onClick={() => setPromoFilter('accepted')}
          >
            Aceptaron ({acceptedCustomers.length})
          </button>
        </div>
        <div className={styles.exportWrap} ref={exportRef}>
          <button
            className={styles.exportButton}
            onClick={() => setExportOpen((o) => !o)}
            disabled={allCustomers.length === 0}
            aria-haspopup="menu"
            aria-expanded={exportOpen}
          >
            Exportar Excel
          </button>
          {exportOpen && (
            <div className={styles.exportMenu} role="menu">
              <button
                type="button"
                role="menuitem"
                className={styles.exportOption}
                onClick={() => {
                  exportToExcel(allCustomers, 'clientes-antojos-ya.xlsx')
                  setExportOpen(false)
                }}
              >
                <span className={styles.exportOptionTitle}>Lista completa</span>
                <span className={styles.exportOptionSub}>{allCustomers.length} clientes</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className={styles.exportOption}
                disabled={acceptedCustomers.length === 0}
                onClick={() => {
                  exportToExcel(acceptedCustomers, 'clientes-aceptan-promociones.xlsx')
                  setExportOpen(false)
                }}
              >
                <span className={styles.exportOptionTitle}>Solo los que aceptaron promociones</span>
                <span className={styles.exportOptionSub}>{acceptedCustomers.length} clientes</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <p className={styles.countText}>
        {filtered.length === allCustomers.length
          ? `${allCustomers.length} cliente${allCustomers.length !== 1 ? 's' : ''} registrados`
          : `${filtered.length} de ${allCustomers.length} clientes`}
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
              onClick={() => setSelectedCustomerId(customer.id)}
            />
          ))}
        </div>
      )}

      {selectedCustomer && (
        <CustomerDialog
          customer={selectedCustomer}
          onClose={() => setSelectedCustomerId(null)}
          onDelete={setCustomerToDelete}
        />
      )}

      {toast && (
        <div className={styles.toast} role="status">
          <AlertIcon size={16} />
          {toast}
        </div>
      )}

      {customerToDelete && (
        <ConfirmModal
          title="Eliminar cliente"
          message={`¿Eliminar a ${customerToDelete.name} (${customerToDelete.phone}) de la base de datos? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          isDanger={true}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setCustomerToDelete(null)}
        />
      )}
    </div>
  )
}

export default CustomersPage
