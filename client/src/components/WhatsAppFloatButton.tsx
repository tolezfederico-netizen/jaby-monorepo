import styles from './WhatsAppFloatButton.module.css'
import WhatsAppIcon from './WhatsAppIcon'

interface WhatsAppFloatButtonProps {
  whatsappNumber?: string | null
  storeName?: string | null
}

function WhatsAppFloatButton({ whatsappNumber, storeName }: WhatsAppFloatButtonProps) {
  const digits = whatsappNumber?.replace(/\D/g, '') ?? ''
  if (!digits) return null

  const phone = digits.startsWith('54') ? digits : `54${digits}`
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
      {false && (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2a10 10 0 0 0-8.66 15l-1.1 4.1 4.2-1.08A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.08-1.12l-.29-.17-2.5.64.66-2.43-.19-.3A8 8 0 1 1 12 20Zm4.38-5.96c-.24-.12-1.4-.69-1.62-.77-.22-.08-.38-.12-.54.12-.16.24-.62.77-.76.93-.14.16-.28.18-.52.06-.24-.12-1-.37-1.9-1.18-.7-.62-1.17-1.39-1.31-1.62-.14-.24-.01-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.41-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.39 1.37.5.58.18 1.1.16 1.51.1.46-.07 1.4-.57 1.6-1.13.2-.55.2-1.03.14-1.13-.06-.1-.22-.16-.46-.28Z" />
        </svg>
      )}
    </a>
  )
}

export default WhatsAppFloatButton
