import { toWhatsAppNumber } from '@jaby/shared'
import styles from './WhatsAppFloatButton.module.css'
import WhatsAppIcon from './WhatsAppIcon'

interface WhatsAppFloatButtonProps {
  whatsappNumber?: string | null
  storeName?: string | null
}

function WhatsAppFloatButton({ whatsappNumber, storeName }: WhatsAppFloatButtonProps) {
  const phone = toWhatsAppNumber(whatsappNumber)
  if (!phone) return null

  const message = `Hola! Quería consultar sobre productos de ${storeName || 'la tienda'}`
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.button}
      aria-label="Consultar por WhatsApp"
    >
      <WhatsAppIcon size={25} />
    </a>
  )
}

export default WhatsAppFloatButton
