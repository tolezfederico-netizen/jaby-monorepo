import { AlertIcon, CheckCircleIcon } from './icons'
import styles from './ConfirmModal.module.css'

interface ConfirmModalProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  isDanger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isDanger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={`${styles.icon} ${isDanger ? styles.iconDanger : ''}`}>
            {isDanger ? <AlertIcon size={20} /> : <CheckCircleIcon size={20} />}
          </span>
          <h3 className={styles.title}>{title}</h3>
        </div>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={`${styles.confirmButton} ${isDanger ? styles.confirmButtonDanger : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
