import { useState, useEffect, useRef, useCallback } from 'react'
import { useTikTokVideos } from '../hooks/useTikTokVideos'
import styles from './TikTokCarousel.module.css'

function extractTikTokId(url: string): string | null {
  const match = url.match(/video\/(\d+)/)
  return match ? match[1] : null
}

function TikTokModal({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose} aria-label="Cerrar">✕</button>
        <iframe
          src={`https://www.tiktok.com/embed/v2/${videoId}`}
          className={styles.modalIframe}
          allowFullScreen
          allow="autoplay; encrypted-media"
          title={`TikTok video ${videoId}`}
        />
      </div>
    </div>
  )
}

function TikTokCarousel() {
  const { data: videos, isLoading } = useTikTokVideos()
  const [current, setCurrent] = useState(0)
  const [visibleCount, setVisibleCount] = useState(1)
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeVideos = videos?.filter((v) => v.is_active) ?? []

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    function handleResize() {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        const width = window.innerWidth
        if (width >= 1400) setVisibleCount(5)
        else if (width >= 1100) setVisibleCount(4)
        else if (width >= 800) setVisibleCount(3)
        else if (width >= 540) setVisibleCount(2)
        else setVisibleCount(1)
      }, 200)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => {
      clearTimeout(timeout)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const total = activeVideos.length

  const handlePrev = () => setCurrent((prev) => (prev - 1 + total) % total)
  const handleNext = () => setCurrent((prev) => (prev + 1) % total)

  const getVisibleVideos = () => {
    if (total === 0) return []
    const result = []
    for (let i = 0; i < visibleCount; i++) {
      result.push(activeVideos[(current + i) % total])
    }
    return result
  }

  const handleCloseModal = useCallback(() => {
    setActiveVideoId(null)
  }, [])

  if (isLoading || total === 0) return null

  const visibleVideos = getVisibleVideos()

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>📱 Seguinos en TikTok <span style={{ color: '#E91E8C' }}>@_antojosexpres_</span></h2>

      <div className={styles.carouselWrapper}>
        <button className={styles.arrow} onClick={handlePrev} aria-label="Anterior">‹</button>

        <div className={styles.track} ref={containerRef}>
          {visibleVideos.map((video, index) => {
            const videoId = extractTikTokId(video.url)
            return (
              <div
                key={`${video.id}-${index}`}
                className={styles.slide}
                onClick={() => videoId && setActiveVideoId(videoId)}
              >
                {videoId ? (
                  <>
                    <img
                      src={video.thumbnail_url ?? `https://placehold.co/270x480/1A1A2E/E91E8C?text=TikTok`}
                      alt="TikTok video thumbnail"
                      className={styles.thumbnail}
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/270x480/1A1A2E/E91E8C?text=TikTok'
                      }}
                    />
                    <div className={styles.playOverlay}>
                      <div className={styles.playButton}>▶</div>
                    </div>
                  </>
                ) : (
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.fallbackLink}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Ver video en TikTok ↗
                  </a>
                )}
              </div>
            )
          })}
        </div>

        <button className={styles.arrow} onClick={handleNext} aria-label="Siguiente">›</button>
      </div>

      <div className={styles.dots}>
        {activeVideos.map((_, index) => (
          <button
            key={index}
            className={`${styles.dot} ${index === current ? styles.dotActive : ''}`}
            onClick={() => setCurrent(index)}
            aria-label={`Ir al video ${index + 1}`}
          />
        ))}
      </div>

      {activeVideoId && (
        <TikTokModal
          videoId={activeVideoId}
          onClose={handleCloseModal}
        />
      )}
    </section>
  )
}

export default TikTokCarousel
