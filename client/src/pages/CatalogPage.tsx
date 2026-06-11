import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStatus } from '../hooks/useAppStatus'
import { useProducts, useFeaturedProducts } from '../hooks/useProducts'
import { useCategories } from '../hooks/useCategories'
import { useBanner } from '../hooks/useBanner'
import { useCart } from '../context/CartContext'
import Footer from '../components/Footer'
import type { ProductType } from '@jaby/shared'
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
}

function ProductCard({ product, showPrice, canOrder, featured }: ProductCardProps) {
  const { addItem } = useCart()
  const isAvailable = product.is_active

  return (
    <div className={`${styles.productCard} ${!isAvailable ? styles.productCardUnavailable : ''} ${featured ? styles.featuredCard : ''}`}>
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
              {new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: 'ARS',
                maximumFractionDigits: 0,
              }).format(product.price)}
            </span>
          )}
          {!isAvailable ? (
            <span className={styles.unavailableTag}>No disponible</span>
          ) : canOrder ? (
            <button
              className={styles.addButton}
              onClick={() => addItem(product)}
            >
              <span className={styles.addButtonLabelMobile}>Agregar</span>
              <span className={styles.addButtonLabelDesktop}>+</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ─── Cart FAB ─────────────────────────────────────────────────────────────────

function CartFab() {
  const { totalItems, totalPrice } = useCart()
  const navigate = useNavigate()

  if (totalItems === 0) return null

  return (
    <button className={styles.cartFab} onClick={() => navigate('/checkout')}>
      <span className={styles.cartFabBadge}>{totalItems}</span>
      <span className={styles.cartFabLabel}>Ver pedido</span>
      <span className={styles.cartFabPrice}>
        {new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
          maximumFractionDigits: 0,
        }).format(totalPrice)}
      </span>
    </button>
  )
}

// ─── Cart Desktop Button ──────────────────────────────────────────────────────

function CartDesktopButton() {
  const { totalItems, totalPrice } = useCart()
  const navigate = useNavigate()

  return (
    <button
      className={`${styles.cartDesktopBtn} ${totalItems > 0 ? styles.cartDesktopBtnActive : ''}`}
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
          {new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            maximumFractionDigits: 0,
          }).format(totalPrice)}
        </span>
      )}
    </button>
  )
}

// ─── Store Info Banner ─────────────────────────────────────────────────────────

