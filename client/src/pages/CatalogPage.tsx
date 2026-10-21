import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStatus } from '../hooks/useAppStatus'
import { useStoreConfig } from '../hooks/useStoreConfig'
import { useProducts, useFeaturedProducts, useProductsRealtime } from '../hooks/useProducts'
import { useCategories } from '../hooks/useCategories'
import { useBanner } from '../hooks/useBanner'
import { useCart } from '../context/CartContext'
import Footer from '../components/Footer'
import MediaContentCarousel from '../components/MediaContentCarousel'
import CoverageZonesModal from '../components/CoverageZonesModal'
import StickyCartBar from '../components/StickyCartBar'
import Header from '../components/Header'
import WhatsAppFloatButton from '../components/WhatsAppFloatButton'
import ProductCardSkeleton from '../components/ProductCardSkeleton'
import LastOrderSummary from '../components/LastOrderSummary'
import WhatsAppIcon from '../components/WhatsAppIcon'
import { readFavoriteIds, toggleFavoriteId, writeFavoriteIds } from '../lib/favoritesStorage'
import type { ProductType } from '@jaby/shared'
import { formatPrice, toWhatsAppNumber } from '@jaby/shared'
import styles from './CatalogPage.module.css'

// ─── Banner ───────────────────────────────────────────────────────────────────

function BannerStrip() {
  const { data: banner } = useBanner()
  if (!banner?.is_active || !banner.text) return null
  return (
    <div className={styles.banner} role="banner">
      {banner.text}
    </div>
  )
}

// ─── Closed Notice ────────────────────────────────────────────────────────────

function ClosedNotice({ reopenTime }: { reopenTime: string | null }) {
  return (
    <div className={styles.closedNotice} role="status">
      <p className={styles.closedTitle}>Actualmente estamos cerrados</p>
      {reopenTime && (
        <p className={styles.closedSub}>
          Volvemos a recibir pedidos a partir de las {reopenTime} hs.
        </p>
      )}
    </div>
  )
}

// ─── Product Card ─────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: ProductType
  showPrice: boolean
  canOrder: boolean
  featured?: boolean
  cardId?: string
  onAdded?: (productName: string) => void
  isFavorite: boolean
  onToggleFavorite: (productId: string) => void
  onShare: (product: ProductType) => void
}

