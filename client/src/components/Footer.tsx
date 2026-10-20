import { Link } from 'react-router-dom'
import styles from './Footer.module.css'

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerBottom}>
        <div className={styles.credits}>
          <p className={styles.creditText}>Creado por Garel</p>
          <Link to="/privacidad" className={styles.creditLink}>
            Política de privacidad
          </Link>
          <p className={styles.creditText}>{'\u00A9'} 2026 Antojos Ya</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
