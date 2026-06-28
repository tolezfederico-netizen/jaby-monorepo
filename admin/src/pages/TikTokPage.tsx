import { useState, useEffect } from 'react'
import { useTikTokVideos, useCreateTikTokVideo, useUpdateTikTokVideo, useDeleteTikTokVideo } from '../hooks/useTikTokVideos'
import type { TikTokVideoType } from '@jaby/shared'
import ConfirmModal from '../components/ConfirmModal'
import styles from './TikTokPage.module.css'

interface TikTokFormData {
  url: string
  is_active: boolean
}

const EMPTY_FORM: TikTokFormData = {
  url: '',
  is_active: true,
}

function TikTokPage() {
  const { data: videos, isLoading } = useTikTokVideos()
  const createVideo = useCreateTikTokVideo()
  const updateVideo = useUpdateTikTokVideo()
  const deleteVideo = useDeleteTikTokVideo()

  const [selected, setSelected] = useState<TikTokVideoType | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState<TikTokFormData>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [videoToDelete, setVideoToDelete] = useState<TikTokVideoType | null>(null)

  const isPanelActive = isCreating || selected !== null
  const isMobile = useIsMobile()

  const sortedVideos = [...(videos ?? [])].sort((a, b) => a.order - b.order)
  const activeCount = videos?.length ?? 0
  const canAdd = activeCount < 10

  const openCreate = () => {
    setSelected(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setIsCreating(true)
  }

  const openEdit = (video: TikTokVideoType) => {
    setIsCreating(false)
    setForm({ url: video.url, is_active: video.is_active })
    setFormError(null)
    setSelected(video)
  }

  const closePanel = () => {
    setSelected(null)
    setIsCreating(false)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  const handleField = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const validateUrl = (url: string): string | null => {
    if (!url.trim()) return 'Ingresá una URL de TikTok.'
    if (!url.includes('tiktok.com')) return 'La URL debe ser de TikTok.'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const urlError = validateUrl(form.url)
    if (urlError) { setFormError(urlError); return }

    if (isCreating) {
      if (!canAdd) {
        setFormError('Límite de 10 videos alcanzado.')
        return
      }
      try {
        await createVideo.mutateAsync({ url: form.url.trim(), order: activeCount })
        closePanel()
      } catch {
        setFormError('Error al agregar el video. Intentá de nuevo.')
      }
    } else if (selected) {
      try {
        await updateVideo.mutateAsync({
          id: selected.id,
          payload: { url: form.url.trim(), is_active: form.is_active },
        })
        closePanel()
      } catch {
        setFormError('Error al guardar. Intentá de nuevo.')
      }
    }
  }

  const handleToggleActive = async (video: TikTokVideoType, e: React.MouseEvent) => {
    e.stopPropagation()
    if (updateVideo.isPending) return
    try {
      await updateVideo.mutateAsync({
        id: video.id,
        payload: { is_active: !video.is_active },
      })
    } catch {
      setFormError('Error al cambiar estado. Intentá de nuevo.')
    }
  }

  const handleMoveUp = async (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (index === 0 || updateVideo.isPending) return
    const current = sortedVideos[index]
    const prev = sortedVideos[index - 1]
    try {
      await Promise.all([
        updateVideo.mutateAsync({ id: current.id, payload: { order: prev.order } }),
        updateVideo.mutateAsync({ id: prev.id, payload: { order: current.order } }),
      ])
    } catch {
      setFormError('Error al reordenar videos. Intentá de nuevo.')
    }
  }

  const handleMoveDown = async (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (index === sortedVideos.length - 1 || updateVideo.isPending) return
    const current = sortedVideos[index]
    const next = sortedVideos[index + 1]
    try {
      await Promise.all([
        updateVideo.mutateAsync({ id: current.id, payload: { order: next.order } }),
        updateVideo.mutateAsync({ id: next.id, payload: { order: current.order } }),
      ])
    } catch {
      setFormError('Error al reordenar videos. Intentá de nuevo.')
    }
  }

  const handleDeleteRequest = (video: TikTokVideoType, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setVideoToDelete(video)
  }

  const handleDeleteConfirm = async () => {
    if (!videoToDelete) return
    try {
      await deleteVideo.mutateAsync(videoToDelete.id)
      if (selected?.id === videoToDelete.id) closePanel()
      setVideoToDelete(null)
    } catch {
      setFormError('Error al eliminar el video. Intentá de nuevo.')
      setVideoToDelete(null)
    }
  }

  const isSaving = createVideo.isPending || updateVideo.isPending

  return (
    <div className={styles.page}>
      <div className={styles.listColumn}>
        <div className={styles.listHeader}>
          <div className={styles.titleWrapper}>
            <h1 className={styles.title}>Videos TikTok</h1>
            <span className={styles.counter}>{activeCount}/10</span>
          </div>
          {!isPanelActive && isMobile && (
            <button className={styles.createButton} onClick={openCreate} disabled={!canAdd}>
              + Agregar video
            </button>
          )}
        </div>

        {isLoading ? (
          <p className={styles.loadingText}>Cargando videos...</p>
        ) : !videos?.length ? (
          <p className={styles.emptyText}>No hay videos cargados todavía.</p>
        ) : (
          <ul className={styles.list}>
            {sortedVideos.map((video, index) => (
              <li
                key={video.id}
                className={`${styles.item} ${
                  selected?.id === video.id ? styles.itemSelected : ''
                } ${!video.is_active ? styles.itemInactive : ''}`}
                onClick={() => openEdit(video)}
              >
                <div className={styles.itemMain}>
                  <div className={styles.itemOrder}>
                    <button
                      className={styles.orderBtn}
                      onClick={(e) => handleMoveUp(index, e)}
                      disabled={index === 0 || updateVideo.isPending}
                    >
                      ↑
                    </button>
                    <span className={styles.orderNumber}>{index + 1}</span>
                    <button
                      className={styles.orderBtn}
                      onClick={(e) => handleMoveDown(index, e)}
                      disabled={index === sortedVideos.length - 1 || updateVideo.isPending}
                    >
                      ↓
                    </button>
                  </div>
                  {video.thumbnail_url && (
                    <img
                      src={video.thumbnail_url}
                      alt=""
                      className={styles.itemThumb}
                      loading="lazy"
                    />
                  )}
                  <div className={styles.itemInfo}>
                    <span className={styles.itemUrl}>{video.url}</span>
                    <span className={styles.itemMeta}>Orden {video.order}</span>
                  </div>
                  <span
                    className={`${styles.activeBadge} ${
                      video.is_active ? styles.activeBadgeOn : styles.activeBadgeOff
                    }`}
                  >
                    {video.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className={styles.itemActions}>
                  <button
                    className={`${styles.actionBtn} ${
                      video.is_active ? styles.actionBtnPause : styles.actionBtnActivate
                    }`}
                    onClick={(e) => handleToggleActive(video, e)}
                    disabled={updateVideo.isPending}
                  >
                    {video.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                    onClick={(e) => handleDeleteRequest(video, e)}
                    disabled={deleteVideo.isPending}
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isPanelActive && isMobile && (
        <div className={styles.overlay} onClick={closePanel} />
      )}
      <div className={`${styles.panel} ${isPanelActive && isMobile ? styles.panelVisible : ''}`}>
        {!isPanelActive ? (
          <div className={styles.panelEmpty}>
            <span className={styles.panelEmptyIcon}>🎵</span>
            <p className={styles.panelEmptyTitle}>Ningún video seleccionado</p>
            <p className={styles.panelEmptyDesc}>
              Seleccioná un video de la lista para editarlo, o agregá uno nuevo.
            </p>
            <button className={styles.createButton} onClick={openCreate} disabled={!canAdd}>
              + Agregar video
            </button>
            {!canAdd && (
              <p className={styles.limitText}>Límite de 10 videos alcanzado.</p>
            )}
          </div>
        ) : (
          <>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                {isCreating ? 'Nuevo video' : 'Editar video'}
              </h2>
              <button className={styles.closeButton} onClick={closePanel}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>URL de TikTok *</label>
                <input
                  name="url"
                  type="url"
                  value={form.url}
                  onChange={handleField}
                  className={styles.input}
                  placeholder="https://www.tiktok.com/@usuario/video/..."
                  disabled={isSaving}
                  required
                />
              </div>

              {selected?.thumbnail_url && (
                <div className={styles.field}>
                  <label className={styles.label}>Thumbnail</label>
                  <img
                    src={selected.thumbnail_url}
                    alt=""
                    className={styles.imagePreview}
                  />
                </div>
              )}

              <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    name="is_active"
                    type="checkbox"
                    checked={form.is_active}
                    onChange={handleField}
                    disabled={isSaving}
                  />
                  Video activo
                </label>
              </div>

              {!isCreating && selected && (
                <div className={styles.field}>
                  <label className={styles.label}>Orden actual</label>
                  <p className={styles.orderDisplay}>
                    {sortedVideos.findIndex(v => v.id === selected.id) + 1} de {sortedVideos.length}
                  </p>
                </div>
              )}

              {formError && (
                <p className={styles.formError} role="alert">{formError}</p>
              )}

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={closePanel}
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={isSaving}
                >
                  {isSaving ? 'Guardando...' : isCreating ? 'Agregar' : 'Guardar cambios'}
                </button>
              </div>

              {!isCreating && selected && (
                <div className={styles.deleteSection}>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => handleDeleteRequest(selected)}
                    disabled={deleteVideo.isPending}
                  >
                    {deleteVideo.isPending ? 'Eliminando...' : 'Eliminar video'}
                  </button>
                </div>
              )}
            </form>
          </>
        )}
      </div>

      {videoToDelete && (
        <ConfirmModal
          title="Eliminar video"
          message="¿Eliminar este video de TikTok? Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          isDanger={true}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setVideoToDelete(null)}
        />
      )}
    </div>
  )
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isMobile
}

export default TikTokPage
