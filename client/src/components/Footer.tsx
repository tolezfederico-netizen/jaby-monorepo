import styles from './Footer.module.css'

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerBottom}>
        <div className={styles.credits}>
          <p className={styles.creditText}>Creado por Garel</p>
          <p className={styles.creditText}>{'\u00A9'} 2026 Antojos Expres</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
