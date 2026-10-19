import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { formatPrice } from '@jaby/shared'
import WhatsAppIcon from './WhatsAppIcon'
import styles from './CoverageZonesModal.module.css'

interface CoverageZonesModalProps {
  zones: string[]
  deliveryCost?: number | null
  minimumOrder?: number | null
  whatsappUrl?: string | null
  onClose: () => void
}

function CoverageZonesModal({
  zones,
  deliveryCost,
  minimumOrder,
  whatsappUrl,
  onClose,
}: CoverageZonesModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    const previousOverflow = document.body.style.overflow
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const hasCost = deliveryCost != null
  const hasMinimum = minimumOrder != null && minimumOrder > 0

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="coverage-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
          ×
        </button>

        <div className={styles.header}>
          <span className={styles.headerIcon} aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </span>
          <div>
            <h2 id="coverage-title" className={styles.title}>Zonas de cobertura</h2>
            <p className={styles.subtitle}>Llegamos con delivery a:</p>
          </div>
        </div>

        {zones.length > 0 ? (
          <div className={styles.zoneList}>
            {zones.map((zone) => (
              <span key={zone} className={styles.zoneTag}>{zone}</span>
            ))}
          </div>
        ) : (
          <p className={styles.emptyMessage}>Hacemos envíos a cualquier zona.</p>
        )}

        {(hasCost || hasMinimum) && (
          <div className={styles.facts}>
            {hasCost && (
              <div className={styles.fact}>
                <span className={styles.factLabel}>Costo de envío</span>
                <strong className={styles.factValue}>
                  {deliveryCost > 0 ? formatPrice(deliveryCost) : 'Sin costo'}
                </strong>
              </div>
            )}
            {hasMinimum && (
              <div className={styles.fact}>
                <span className={styles.factLabel}>Pedido mínimo</span>
                <strong className={styles.factValue}>{formatPrice(minimumOrder)}</strong>
              </div>
            )}
          </div>
        )}

        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.whatsappLink}
          >
            <WhatsAppIcon size={16} />
            ¿No ves tu zona? Consultanos por WhatsApp
          </a>
        )}
      </div>
    </div>,
    document.body
  )
}

export default CoverageZonesModal
