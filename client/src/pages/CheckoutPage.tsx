import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStatus } from '../hooks/useAppStatus'
import { useCart } from '../context/CartContext'
import { useCreateOrder } from '../hooks/useCreateOrder'
import Footer from '../components/Footer'
import { formatPrice, MAX_ORDER_ITEMS, toWhatsAppNumber } from '@jaby/shared'
import type { OrderModalityType } from '@jaby/shared'
import { saveLastOrder } from '../lib/orderStorage'
import styles from './CheckoutPage.module.css'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatHour(time: string | null | undefined): string {
  return time ? time.slice(0, 5) : ''
}

function StoreIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
      <path d="M5 12v8h14v-8" />
      <path d="M10 20v-4h4v4" />
    </svg>
  )
}

function ScooterIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="6" cy="17" r="2.5" />
      <circle cx="18" cy="17" r="2.5" />
      <path d="M8.5 17h5l2-8h-3" />
      <path d="M15.5 9L18 17" />
      <path d="M4 8h5v4H4z" />
    </svg>
  )
}

function padOrderNumber(n: number): string {
  return String(n).padStart(4, '0')
}

function buildWhatsAppMessage(
  orderNumber: number,
  modality: OrderModalityType,
  customerName: string,
  address: string,
  notes: string,
  items: Array<{ name: string; quantity: number; price: number | undefined; subtotal: number }>,
  total: number,
  deliveryCost: number,
  showPrices: boolean
): string {
  const lines: string[] = []

  lines.push(`🛒 Pedido #${padOrderNumber(orderNumber)}`)
  lines.push(`👤 Nombre: ${customerName}`)
  lines.push(`📦 Modalidad: ${modality === 'delivery' ? 'Delivery' : 'Retiro en local'}`)

  if (modality === 'delivery' && address) {
    lines.push(`📍 Dirección: ${address}`)
  }

  if (notes) {
    lines.push(`📝 Notas: ${notes}`)
  }

  lines.push('─────────────────')

  for (const item of items) {
    if (showPrices && item.subtotal > 0) {
      lines.push(`• ${item.quantity}x ${item.name} — ${formatPrice(item.subtotal)}`)
    } else {
      lines.push(`• ${item.quantity}x ${item.name}`)
    }
  }

  lines.push('─────────────────')

  if (showPrices) {
    lines.push(`💰 Total estimado: ${formatPrice(total)}`)
    if (modality === 'delivery' && deliveryCost > 0) {
      lines.push(`🚗 Costo de envío: ${formatPrice(deliveryCost)}`)
    }
  }

  return lines.join('\n')
}

// ─── Header ───────────────────────────────────────────────────────────────────

function CheckoutHeader({ title }: { title: string }) {
  const navigate = useNavigate()
  return (
    <div className={styles.pageHeader}>
      <button className={styles.backLink} onClick={() => navigate('/')}>
        <span aria-hidden="true">←</span> Volver
      </button>
      <h1 className={styles.title}>{title}</h1>
      <img src="/logo.png" alt="Logo" className={styles.headerLogo} />
    </div>
  )
}

// ─── Cart Summary ─────────────────────────────────────────────────────────────

