import { useEffect, useRef, useState } from 'react'
import type { ProductType } from '@jaby/shared'
import { formatPrice, toWhatsAppNumber } from '@jaby/shared'
import { useStoreConfig } from '../hooks/useStoreConfig'
import WhatsAppIcon from './WhatsAppIcon'
import styles from './Header.module.css'

interface HeaderProps {
  storeName: string
  whatsappNumber?: string
  isDeliveryAvailable: boolean
  deliveryHoursOpen?: string | null
  deliveryHoursClose?: string | null
  products: ProductType[]
  showPrices: boolean
  search: string
  onSearchChange: (value: string) => void
  onProductSelect?: (productId: string) => void
}

function formatHour(time: string | null | undefined): string {
  return time ? time.slice(0, 5) : ''
}

function Header({
  storeName,
  whatsappNumber,
  isDeliveryAvailable,
  deliveryHoursOpen,
  deliveryHoursClose,
  products,
  showPrices,
  search,
  onSearchChange,
  onProductSelect,
}: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [debouncedSearch, setDebouncedSearch] = useState(search)
  const searchRef = useRef<HTMLDivElement>(null)
  const contactRef = useRef<HTMLDivElement>(null)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isContactOpen, setIsContactOpen] = useState(false)
  const { data: storeConfig } = useStoreConfig()

  useEffect(() => {
    let frameId: number | null = null

    const updateScrolledState = () => {
      if (frameId !== null) return
      frameId = window.requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 10)
        frameId = null
      })
    }

    updateScrolledState()
    window.addEventListener('scroll', updateScrolledState, { passive: true })

    return () => {
      window.removeEventListener('scroll', updateScrolledState)
      if (frameId !== null) window.cancelAnimationFrame(frameId)
    }
  }, [])

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (contactRef.current && !contactRef.current.contains(event.target as Node)) {
        setIsContactOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsContactOpen(false)
    }

    document.addEventListener('mousedown', handleDocumentClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search), 250)
    return () => window.clearTimeout(timeoutId)
  }, [search])

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false)
      }
    }

    document.addEventListener('mousedown', handleDocumentClick)
    return () => document.removeEventListener('mousedown', handleDocumentClick)
  }, [])

  const normalizedSearch = debouncedSearch.trim().toLocaleLowerCase()
  const matchingProducts = normalizedSearch
    ? products
        .filter((product) => product.name.toLocaleLowerCase().includes(normalizedSearch))
        .slice(0, 8)
    : []
  const showSearchResults = isSearchFocused && search.trim().length > 0

  const scrollToProduct = (productId: string) => {
    onProductSelect?.(productId)
    window.setTimeout(() => {
      document.getElementById(`product-${productId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, onProductSelect ? 50 : 0)
    setIsSearchFocused(false)
  }

  const shareCatalog = () => {
    const url = window.location.href
    const text = `Mirá el catálogo de ${storeName}: ${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const contactWhatsappNumber = storeConfig?.whatsapp_number || whatsappNumber || ''
  const contactWhatsappDigits = toWhatsAppNumber(contactWhatsappNumber)
  const contactWhatsappUrl = contactWhatsappDigits
    ? `https://wa.me/${contactWhatsappDigits}?text=${encodeURIComponent(`Hola! Quer\u00eda consultar sobre productos de ${storeName}`)}`
    : null
  const instagramUrl = storeConfig?.instagram_url?.trim() || null
  const mapsQuery = [storeConfig?.address, storeConfig?.neighborhood, storeConfig?.municipality]
    .filter(Boolean)
    .join(', ')
  const mapsUrl = mapsQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
    : null
  const hasContactOptions = Boolean(contactWhatsappUrl || instagramUrl || mapsUrl)

  return (
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.headerInner}>
        <div className={styles.storeInfo}>
          <img src="/logo.png" alt="Logo Antojos Ya" className={styles.logo} />
          <div className={styles.storeText}>
            <h1 className={styles.storeName}>{storeName}</h1>
            <div className={styles.status}>
              <span className={`${styles.statusDot} ${isDeliveryAvailable ? styles.statusOpen : styles.statusClosed}`} />
              <span className={styles.statusText}>
                {isDeliveryAvailable ? (
                  <>
                    <span className={styles.statusExtra}>Delivery </span>abierto · cierra{' '}
                    <span className={styles.statusExtra}>a las </span>
                    {formatHour(deliveryHoursClose)} hs
                  </>
                ) : (
                  <>
                    <span className={styles.statusExtra}>Delivery </span>cerrado · abre{' '}
                    <span className={styles.statusExtra}>a las </span>
                    {formatHour(deliveryHoursOpen)} hs
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.searchArea} ref={searchRef}>
          <div className={styles.searchWrapper}>
            <svg className={styles.searchIcon} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Buscar producto..."
              className={styles.searchInput}
              aria-label="Buscar producto"
            />
          </div>

          {showSearchResults && (
            <div className={styles.searchResults} role="listbox">
              {matchingProducts.length > 0 ? matchingProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className={styles.resultCard}
                  onClick={() => scrollToProduct(product.id)}
                >
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className={styles.resultImage} />
                  ) : (
                    <div className={styles.resultImagePlaceholder} />
                  )}
                  <span className={styles.resultInfo}>
                    <span className={styles.resultName}>{product.name}</span>
                    {product.description && (
                      <span className={styles.resultDesc}>{product.description}</span>
                    )}
                    {showPrices && product.price != null && (
                      <span className={styles.resultPrice}>{formatPrice(product.price)}</span>
                    )}
                  </span>
                </button>
              )) : (
                <p className={styles.noResults}>No se encontraron productos</p>
              )}
            </div>
          )}
        </div>

        <div className={styles.actions}>
          {hasContactOptions && (
            <div className={styles.contactMenuWrapper} ref={contactRef}>
              <button
                type="button"
                className={styles.actionButton}
                aria-haspopup="menu"
                aria-expanded={isContactOpen}
                onClick={() => setIsContactOpen((open) => !open)}
              >
                <span className={styles.actionIcon} aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
                <span className={styles.actionText}>Contactar</span>
                <svg className={`${styles.contactChevron} ${isContactOpen ? styles.contactChevronOpen : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="2.5 4.5 6 8 9.5 4.5" />
                </svg>
              </button>
              {isContactOpen && (
                <div className={styles.contactMenu} role="menu" aria-label="Opciones de contacto">
                  {contactWhatsappUrl && (
                    <a href={contactWhatsappUrl} target="_blank" rel="noopener noreferrer" className={styles.contactMenuItem} role="menuitem" onClick={() => setIsContactOpen(false)}>
                      <span className={styles.contactMenuIcon} aria-hidden="true"><WhatsAppIcon size={16} /></span>
                      WhatsApp
                    </a>
                  )}
                  {instagramUrl && (
                    <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className={styles.contactMenuItem} role="menuitem" onClick={() => setIsContactOpen(false)}>
                      <span className={styles.contactMenuIcon} aria-hidden="true">IG</span>
                      Instagram
                    </a>
                  )}
                  {mapsUrl && (
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.contactMenuItem} role="menuitem" onClick={() => setIsContactOpen(false)}>
                      <span className={styles.contactMenuIcon} aria-hidden="true">MAP</span>
                      Ver ubicación
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
          <button type="button" className={styles.actionButton} onClick={shareCatalog}>
            <span className={styles.actionIcon} aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </span>
            <span className={styles.actionText}>Compartir</span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
