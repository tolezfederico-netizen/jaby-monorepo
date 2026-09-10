import { useEffect } from 'react'
import styles from './CoverageZonesModal.module.css'

interface CoverageZonesModalProps {
  zones: string[]
  onClose: () => void
}

function CoverageZonesModal({ zones, onClose }: CoverageZonesModalProps) {
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

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
        <h2 className={styles.title}>Zonas de cobertura</h2>
        {zones.length > 0 ? (
          <div className={styles.zoneList}>
            {zones.map((zone) => (
              <span key={zone} className={styles.zoneTag}>{zone}</span>
            ))}
          </div>
        ) : (
          <p className={styles.emptyMessage}>Hacemos envíos a cualquier zona.</p>
        )}
      </div>
    </div>
  )
}

export default CoverageZonesModal