function CartSummary() {
  const { items, totalPrice, removeItem, updateQuantity } = useCart()
  const { showPrices } = useAppStatus()

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Tu pedido</h2>
      <ul className={styles.cartList}>
        {items.map(({ product, quantity }) => (
          <li key={product.id} className={styles.cartItem}>
            <img
              src={product.image_url ?? ''}
              alt={product.name}
              className={styles.cartItemImage}
              loading="lazy"
            />
            <div className={styles.cartItemInfo}>
              <span className={styles.cartItemName}>{product.name}</span>
              {product.description?.trim() && (
                <span className={styles.cartItemDescription}>{product.description}</span>
              )}
              {showPrices && product.price != null && (
                <span className={styles.cartItemPrice}>
                  {formatPrice(product.price * quantity)}
                </span>
              )}
            </div>
            <div className={styles.cartItemControls}>
              <button
                className={styles.qtyBtn}
                onClick={() => updateQuantity(product.id, quantity - 1)}
              >
                −
              </button>
              <span className={styles.qtyValue}>{quantity}</span>
              <button
                className={styles.qtyBtn}
                onClick={() => updateQuantity(product.id, quantity + 1)}
              >
                +
              </button>
              <button className={styles.removeBtn} onClick={() => removeItem(product.id)}>
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
      {showPrices && (
        <div className={styles.cartTotal}>
          <span>Total</span>
          <span className={styles.cartTotalAmount}>{formatPrice(totalPrice)}</span>
        </div>
      )}
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function CheckoutPage() {
  const navigate = useNavigate()
  const { items, totalPrice, clearCart } = useCart()
  const { isAppActive, isStoreOpen, isDeliveryAvailable, config, showPrices } = useAppStatus()
  const createOrder = useCreateOrder()

  const [modality, setModality] = useState<OrderModalityType>('pickup')
  const [customerName, setCustomerName] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deliveryCost = config?.delivery_cost ?? 0
  const whatsappNumber = config?.whatsapp_number ?? ''
  const canOrder = isAppActive && isStoreOpen

  // Redirect si el carrito está vacío
  if (items.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          backgroundColor: '#0D0D1A',
        }}
      >
        <CheckoutHeader title="Tu pedido" />
        <div className={styles.emptyCart} style={{ flex: 1 }}>
          <svg
            className={styles.emptyCartIcon}
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="9" cy="20" r="1" />
            <circle cx="19" cy="20" r="1" />
            <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 8H6" />
            <path d="M12 10h4M14 8v4" />
          </svg>
          <p className={styles.emptyCartTitle}>Tu carrito está vacío</p>
          <p className={styles.emptyCartText}>Agregá productos desde el catálogo para continuar.</p>
          <button className={styles.backButton} onClick={() => navigate('/')}>
            Ver catálogo
          </button>
        </div>
        <Footer />
      </div>
    )
  }

  if (!canOrder) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          backgroundColor: '#0D0D1A',
        }}
      >
        <CheckoutHeader title="Tu pedido" />
        <div className={styles.emptyCart} style={{ flex: 1 }}>
          <p>El local no está recibiendo pedidos en este momento.</p>
          <button className={styles.backButton} onClick={() => navigate('/')}>
            Volver
          </button>
        </div>
        <Footer />
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!customerName.trim()) {
      setError('Ingresá tu nombre completo.')
      return
    }
    if (modality === 'delivery' && !address.trim()) {
      setError('Ingresá tu dirección para el delivery.')
      return
    }
    if (modality === 'delivery' && !/\d/.test(address)) {
      setError('Ingresá la dirección con la altura (ej: Av. Corrientes 1234).')
      return
    }
    const deliveryMinimum = config?.delivery_minimum_order ?? 0
    if (modality === 'delivery' && deliveryMinimum > 0 && totalPrice < deliveryMinimum) {
      setError(`El pedido mínimo para delivery es de ${formatPrice(deliveryMinimum)}.`)
      return
    }
    if (items.length > MAX_ORDER_ITEMS) {
      setError(`Podés pedir hasta ${MAX_ORDER_ITEMS} productos distintos por pedido.`)
      return
    }

    const cleanPhone = customerPhone.replace(/\D/g, '')

    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      setError('Ingresá un número de WhatsApp válido (sin espacios ni guiones).')
      return
    }

    const orderItems = items.map((i) => ({
      product_id: i.product.id,
      product_name: i.product.name,
      quantity: i.quantity,
      unit_price: i.product.price ?? 0,
      subtotal: (i.product.price ?? 0) * i.quantity,
    }))

    const total = totalPrice
    const finalDeliveryCost = modality === 'delivery' ? deliveryCost : 0

    try {
      const result = await createOrder.mutateAsync({
        modality,
        customer_name: customerName.trim(),
        customer_phone: cleanPhone,
        customer_address: modality === 'delivery' ? address.trim() : undefined,
        notes: notes.trim() || undefined,
        items: orderItems,
        total,
        delivery_cost: finalDeliveryCost > 0 ? finalDeliveryCost : undefined,
        marketing_consent: marketingConsent || undefined,
      })

      // Se usan los precios verificados por el servidor; si la función no los devuelve
      // (versión anterior desplegada), se cae a los del carrito
      const verifiedDeliveryCost = result.delivery_cost ?? finalDeliveryCost
      const verifiedItemsTotal = result.total != null ? result.total - verifiedDeliveryCost : total
      const messageItems = result.items
        ? result.items.map((i) => ({
            name: i.product_name,
            quantity: i.quantity,
            price: undefined,
            subtotal: i.subtotal,
          }))
        : items.map((i) => ({
            name: i.product.name,
            quantity: i.quantity,
            price: i.product.price ?? undefined,
            subtotal: (i.product.price ?? 0) * i.quantity,
          }))

      const message = buildWhatsAppMessage(
        result.order_number,
        modality,
        customerName.trim(),
        address.trim(),
        notes.trim(),
        messageItems,
        verifiedItemsTotal,
        verifiedDeliveryCost,
        showPrices
      )

      const waUrl = `https://wa.me/${toWhatsAppNumber(whatsappNumber)}?text=${encodeURIComponent(message)}`

      saveLastOrder({
        items: items.map((item) => ({
          product_id: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price ?? null,
        })),
        total: verifiedItemsTotal,
        modality,
        confirmedAt: new Date().toISOString(),
      })
      clearCart()
      navigate('/')
      window.location.href = waUrl
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
        return
      }
      setError('No se pudo registrar el pedido. Intentá de nuevo.')
    }
  }

  return (
    <>
      <div className={styles.page}>
        <CheckoutHeader title="Confirmar pedido" />

        <div className={styles.desktopLayout}>
          <div className={styles.desktopLeft}>
            <CartSummary />
          </div>
          <div className={styles.desktopRight}>
            <form onSubmit={handleSubmit} className={styles.form}>
              {/* Modalidad */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>¿Cómo querés recibirlo?</h2>
                <div className={styles.modalityOptions}>
                  <button
                    type="button"
                    className={`${styles.modalityBtn} ${modality === 'pickup' ? styles.modalityBtnActive : ''}`}
                    onClick={() => setModality('pickup')}
                  >
                    <span className={styles.modalityBtnTitle}>
                      <StoreIcon />
                      Retiro en local
                    </span>
                    <span className={styles.modalityBtnDesc}>Pasás a buscar tu pedido</span>
                  </button>

                  <button
                    type="button"
                    className={`${styles.modalityBtn} ${modality === 'delivery' ? styles.modalityBtnActive : ''} ${!isDeliveryAvailable ? styles.modalityBtnDisabled : ''}`}
                    onClick={() => isDeliveryAvailable && setModality('delivery')}
                    disabled={!isDeliveryAvailable}
                  >
                    <span className={styles.modalityBtnTitle}>
                      <ScooterIcon />
                      Delivery
                    </span>
                    <span className={styles.modalityBtnDesc}>
                      {!isDeliveryAvailable
                        ? config?.delivery_enabled
                          ? `Disponible desde las ${formatHour(config.delivery_hours_open)} hs`
                          : 'No disponible'
                        : deliveryCost > 0
                          ? `Costo de envío: ${formatPrice(deliveryCost)}`
                          : 'Sin costo de envío'}
                    </span>
                  </button>
                </div>
              </section>

              {/* Datos del cliente */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Tus datos</h2>

                <div className={styles.field}>
                  <label className={styles.label}>Nombre y apellido *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className={styles.input}
                    maxLength={100}
                    placeholder="Juan Pérez"
                    required
                    disabled={createOrder.isPending}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>WhatsApp *</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className={styles.input}
                    placeholder="11 2345-6789"
                    required
                    disabled={createOrder.isPending}
                  />
                  <span className={styles.fieldHint}>Te avisamos cuando tu pedido esté listo.</span>
                </div>

                {modality === 'delivery' && (
                  <div className={styles.field}>
                    <label className={styles.label}>Dirección *</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className={styles.input}
                      maxLength={200}
                      placeholder="Av. Corrientes 1234, 2° B"
                      required
                      disabled={createOrder.isPending}
                    />
                  </div>
                )}

                <div className={styles.field}>
                  <label className={styles.label}>Notas adicionales (opcional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={styles.textarea}
                    maxLength={300}
                    placeholder="Ej: tocar el timbre del fondo"
                    rows={2}
                    disabled={createOrder.isPending}
                  />
                </div>
              </section>

              {/* Total final */}
              {showPrices && modality === 'delivery' && deliveryCost > 0 && (
                <div className={styles.finalTotal}>
                  <div className={styles.finalTotalRow}>
                    <span>Subtotal</span>
                    <span>{formatPrice(totalPrice)}</span>
                  </div>
                  <div className={styles.finalTotalRow}>
                    <span>Envío</span>
                    <span>{formatPrice(deliveryCost)}</span>
                  </div>
                  <div className={`${styles.finalTotalRow} ${styles.finalTotalRowBold}`}>
                    <span>Total</span>
                    <span>{formatPrice(totalPrice + deliveryCost)}</span>
                  </div>
                </div>
              )}

              <div className={styles.consentBlock}>
                <label className={styles.consentLabel}>
                  <input
                    type="checkbox"
                    checked={marketingConsent}
                    onChange={(e) => setMarketingConsent(e.target.checked)}
                    disabled={createOrder.isPending}
                  />
                  <span>Quiero recibir novedades y promociones por WhatsApp (opcional)</span>
                </label>
                <p className={styles.consentText}>
                  Usamos tus datos (nombre, teléfono y dirección) para gestionar tu pedido y
                  contactarte por él. Más información en nuestra{' '}
                  <Link to="/privacidad" className={styles.consentLink}>
                    Política de privacidad
                  </Link>
                  .
                </p>
              </div>

              {error && (
                <p className={styles.errorText} role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className={styles.submitButton}
                disabled={createOrder.isPending}
              >
                {createOrder.isPending ? (
                  'Registrando pedido...'
                ) : (
                  <>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      style={{ flexShrink: 0 }}
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Confirmar y enviar por WhatsApp
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}

export default CheckoutPage
