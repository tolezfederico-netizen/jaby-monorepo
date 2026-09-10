import styles from './ProductCardSkeleton.module.css'

function ProductCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={styles.image} />
      <div className={styles.content}>
        <div className={`${styles.line} ${styles.title}`} />
        <div className={`${styles.line} ${styles.description}`} />
        <div className={styles.footer}>
          <div className={`${styles.line} ${styles.price}`} />
          <div className={styles.button} />
        </div>
      </div>
    </div>
  )
}

export default ProductCardSkeleton