function ProductCard({
  product,
  showPrice,
  canOrder,
  featured,
  cardId,
  onAdded,
  isFavorite,
  onToggleFavorite,
  onShare,
}: ProductCardProps) {
  const { addItem, items, updateQuantity } = useCart()
  const isAvailable = product.is_active
  const isOutOfStock = product.is_out_of_stock
  const quantity = items.find((item) => item.product.id === product.id)?.quantity ?? 0
  const canShowActions = quantity > 0 || isOutOfStock || (isAvailable && canOrder)
  const canIncreaseQuantity = canOrder && isAvailable && !isOutOfStock

  return (
    <div id={cardId} className={`${styles.productCard} ${!isAvailable ? styles.productCardUnavailable : ''} ${isOutOfStock ? styles.productCardOutOfStock : ''} ${featured ? styles.featuredCard : ''}`}>
      <button
        type="button"
        className={`${styles.favoriteButton} ${isFavorite ? styles.favoriteButtonActive : ''}`}
        onClick={(event) => {
          event.stopPropagation()
          onToggleFavorite(product.id)
        }}
        aria-label={isFavorite ? `Quitar ${product.name} de favoritos` : `Agregar ${product.name} a favoritos`}
        aria-pressed={isFavorite}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
        </svg>
      </button>
      {isOutOfStock && (
        <span className={styles.stockBadge}>Agotado</span>
      )}
      {product.image_url && (
        <div className={styles.productImageWrapper}>
          <img
            src={product.image_url}
            alt={product.name}
            className={styles.productImage}
            loading="lazy"
          />
        </div>
      )}
      <div className={styles.productInfo}>
        <span className={styles.productName}>{product.name}</span>
        {product.description && (
          <span className={styles.productDesc}>{product.description}</span>
        )}
        <div className={styles.productFooter}>
          {showPrice && product.price != null && (
            <span className={styles.productPrice}>
              {formatPrice(product.price)}
            </span>
          )}
          {!isAvailable && !isOutOfStock ? (
            <span className={styles.unavailableTag}>No disponible</span>
          ) : canShowActions ? (
            <div className={styles.productActions}>
              <button
                type="button"
                className={styles.shareProductButton}
                onClick={(event) => {
                  event.stopPropagation()
                  onShare(product)
                }}
                aria-label={`Compartir ${product.name}`}
              >
                <WhatsAppIcon size={16} />
              </button>
              {quantity > 0 ? (
                <div className={styles.quantityStepper} aria-label={`Cantidad de ${product.name}: ${quantity}`}>
                  <button
                    type="button"
                    className={styles.quantityButton}
                    onClick={() => updateQuantity(product.id, quantity - 1)}
                    aria-label={`Quitar una unidad de ${product.name}`}
                  >
                    −
                  </button>
                  <span className={styles.quantityValue} aria-live="polite">{quantity}</span>
                  <button
                    type="button"
                    className={`${styles.quantityButton} ${!canIncreaseQuantity ? styles.quantityButtonDisabled : ''}`}
                    onClick={() => {
                      if (canIncreaseQuantity) updateQuantity(product.id, quantity + 1)
                    }}
                    disabled={!canIncreaseQuantity}
                    aria-label={isOutOfStock ? `${product.name} agotado` : `Agregar una unidad de ${product.name}`}
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={`${styles.addButton} ${!canIncreaseQuantity ? styles.addButtonDisabled : ''}`}
                  disabled={!canIncreaseQuantity}
                  onClick={() => {
                    if (!canIncreaseQuantity) return
                    addItem(product)
                    onAdded?.(product.name)
                  }}
                  aria-label={isOutOfStock ? `${product.name} agotado` : `Agregar ${product.name}`}
                >
                  <span className={styles.addButtonLabelMobile}>Agregar</span>
                  <svg className={styles.addButtonLabelDesktop} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ─── Cart Desktop Button ──────────────────────────────────────────────────────

function CartDesktopButton({ isBumped }: { isBumped: boolean }) {
  const { totalItems, totalPrice } = useCart()
  const navigate = useNavigate()

  return (
    <button
      className={`${styles.cartDesktopBtn} ${totalItems > 0 ? styles.cartDesktopBtnActive : ''} ${isBumped ? styles.cartDesktopBump : ''}`}
      onClick={() => totalItems > 0 && navigate('/checkout')}
      disabled={totalItems === 0}
      aria-label="Ver carrito"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1"/>
        <circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
      </svg>
      {totalItems > 0 && (
        <span className={styles.cartDesktopBadge}>{totalItems}</span>
      )}
      {totalItems > 0 && (
        <span className={styles.cartDesktopPrice}>
          {formatPrice(totalPrice)}
        </span>
      )}
    </button>
  )
}

// ─── Store Info Banner ─────────────────────────────────────────────────────────

function InfoIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

const PinIcon = () => (
  <InfoIcon>
    <path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </InfoIcon>
)

const ScooterIcon = () => (
  <InfoIcon>
    <circle cx="5.5" cy="18" r="2.8" />
    <circle cx="18.5" cy="18" r="2.8" />
    <rect x="2.5" y="6" width="9" height="6.5" rx="1" />
    <path d="M8.3 18h4.7l2.2-9.5" />
    <path d="M13.6 8.5h4.4" />
  </InfoIcon>
)

const StoreIcon = () => (
  <InfoIcon>
    <path d="M4 9l1.5-5h13L20 9" />
    <path d="M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" />
    <path d="M5 11.5V20h14v-8.5" />
    <path d="M10 20v-5h4v5" />
  </InfoIcon>
)

function StoreInfoBanner() {
  const { data: config } = useStoreConfig()
  const { isDeliveryAvailable } = useAppStatus()
  const [showCoverageZones, setShowCoverageZones] = useState(false)
  // En mobile el bloque arranca plegado; en desktop siempre se ve abierto
  const [expanded, setExpanded] = useState(false)

  const address = config?.address ?? ''
  const neighborhood = config?.neighborhood ?? ''
  const municipality = config?.municipality ?? ''
  const whatsappDigits = toWhatsAppNumber(config?.whatsapp_number)
  const whatsappUrl = whatsappDigits ? `https://wa.me/${whatsappDigits}` : null

  const mapsQuery = [address, neighborhood, municipality].filter(Boolean).join(', ')
  const mapsUrl = mapsQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
    : '#'
  const mapsEmbedSrc = mapsQuery
    ? `https://maps.google.com/maps?q=${encodeURIComponent(mapsQuery)}&output=embed&z=15`
    : ''

  return (
    <div className={`${styles.storeInfoBanner} ${expanded ? '' : styles.storeInfoCollapsed}`}>
      <button
        type="button"
        className={styles.storeInfoToggle}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className={styles.storeInfoIcon}><PinIcon /></span>
        <span className={styles.storeInfoToggleText}>
          <span className={styles.storeInfoLabel}>Horarios y ubicación</span>
          {config?.delivery_enabled && (
            <span className={styles.storeInfoSub}>
              Delivery{' '}
              <span className={isDeliveryAvailable ? styles.storeInfoStatusOpen : styles.storeInfoStatusClosed}>
                {isDeliveryAvailable ? 'abierto ahora' : 'cerrado ahora'}
              </span>
            </span>
          )}
        </span>
        <svg
          className={`${styles.storeInfoChevron} ${expanded ? styles.storeInfoChevronOpen : ''}`}
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div className={styles.storeInfoGrid}>

        <div className={styles.storeInfoItems}>
          <div className={styles.storeInfoItem}>
            <span className={styles.storeInfoIcon}><PinIcon /></span>
            <div className={styles.storeInfoText}>
              <span className={styles.storeInfoLabel}>{address}</span>
              {(neighborhood || municipality) && (
                <span className={styles.storeInfoSub}>
                  {[neighborhood, municipality].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
          </div>

          <div className={styles.storeInfoItem}>
            <span className={styles.storeInfoIcon}><ScooterIcon /></span>
            <div className={styles.storeInfoText}>
              <div className={styles.storeInfoTitleRow}>
                <span className={styles.storeInfoLabel}>Delivery</span>
                {config && config.delivery_coverage_zones.length > 0 && (
                  <button
                    type="button"
                    className={styles.coverageZonesButton}
                    onClick={() => setShowCoverageZones(true)}
                  >
                    Ver zonas de cobertura
                  </button>
                )}
              </div>
              {config?.delivery_enabled ? (
                <span className={styles.storeInfoSub}>
                  {formatHour(config.delivery_hours_open)} — {formatHour(config.delivery_hours_close)}hs ·{' '}
                  <span className={isDeliveryAvailable ? styles.storeInfoStatusOpen : styles.storeInfoStatusClosed}>
                    {isDeliveryAvailable ? 'Abierto ahora' : 'Cerrado ahora'}
                  </span>
                </span>
              ) : (
                <span className={styles.storeInfoSub}>No disponible</span>
              )}
            </div>
          </div>

          <div className={styles.storeInfoItem}>
            <span className={styles.storeInfoIcon}><StoreIcon /></span>
            <div className={styles.storeInfoText}>
              <span className={styles.storeInfoLabel}>Retiro en local</span>
              {config ? (
                <span className={styles.storeInfoSub}>
                  {formatHour(config.business_hours_open)} — {formatHour(config.business_hours_close)}hs · Sin costo adicional
                </span>
              ) : (
                <span className={styles.storeInfoSub}>Sin costo adicional</span>
              )}
            </div>
          </div>

          <div className={styles.storeInfoItem}>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.storeInfoWhatsapp}
              >
                Escribinos por WhatsApp
                <WhatsAppIcon size={18} />
              </a>
            ) : (
              <span className={styles.storeInfoLabel}>WhatsApp no configurado</span>
            )}
          </div>
        </div>

        {mapsEmbedSrc && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.storeInfoMapLink}
          >
            <iframe
              title="Ubicación del local"
              src={mapsEmbedSrc}
              className={styles.storeInfoMap}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className={styles.storeInfoMapOverlay}>
              <span>Abrir en Maps ↗</span>
            </div>
          </a>
        )}

      </div>
      {showCoverageZones && config && (
        <CoverageZonesModal
          zones={config.delivery_coverage_zones}
          deliveryCost={config.delivery_cost}
          minimumOrder={config.delivery_minimum_order}
          whatsappUrl={whatsappUrl}
          onClose={() => setShowCoverageZones(false)}
        />
      )}
    </div>
  )
}

// ─── Scroll To Top ────────────────────────────────────────────────────────────

function ScrollToTopBtn() {
  const [visible, setVisible] = useState(false)

  const handleScroll = useCallback(() => {
    setVisible(window.scrollY > 300)
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  if (!visible) return null

  return (
    <button
      className={styles.scrollToTop}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Volver al inicio"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatHour(time: string | null | undefined): string {
  if (!time) return ''
  return time.slice(0, 5)
}

function ProductSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className={styles.productsGrid} aria-label="Cargando productos" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  )
}

function CatalogLoadingState() {
  return (
    <div className={styles.loadingScreen}>
      <div className={styles.loadingContent}>
        <div className={styles.loadingHeader} />
        <ProductSkeletonGrid count={6} />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function CatalogPage() {
  useProductsRealtime()
  const { isAppActive, isStoreOpen, isDeliveryAvailable, reopenTime, showPrices, config, isLoading } = useAppStatus()
  const { data: categories, isLoading: categoriesLoading } = useCategories()
  const { data: featured, isLoading: featuredLoading } = useFeaturedProducts()
  const { addItem } = useCart()

  const FAVORITES_FILTER = 'favorites'
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readFavoriteIds())
  const [search, setSearch] = useState('')
  const [toastProduct, setToastProduct] = useState<string | null>(null)
  const [toastSecondary, setToastSecondary] = useState<string | null>(null)
  const [cartBumped, setCartBumped] = useState(false)
  const categoryScrollRef = useRef<HTMLDivElement>(null)
  const catalogSectionRef = useRef<HTMLElement>(null)
  const toastTimeoutRef = useRef<number | null>(null)
  const bumpTimeoutRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current)
    if (bumpTimeoutRef.current !== null) window.clearTimeout(bumpTimeoutRef.current)
  }, [])

  const showCartFeedback = (message: string, secondaryMessage?: string) => {
    setToastProduct(message)
    setToastSecondary(secondaryMessage ?? null)
    setCartBumped(true)

    if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current)
    if (bumpTimeoutRef.current !== null) window.clearTimeout(bumpTimeoutRef.current)

    toastTimeoutRef.current = window.setTimeout(() => setToastProduct(null), 1800)
    bumpTimeoutRef.current = window.setTimeout(() => setCartBumped(false), 350)
  }

  const handleProductAdded = (productName: string) => {
    showCartFeedback(`Agregado: ${productName}`)
  }

  const handleRepeatedOrder = (productCount: number) => {
    showCartFeedback(`${productCount} ${productCount === 1 ? 'producto agregado' : 'productos agregados'}`)
  }

  const handleToggleFavorite = (productId: string) => {
    setFavoriteIds((currentIds) => {
      const nextIds = toggleFavoriteId(currentIds, productId)
      writeFavoriteIds(nextIds)
      return nextIds
    })
  }

  const handleShareProduct = async (product: ProductType) => {
    const priceText = showPrices && product.price != null
      ? ` Precio: ${formatPrice(product.price)}.`
      : ''
    const text = `Mirá ${product.name}.${priceText}`
    const url = window.location.origin

    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text, url })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank')
  }

  // En desktop la barra de categorias queda arriba: al elegir una, llevar al inicio del catalogo
  const selectCategory = (value: string | null) => {
    setSelectedCategory(value)
    if (!window.matchMedia('(min-width: 768px)').matches) return

    window.setTimeout(() => {
      const section = catalogSectionRef.current
      if (!section) return
      const target = window.scrollY + section.getBoundingClientRect().top - 120
      if (Math.abs(target - window.scrollY) > 8) {
        window.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
      }
    }, 60)
  }

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({ left: direction === 'right' ? 150 : -150, behavior: 'smooth' })
    }
  }

  const { data: allProducts, isLoading: productsLoading } = useProducts()
  const products = allProducts?.filter((product) => (
    selectedCategory === FAVORITES_FILTER
      ? favoriteIds.includes(product.id)
      : selectedCategory === null || product.category_id === selectedCategory
  ))
  const availableFavoriteProducts = (allProducts ?? []).filter((product) => (
    favoriteIds.includes(product.id) && product.is_active && !product.is_out_of_stock
  ))

  const handleAddAllFavorites = () => {
    const availableProducts = (allProducts ?? []).filter((product) => (
      favoriteIds.includes(product.id) && product.is_active && !product.is_out_of_stock
    ))
    const skippedCount = favoriteIds.length - availableProducts.length

    if (availableProducts.length === 0) {
      showCartFeedback('No hay favoritos disponibles para agregar')
      return
    }

    availableProducts.forEach((product) => addItem(product))
    showCartFeedback(
      `${availableProducts.length} ${availableProducts.length === 1 ? 'producto agregado' : 'productos agregados'}`,
      skippedCount > 0
        ? `${skippedCount} favorito${skippedCount === 1 ? '' : 's'} no disponible${skippedCount === 1 ? '' : 's'}`
        : undefined,
    )
  }

  const canOrder = isAppActive && isStoreOpen

  if (isLoading) {
    return <CatalogLoadingState />
  }

  return (
    <>
      <Header
        storeName={config?.store_name ?? 'Antojos Ya'}
        whatsappNumber={config?.whatsapp_number}
        isDeliveryAvailable={isDeliveryAvailable}
        deliveryHoursOpen={config?.delivery_hours_open}
        deliveryHoursClose={config?.delivery_hours_close}
        products={allProducts ?? []}
        showPrices={showPrices}
        search={search}
        onSearchChange={setSearch}
        onProductSelect={() => setSelectedCategory(null)}
      />
      <div className={styles.page}>

        {/* Banner promocional (antes quedaba oculto detras del header fijo) */}
        <BannerStrip />

        {/* Aviso de cierre */}
        {(!isAppActive || !isStoreOpen) && (
          <ClosedNotice reopenTime={!isStoreOpen ? reopenTime : null} />
        )}

        {/* Productos destacados */}
        {(featuredLoading || (featured && featured.length > 0)) && (
          <section className={`${styles.section} ${styles.featuredSection}`}>
            <h2 className={styles.sectionTitle}>Destacados</h2>
            {featuredLoading ? (
              <div className={styles.featuredGrid} aria-label="Cargando productos destacados" aria-busy="true">
                {Array.from({ length: 3 }, (_, index) => <ProductCardSkeleton key={index} />)}
              </div>
            ) : (
              <div className={styles.featuredGrid}>
                {featured?.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    showPrice={showPrices}
                    canOrder={canOrder}
                    featured
                    onAdded={handleProductAdded}
                    isFavorite={favoriteIds.includes(p.id)}
                    onToggleFavorite={handleToggleFavorite}
                    onShare={handleShareProduct}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Bloque de información del local */}
        <StoreInfoBanner />

        {/* Filtros */}
        <div className={styles.filters}>
          <div className={styles.categoryFiltersWrapper}>
            <button
              className={styles.categoryScrollBtn}
              onClick={() => scrollCategories('left')}
              aria-label="Scroll izquierda"
            >
              ‹
            </button>
            <div className={styles.categoryFilters} ref={categoryScrollRef}>
              <button
                className={`${styles.categoryBtn} ${selectedCategory === null ? styles.categoryBtnActive : ''}`}
                onClick={() => selectCategory(null)}
              >
                Todos
              </button>
              <button
                className={`${styles.categoryBtn} ${selectedCategory === FAVORITES_FILTER ? styles.categoryBtnActive : ''}`}
                onClick={() => selectCategory(FAVORITES_FILTER)}
              >
                <span aria-hidden="true">♥</span> Favoritos
              </button>
              {categoriesLoading ? (
                Array.from({ length: 4 }, (_, index) => <span key={index} className={styles.categorySkeleton} />)
              ) : categories?.map((cat) => (
                <button
                  key={cat.id}
                  className={`${styles.categoryBtn} ${selectedCategory === cat.id ? styles.categoryBtnActive : ''}`}
                  onClick={() => selectCategory(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <button
              className={styles.categoryScrollBtn}
              onClick={() => scrollCategories('right')}
              aria-label="Scroll derecha"
            >
              ›
            </button>
          </div>
          <CartDesktopButton isBumped={cartBumped} />
          <LastOrderSummary onRepeatSuccess={handleRepeatedOrder} />
        </div>

        {/* Catálogo */}
        <section className={styles.section} ref={catalogSectionRef}>
          {selectedCategory === FAVORITES_FILTER ? (
            <div className={styles.sectionHeadingRow}>
              <h2 className={styles.sectionTitle}>Favoritos</h2>
              {availableFavoriteProducts.length > 0 && (
                <button
                  type="button"
                  className={styles.addAllFavoritesButton}
                  onClick={handleAddAllFavorites}
                >
                  Agregar todos al carrito
                </button>
              )}
            </div>
          ) : selectedCategory && categories ? (
            <h2 className={styles.sectionTitle}>
              {categories.find((c) => c.id === selectedCategory)?.name}
            </h2>
          ) : null}
          {productsLoading ? (
            <ProductSkeletonGrid />
          ) : !products?.length ? (
            <p className={styles.emptyText}>
              {selectedCategory === FAVORITES_FILTER
                ? 'Todavía no tenés favoritos. Tocá el corazón en un producto para guardarlo acá.'
                : 'No hay productos disponibles.'}
            </p>
          ) : (
            <div className={styles.productsGrid}>
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  showPrice={showPrices}
                  canOrder={canOrder}
                  cardId={`product-${p.id}`}
                  onAdded={handleProductAdded}
                  isFavorite={favoriteIds.includes(p.id)}
                  onToggleFavorite={handleToggleFavorite}
                  onShare={handleShareProduct}
                />
              ))}
            </div>
          )}
        </section>

        <StickyCartBar />
      </div>
      {toastProduct && (
        <div className={styles.cartToast} role="status">
          <span className={styles.cartToastIcon}>✓</span>
          <span className={styles.cartToastContent}>
            <span>{toastProduct}</span>
            {toastSecondary && <span className={styles.cartToastSecondary}>{toastSecondary}</span>}
          </span>
        </div>
      )}
        <MediaContentCarousel />
      <Footer />
      <WhatsAppFloatButton
        whatsappNumber={config?.whatsapp_number}
        storeName={config?.store_name}
      />
      <ScrollToTopBtn />
    </>
  )
}

export default CatalogPage
