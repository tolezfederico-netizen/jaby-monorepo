import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatPrice, type ProductType } from '@jaby/shared'
import { useProducts } from '../hooks/useProducts'
import { useCart } from '../context/CartContext'
import { readLastOrder, type LastOrderSnapshot } from '../lib/orderStorage'
import styles from './LastOrderSummary.module.css'

interface LastOrderSummaryProps {
  onRepeatSuccess?: (productCount: number) => void
}

function LastOrderSummary({ onRepeatSuccess }: LastOrderSummaryProps) {
  const [lastOrder, setLastOrder] = useState<LastOrderSnapshot | null>(() => readLastOrder())
  const [isOpen, setIsOpen] = useState(false)
  const [repeatError, setRepeatError] = useState<string | null>(null)
  const { data: products } = useProducts()
  const { addItem } = useCart()

  useEffect(() => {
    const handleStorage = () => setLastOrder(readLastOrder())
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  if (!lastOrder) return null

  const findCurrentProduct = (item: LastOrderSnapshot['items'][number]): ProductType | undefined => {
    if (item.product_id) {
      return products?.find((product) => product.id === item.product_id)
    }

    const normalizedName = item.name.trim().toLocaleLowerCase()
    return products?.find((product) => product.name.trim().toLocaleLowerCase() === normalizedName)
  }

  const repeatOrder = () => {
    if (!products) {
      setRepeatError('Todavía estamos cargando el catálogo. Intentá de nuevo en unos segundos.')
      return
    }

    const unavailable: string[] = []
    const availableItems: Array<{ product: ProductType; quantity: number }> = []

    for (const item of lastOrder.items) {
      const product = findCurrentProduct(item)

      if (!product) {
        unavailable.push(`${item.name} ya no está disponible`)
      } else if (!product.is_active) {
        unavailable.push(`${item.name} ya no está disponible`)
      } else if (product.is_out_of_stock) {
        unavailable.push(`${item.name} está agotado`)
      } else {
        availableItems.push({ product, quantity: item.quantity })
      }
    }

    if (unavailable.length > 0) {
      setRepeatError(`No se pudo repetir el pedido:\n${unavailable.map((item) => `• ${item}`).join('\n')}`)
      return
    }

    availableItems.forEach(({ product, quantity }) => {
      for (let index = 0; index < quantity; index += 1) {
        addItem(product)
      }
    })

    const productCount = availableItems.reduce((total, item) => total + item.quantity, 0)
    setIsOpen(false)
    setRepeatError(null)
    onRepeatSuccess?.(productCount)
  }

  const confirmedDate = new Date(lastOrder.confirmedAt)
  const confirmedAt = `${confirmedDate.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })} · ${confirmedDate.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })}`
  const modality = lastOrder.modality === 'delivery' ? 'Delivery' : 'Retiro en local'

  return (
    <>
      <button type="button" className={styles.trigger} onClick={() => { setRepeatError(null); setIsOpen(true) }}>
        <span className={styles.triggerIcon} aria-hidden="true">↺</span>
        <span>Ver mi último pedido</span>
      </button>

      {isOpen && createPortal(
        <div className={styles.overlay} role="presentation" onClick={() => setIsOpen(false)}>
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="last-order-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div className={styles.headerMain}>
                <span className={styles.headerIcon} aria-hidden="true">↺</span>
                <div>
                  <h2 id="last-order-title">Tu último pedido</h2>
                  <p className={styles.subtitle}>{modality} · {confirmedAt}</p>
                </div>
              </div>
              <button type="button" className={styles.closeButton} onClick={() => setIsOpen(false)} aria-label="Cerrar">
                ×
              </button>
            </div>

            <ul className={styles.items}>
              {lastOrder.items.map((item, index) => (
                <li key={`${item.name}-${index}`} className={styles.item}>
                  <span className={styles.qty}>{item.quantity}×</span>
                  <span className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.name}</span>
                    {findCurrentProduct(item)?.description?.trim() && (
                      <span className={styles.itemDescription}>
                        {findCurrentProduct(item)?.description}
                      </span>
                    )}
                  </span>
                  {item.price != null && (
                    <span className={styles.itemPrice}>{formatPrice(item.price * item.quantity)}</span>
                  )}
                </li>
              ))}
            </ul>

            <div className={styles.total}>
              <span>Total</span>
              <strong>{formatPrice(lastOrder.total)}</strong>
            </div>
            <p className={styles.note}>Al repetirlo se usan los precios actuales del catálogo.</p>

            {repeatError && (
              <p className={styles.repeatError} role="alert">{repeatError}</p>
            )}

            <button type="button" className={styles.repeatButton} onClick={repeatOrder}>
              Repetir pedido
            </button>
          </section>
        </div>,
        document.body
      )}
    </>
  )
}

export default LastOrderSummary
