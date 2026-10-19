import { useCallback, useEffect, useState } from 'react'
import { extractExternalId, getEmbedUrl, type MediaContentType } from '@jaby/shared'
import { useMediaContent } from '../hooks/useMediaContent'
import styles from './MediaContentCarousel.module.css'

function MediaContentModal({ item, onClose }: { item: MediaContentType; onClose: () => void }) {
  const embedUrl = getEmbedUrl(item.url, item.provider)

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!embedUrl) return null

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose} aria-label="Cerrar">x</button>
        <iframe
          src={embedUrl}
          className={styles.modalIframe}
          allowFullScreen
          allow="autoplay; encrypted-media"
          title={`${item.provider === 'instagram' ? 'Instagram' : 'TikTok'} content`}
        />
      </div>
    </div>
  )
}

function MediaContentCarousel() {
  const { data: items, isLoading } = useMediaContent()
  const [current, setCurrent] = useState(0)
  const [visibleCount, setVisibleCount] = useState(1)
  const [activeItem, setActiveItem] = useState<MediaContentType | null>(null)

  const activeItems = items ?? []

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const handleResize = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        const width = window.innerWidth
        if (width >= 1400) setVisibleCount(7)
        else if (width >= 1100) setVisibleCount(6)
        else if (width >= 800) setVisibleCount(5)
        else if (width >= 540) setVisibleCount(4)
        else setVisibleCount(3)
      }, 200)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => {
      clearTimeout(timeout)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const total = activeItems.length
  const handlePrev = () => setCurrent((previous) => (previous - 1 + total) % total)
  const handleNext = () => setCurrent((previous) => (previous + 1) % total)
  const handleCloseModal = useCallback(() => setActiveItem(null), [])

  if (isLoading || total === 0) return null

  const visibleItems = Array.from({ length: Math.min(visibleCount, total) }, (_, index) =>
    activeItems[(current + index) % total],
  )

  return (
    <section className={styles.section}>
      <div className={styles.carouselContainer}>
        <h2 className={styles.title}>Lo último que subimos</h2>
        <div className={styles.carouselWrapper}>
          <button className={styles.arrow} onClick={handlePrev} aria-label="Anterior">&lt;</button>
          <div className={styles.track}>
            {visibleItems.map((item, index) => {
              const externalId = extractExternalId(item.url, item.provider)
              const fallbackThumbnail = item.provider === 'tiktok' && externalId
                ? `https://www.tiktok.com/api/img/?itemId=${externalId}&location=1`
                : null
              const thumbnail = item.thumbnail_url || fallbackThumbnail

              return (
                <div
                  key={`${item.id}-${index}`}
                  data-slide="true"
                  className={styles.slide}
                  onClick={() => getEmbedUrl(item.url, item.provider) && setActiveItem(item)}
                >
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={`Contenido ${item.provider}`}
                      className={styles.thumbnail}
                      loading="lazy"
                      onError={(event) => {
                        const image = event.currentTarget
                        if (fallbackThumbnail && image.src !== fallbackThumbnail) {
                          image.src = fallbackThumbnail
                          return
                        }
                        image.style.display = 'none'
                        const placeholder = image.closest('[data-slide]')?.querySelector('[data-placeholder]') as HTMLElement | null
                        if (placeholder) placeholder.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <div data-placeholder="true" className={styles.placeholder} style={{ display: thumbnail ? 'none' : 'flex' }}>
                    <svg className={styles.placeholderIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M15 12l-5-3v6z" />
                    </svg>
                    <span className={styles.placeholderLabel}>Contenido</span>
                  </div>
                  <span className={styles.providerBadge}>{item.provider === 'instagram' ? 'Instagram' : 'TikTok'}</span>
                  {getEmbedUrl(item.url, item.provider) ? (
                    <div className={styles.playOverlay}>
                      <div className={styles.playButton}>&gt;</div>
                    </div>
                  ) : (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.fallbackLink}
                      onClick={(event) => event.stopPropagation()}
                    >
                      Ver contenido en {item.provider === 'instagram' ? 'Instagram' : 'TikTok'} &gt;
                    </a>
                  )}
                </div>
              )
            })}
          </div>
          <button className={styles.arrow} onClick={handleNext} aria-label="Siguiente">&gt;</button>
        </div>
        <div className={styles.dots}>
          {activeItems.map((_, index) => (
            <button
              key={index}
              className={`${styles.dot} ${index === current ? styles.dotActive : ''}`}
              onClick={() => setCurrent(index)}
              aria-label={`Ir al contenido ${index + 1}`}
            />
          ))}
        </div>
      </div>
      {activeItem && <MediaContentModal item={activeItem} onClose={handleCloseModal} />}
    </section>
  )
}

export default MediaContentCarousel
