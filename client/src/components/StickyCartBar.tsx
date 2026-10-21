import { useNavigate } from 'react-router-dom'
import { formatPrice } from '@jaby/shared'
import { useCart } from '../context/CartContext'
import styles from './StickyCartBar.module.css'

function StickyCartBar() {
  const { totalItems, totalPrice } = useCart()
  const navigate = useNavigate()

  if (totalItems === 0) return null

  return (
    <button type="button" className={styles.bar} onClick={() => navigate('/checkout')}>
      <svg
        className={styles.icon}
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      <span>
        {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
      </span>
      <span className={styles.separator}>·</span>
      <span>{formatPrice(totalPrice)}</span>
      <span className={styles.action}>Ver pedido</span>
      <span className={styles.arrow} aria-hidden="true">
        ›
      </span>
    </button>
  )
}

export default StickyCartBar
