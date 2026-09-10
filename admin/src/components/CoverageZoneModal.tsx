import { useState } from 'react'
import styles from './CoverageZoneModal.module.css'

interface CoverageZoneModalProps {
  existingZones: string[]
  isSaving?: boolean
  onConfirm: (zone: string) => void
  onClose: () => void
}

function CoverageZoneModal({ existingZones, isSaving = false, onConfirm, onClose }: CoverageZoneModalProps) {
  const [zone, setZone] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const normalizedZone = zone.trim()

    if (!normalizedZone) {
      setError('Ingresá el nombre de la zona.')
      return
    }

    if (existingZones.some((item) => item.trim().toLowerCase() === normalizedZone.toLowerCase())) {
      setError('Esa zona ya está configurada.')
      return
    }

    onConfirm(normalizedZone)
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <h3 className={styles.title}>Agregar zona de cobertura</h3>
        <form onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="coverage-zone-name">Nombre de la zona</label>
          <input
            id="coverage-zone-name"
            value={zone}
            onChange={(event) => {
              setZone(event.target.value)
              setError(null)
            }}
            className={styles.input}
            placeholder="Ej: Banfield"
            autoFocus
            disabled={isSaving}
          />
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={onClose} disabled={isSaving}>Cancelar</button>
            <button type="submit" className={styles.confirmButton} disabled={isSaving}>Agregar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CoverageZoneModal
