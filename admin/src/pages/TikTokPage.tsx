import { useState } from 'react'
import { useTikTokVideos, useCreateTikTokVideo, useUpdateTikTokVideo, useDeleteTikTokVideo } from '../hooks/useTikTokVideos'
import type { TikTokVideoType } from '@jaby/shared'
import ConfirmModal from '../components/ConfirmModal'
import styles from './TikTokPage.module.css'

function TikTokPage() {
  const { data: videos, isLoading } = useTikTokVideos()
  const createVideo = useCreateTikTokVideo()
  const updateVideo = useUpdateTikTokVideo()
  const deleteVideo = useDeleteTikTokVideo()

  const [newUrl, setNewUrl] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [videoToDelete, setVideoToDelete] = useState<TikTokVideoType | null>(null)

  const activeCount = videos?.length ?? 0
  const canAdd = activeCount < 10

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!newUrl.trim()) {
      setFormError('Ingresá una URL de TikTok.')
      return
    }
    if (!newUrl.includes('tiktok.com')) {
      setFormError('La URL debe ser de TikTok.')
      return
    }
    if (!canAdd) {
      setFormError('Límite de 10 videos alcanzado.')
      return
    }

    try {
      await createVideo.mutateAsync({
        url: newUrl.trim(),
        order: activeCount,
      })
      setNewUrl('')
    } catch {
      setFormError('Error al agregar el video. Intentá de nuevo.')
    }
  }

  const handleToggleActive = async (video: TikTokVideoType) => {
    if (updateVideo.isPending) return
    try {
      await updateVideo.mutateAsync({ id: video.id, payload: { is_active: !video.is_active } })
    } catch {
      setFormError('Error al cambiar estado del video. Intentá de nuevo.')
    }
  }

  const handleMoveUp = async (index: number) => {
    if (!videos || index === 0) return
    if (updateVideo.isPending) return
    const current = videos[index]
    const prev = videos[index - 1]
    try {
      await Promise.all([
        updateVideo.mutateAsync({ id: current.id, payload: { order: prev.order } }),
        updateVideo.mutateAsync({ id: prev.id, payload: { order: current.order } }),
      ])
    } catch {
      setFormError('Error al reordenar videos. Intentá de nuevo.')
    }
  }

  const handleMoveDown = async (index: number) => {
    if (!videos || index === videos.length - 1) return
    if (updateVideo.isPending) return
    const current = videos[index]
    const next = videos[index + 1]
    try {
      await Promise.all([
        updateVideo.mutateAsync({ id: current.id, payload: { order: next.order } }),
        updateVideo.mutateAsync({ id: next.id, payload: { order: current.order } }),
      ])
    } catch {
      setFormError('Error al reordenar videos. Intentá de nuevo.')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!videoToDelete) return
    try {
      await deleteVideo.mutateAsync(videoToDelete.id)
      setVideoToDelete(null)
    } catch {
      setFormError('Error al eliminar el video. Intentá de nuevo.')
      setVideoToDelete(null)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.titleWrapper}>
        <h1 className={styles.title}>Videos TikTok</h1>
        <span className={styles.counter}>{activeCount}/10 videos</span>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Agregar video</h2>
        <form onSubmit={handleAdd} className={styles.addForm}>
          <input
            type="url"
            value={newUrl}
            onChange={(e) => { setNewUrl(e.target.value); setFormError(null) }}
            className={styles.input}
            placeholder="https://www.tiktok.com/@usuario/video/..."
            disabled={!canAdd || createVideo.isPending}
          />
          <button
            type="submit"
            className={styles.addButton}
            disabled={!canAdd || createVideo.isPending}
          >
            {createVideo.isPending ? 'Agregando...' : '+ Agregar'}
          </button>
        </form>
        {!canAdd && (
          <p className={styles.limitText}>Límite de 10 videos alcanzado. Eliminá uno para agregar otro.</p>
        )}
        {formError && <p className={styles.errorText} role="alert">{formError}</p>}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Videos cargados</h2>
        {isLoading ? (
          <p className={styles.loadingText}>Cargando videos...</p>
        ) : !videos?.length ? (
          <p className={styles.emptyText}>No hay videos cargados todavía.</p>
        ) : (
          <ul className={styles.list}>
            {videos.map((video, index) => (
              <li key={video.id} className={`${styles.item} ${!video.is_active ? styles.itemInactive : ''}`}>
                <div className={styles.itemOrder}>
                  <button
                    className={styles.orderBtn}
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0 || updateVideo.isPending}
                  >
                    ↑
                  </button>
                  <span className={styles.orderNumber}>{index + 1}</span>
                  <button
                    className={styles.orderBtn}
                    onClick={() => handleMoveDown(index)}
                    disabled={index === videos.length - 1 || updateVideo.isPending}
                  >
                    ↓
                  </button>
                </div>
                <div className={styles.itemInfo}>
                  <span className={styles.itemUrl}>{video.url}</span>
                  <span className={styles.itemStatus}>
                    {video.is_active ? '✅ Activo' : '⏸ Inactivo'}
                  </span>
                </div>
                <div className={styles.itemActions}>
                  <button
                    className={`${styles.actionBtn} ${video.is_active ? styles.actionBtnPause : styles.actionBtnActivate}`}
                    onClick={() => handleToggleActive(video)}
                    disabled={updateVideo.isPending}
                  >
                    {video.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                    onClick={() => setVideoToDelete(video)}
                    disabled={deleteVideo.isPending}
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {videoToDelete && (
        <ConfirmModal
          title="Eliminar video"
          message={`¿Eliminar este video de TikTok? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          isDanger={true}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setVideoToDelete(null)}
        />
      )}
    </div>
  )
}

export default TikTokPage