function StoreInfoBanner() {
  const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=Belelli+1651'

  return (
    <div className={styles.storeInfoBanner}>
      <div className={styles.storeInfoGrid}>

        <div className={styles.storeInfoItems}>
          <div className={styles.storeInfoItemAddress}>
            <span className={styles.storeInfoIcon}>📍</span>
            <div className={styles.storeInfoText}>
              <span className={styles.storeInfoAddressText}>Belelli 1651</span>
            </div>
          </div>

          <div className={styles.storeInfoItem}>
            <span className={styles.storeInfoIcon}>🛵</span>
            <div className={styles.storeInfoText}>
              <span className={styles.storeInfoLabel}>Delivery</span>
              <span className={styles.storeInfoSub}>20:00 — 05:00hs · Disponible</span>
            </div>
          </div>

          <div className={styles.storeInfoItem}>
            <span className={styles.storeInfoIcon}>🏪</span>
            <div className={styles.storeInfoText}>
              <span className={styles.storeInfoLabel}>Retiro en local</span>
              <span className={styles.storeInfoSub}>20:00 — 06:00hs · Sin costo adicional</span>
            </div>
          </div>

          <div className={styles.storeInfoItem}>
            <span className={styles.storeInfoIcon}>💬</span>
            <div className={styles.storeInfoText}>
              <a
                href="https://wa.me/541122545788"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.storeInfoWhatsapp}
              >
                Escribinos por WhatsApp
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0, fill: '#25D366' }}>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.storeInfoMapLink}
        >
          <iframe
            title="Ubicación del local"
            src="https://maps.google.com/maps?q=Belelli+1651,Buenos+Aires&output=embed&z=15"
            className={styles.storeInfoMap}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className={styles.storeInfoMapOverlay}>
            <span>Abrir en Maps ↗</span>
          </div>
        </a>

      </div>
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatHour(time: string | null | undefined): string {
  if (!time) return ''
  return time.slice(0, 5)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function CatalogPage() {
  const { isAppActive, isStoreOpen, isDeliveryAvailable, reopenTime, showPrices, config, isLoading } = useAppStatus()
  const { data: categories } = useCategories()
  const { data: featured } = useFeaturedProducts()
  const { addItem } = useCart()

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const categoryScrollRef = useRef<HTMLDivElement>(null)

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({ left: direction === 'right' ? 150 : -150, behavior: 'smooth' })
    }
  }

  const { data: products, isLoading: productsLoading } = useProducts({
    categoryId: selectedCategory ?? undefined,
    search,
  })

  const canOrder = isAppActive && isStoreOpen

  if (isLoading) {
    return (
      <div className={styles.loadingScreen}>
        <p>Cargando...</p>
      </div>
    )
  }

  return (
    <>
      <BannerStrip />
      <header className={styles.storeHeader}>
        <div className={styles.storeHeaderInner}>
          <div className={styles.storeHeaderLeft}>
            <img
              src="/logojavi.png"
              alt="Logo Bebidas Abi y Javi 247"
              className={styles.storeLogo}
            />
            <div className={styles.storeHeaderText}>
              <h1 className={styles.storeName}>{config?.store_name ?? 'Javi'}</h1>
              <div className={styles.storeStatusBar}>
                {isDeliveryAvailable ? (
                  <span className={styles.statusOpen}>
                    <span className={styles.statusDot} />
                    Delivery abierto · cierra a las {formatHour(config?.delivery_hours_close)} hs
                  </span>
                ) : (
                  <span className={styles.statusClosed}>
                    <span className={styles.statusDot} />
                    Delivery cerrado · abre a las {formatHour(config?.delivery_hours_open)} hs
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className={styles.storeHeaderActions}>
            <a
              href="https://wa.me/541122545788"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.headerBtn}
            >
              <svg className={styles.headerBtnIconOnly} width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span className={styles.headerBtnText}>Contactar</span>
            </a>
            <button
              className={styles.headerBtn}
              onClick={() => {
                const url = window.location.href
                const text = `Mirá el catálogo de ${config?.store_name ?? 'Javi'}: ${url}`
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
              }}
            >
              <svg className={styles.headerBtnIconOnly} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              <span className={styles.headerBtnText}>Compartir</span>
            </button>
          </div>
        </div>
      </header>
      <div className={styles.page}>

        {/* Aviso de cierre */}
        {(!isAppActive || !isStoreOpen) && (
          <ClosedNotice reopenTime={!isStoreOpen ? reopenTime : null} />
        )}

        {/* Productos destacados */}
        {featured && featured.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Destacados</h2>
            <div className={styles.featuredGrid}>
              {featured.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  showPrice={showPrices}
                  canOrder={canOrder}
                  featured
                />
              ))}
            </div>
          </section>
        )}

        {/* Filtros */}
        <div className={styles.filters}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className={styles.searchInput}
          />
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
                onClick={() => setSelectedCategory(null)}
              >
                Todos
              </button>
              {categories?.map((cat) => (
                <button
                  key={cat.id}
                  className={`${styles.categoryBtn} ${selectedCategory === cat.id ? styles.categoryBtnActive : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
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
          <CartDesktopButton />
        </div>

        {/* Catálogo */}
        <section className={styles.section}>
          {selectedCategory && categories && (
            <h2 className={styles.sectionTitle}>
              {categories.find((c) => c.id === selectedCategory)?.name}
            </h2>
          )}
          {productsLoading ? (
            <p className={styles.loadingText}>Cargando productos...</p>
          ) : !products?.length ? (
            <p className={styles.emptyText}>No hay productos disponibles.</p>
          ) : (
            <div className={styles.productsGrid}>
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  showPrice={showPrices}
                  canOrder={canOrder}
                />
              ))}
            </div>
          )}
        </section>

        <CartFab />
      </div>
      <StoreInfoBanner />
      <Footer />
    </>
  )
}

export default CatalogPage
