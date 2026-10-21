import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { detectProvider, extractExternalId } from '@jaby/shared'
import type { MediaContentType, MediaProvider } from '@jaby/shared'
import ConfirmModal from '../components/ConfirmModal'
import {
  useCreateMediaContent,
  useDeleteMediaContent,
  useMediaContent,
  useUpdateMediaContent,
  useUploadMediaThumbnail,
} from '../hooks/useMediaContent'
import {
  AlertIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  ImageIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
} from '../components/icons'
import styles from './MediaContentPage.module.css'

interface FormData {
  provider: MediaProvider
  url: string
  is_active: boolean
  thumbnail_url: string | null
  thumbnailFile: File | null
}

const EMPTY_FORM: FormData = {
  provider: 'tiktok',
  url: '',
  is_active: true,
  thumbnail_url: null,
  thumbnailFile: null,
}
const LIMIT = 10

function MediaContentPage() {
  const { data: items, isLoading } = useMediaContent()
  const createItem = useCreateMediaContent()
  const updateItem = useUpdateMediaContent()
  const deleteItem = useDeleteMediaContent()
  const uploadThumbnail = useUploadMediaThumbnail()
  const [selected, setSelected] = useState<MediaContentType | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<MediaContentType | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const list = [...(items ?? [])].sort((a, b) => a.order - b.order)
  const tiktokCount = list.filter((item) => item.provider === 'tiktok').length
  const instagramCount = list.filter((item) => item.provider === 'instagram').length
  const panelOpen = creating || selected !== null
  const saving = createItem.isPending || updateItem.isPending || uploadThumbnail.isPending

  const showToast = (message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  useEffect(() => {
    if (!panelOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting) reset()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panelOpen, deleting])

  const reset = () => {
    setSelected(null)
    setCreating(false)
    setForm(EMPTY_FORM)
    setError(null)
  }

  const openCreate = () => {
    setSelected(null)
    setCreating(true)
    setForm(EMPTY_FORM)
    setError(null)
    setNotice(null)
  }

  const openEdit = (item: MediaContentType) => {
    setSelected(item)
    setCreating(false)
    setForm({
      provider: item.provider,
      url: item.url,
      is_active: item.is_active,
      thumbnail_url: item.thumbnail_url,
      thumbnailFile: null,
    })
    setError(null)
    setNotice(null)
  }

  const updateUrl = (url: string) => {
    const detected = detectProvider(url)
    setForm((current) => ({ ...current, url, provider: detected ?? current.provider }))
    setError(null)
  }

  const validate = () => {
    const url = form.url.trim()
    const detected = detectProvider(url)
    if (!url) return 'Ingresá una URL de TikTok o Instagram.'
    if (!detected) return 'La URL debe pertenecer a TikTok o Instagram.'
    if (detected !== form.provider) return 'El proveedor seleccionado no coincide con la URL.'
    const count = form.provider === 'tiktok' ? tiktokCount : instagramCount
    if (creating && count >= LIMIT)
      return 'Límite de ' + LIMIT + ' contenidos de ' + label(form.provider) + ' alcanzado.'
    return null
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    try {
      let thumbnailUrl = form.thumbnail_url
      if (form.thumbnailFile) {
        thumbnailUrl = await uploadThumbnail.mutateAsync({
          file: form.thumbnailFile,
          provider: form.provider,
          externalId: extractExternalId(cleanUrl(form.url), form.provider),
        })
      }
      if (creating) {
        const result = await createItem.mutateAsync({
          provider: form.provider,
          url: cleanUrl(form.url),
          order: items?.length ?? 0,
          is_active: form.is_active,
          thumbnail_url: form.provider === 'instagram' || form.thumbnailFile ? thumbnailUrl : null,
          thumbnail_source: form.provider === 'instagram' || form.thumbnailFile ? 'manual' : 'auto',
        })
        reset()
        setNotice(result.thumbnailWarning)
      } else if (selected) {
        const result = await updateItem.mutateAsync({
          id: selected.id,
          payload: {
            provider: form.provider,
            url: cleanUrl(form.url),
            is_active: form.is_active,
            ...(form.provider === 'instagram' || form.thumbnailFile
              ? { thumbnail_url: thumbnailUrl, thumbnail_source: 'manual' as const }
              : {}),
          },
        })
        reset()
        // Si el contenido ya tenía imagen, no hace falta avisar
        setNotice(selected.thumbnail_url ? null : result.thumbnailWarning)
      }
    } catch {
      setError('Error al guardar el contenido. Intentá de nuevo.')
    }
  }

  const toggleActive = async (item: MediaContentType, event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      await updateItem.mutateAsync({ id: item.id, payload: { is_active: !item.is_active } })
    } catch {
      showToast('Error al cambiar el estado. Intentá de nuevo.')
    }
  }

  const move = async (index: number, direction: -1 | 1, event: React.MouseEvent) => {
    event.stopPropagation()
    const otherIndex = index + direction
    if (otherIndex < 0 || otherIndex >= list.length) return
    const current = list[index]
    const other = list[otherIndex]
    try {
      await Promise.all([
        updateItem.mutateAsync({ id: current.id, payload: { order: other.order } }),
        updateItem.mutateAsync({ id: other.id, payload: { order: current.order } }),
      ])
    } catch {
      showToast('Error al reordenar el contenido. Intentá de nuevo.')
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await deleteItem.mutateAsync(deleting.id)
      if (selected?.id === deleting.id) reset()
      setDeleting(null)
    } catch {
      showToast('Error al eliminar el contenido. Intentá de nuevo.')
      setDeleting(null)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.counters}>
          <span className={styles.counter}>
            TikTok{' '}
            <strong>
              {tiktokCount}/{LIMIT}
            </strong>
          </span>
          <span className={styles.counter}>
            Instagram{' '}
            <strong>
              {instagramCount}/{LIMIT}
            </strong>
          </span>
        </div>
        <button className={styles.createButton} onClick={openCreate}>
          <PlusIcon size={16} />
          Agregar<span className={styles.hideMobile}> contenido</span>
        </button>
      </div>

      {notice && (
        <div className={styles.notice} role="status">
          <AlertIcon size={18} />
          <span>{notice}</span>
          <button
            className={styles.noticeClose}
            onClick={() => setNotice(null)}
            aria-label="Cerrar aviso"
          >
            <CloseIcon size={16} />
          </button>
        </div>
      )}

      {isLoading ? (
        <p className={styles.emptyText}>Cargando contenido...</p>
      ) : !list.length ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>
            <ImageIcon size={28} />
          </span>
          <p className={styles.emptyTitle}>Todavía no hay contenido</p>
          <p className={styles.emptyText}>
            Sumá videos de TikTok o reels de Instagram para que aparezcan en la tienda.
          </p>
          <button className={styles.createButton} onClick={openCreate}>
            <PlusIcon size={16} />
            Agregar contenido
          </button>
        </div>
      ) : (
        <ul className={styles.list}>
          {list.map((item, index) => (
            <li
              key={item.id}
              className={[styles.card, !item.is_active ? styles.cardInactive : ''].join(' ')}
              onClick={() => openEdit(item)}
            >
              <div className={styles.thumbWrap}>
                {item.thumbnail_url ? (
                  <img src={item.thumbnail_url} alt="" className={styles.thumb} loading="lazy" />
                ) : (
                  <span className={styles.thumbPlaceholder}>
                    <ImageIcon size={28} />
                    <span>Sin imagen</span>
                  </span>
                )}
                <span className={styles.orderBadge}>#{index + 1}</span>
                <span className={styles.providerBadge}>{label(item.provider)}</span>
                {!item.is_active && <span className={styles.inactiveBadge}>Inactivo</span>}
              </div>

              <div className={styles.cardBody}>
                <span className={styles.cardUrl} title={item.url}>
                  {shortUrl(item.url)}
                </span>
                {!item.thumbnail_url && (
                  <button
                    type="button"
                    className={styles.retryLink}
                    onClick={(event) => {
                      event.stopPropagation()
                      openEdit(item)
                    }}
                  >
                    Subir imagen
                  </button>
                )}
              </div>

              <div className={styles.cardFooter}>
                <button
                  className={styles.iconBtn}
                  onClick={(event) => move(index, -1, event)}
                  disabled={index === 0 || updateItem.isPending}
                  title="Mover antes"
                  aria-label="Mover antes"
                >
                  <ChevronLeftIcon size={15} />
                </button>
                <button
                  className={styles.iconBtn}
                  onClick={(event) => move(index, 1, event)}
                  disabled={index === list.length - 1 || updateItem.isPending}
                  title="Mover después"
                  aria-label="Mover después"
                >
                  <ChevronRightIcon size={15} />
                </button>
                <button
                  className={[
                    styles.iconBtn,
                    styles.toggleBtn,
                    item.is_active ? '' : styles.toggleBtnOn,
                  ].join(' ')}
                  onClick={(event) => toggleActive(item, event)}
                  disabled={updateItem.isPending}
                >
                  {item.is_active ? <PauseIcon size={15} /> : <PlayIcon size={15} />}
                  {item.is_active ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  className={[styles.iconBtn, styles.iconBtnDelete].join(' ')}
                  onClick={(event) => {
                    event.stopPropagation()
                    setDeleting(item)
                  }}
                  disabled={deleteItem.isPending}
                  title="Eliminar"
                  aria-label="Eliminar"
                >
                  <TrashIcon size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {panelOpen &&
        createPortal(
          <>
            <div className={styles.overlay} onClick={reset} />
            <form className={styles.dialog} onSubmit={submit} role="dialog" aria-modal="true">
              <div className={styles.dialogHeader}>
                <h2 className={styles.dialogTitle}>
                  {creating ? 'Nuevo contenido' : 'Editar contenido'}
                </h2>
                <button
                  type="button"
                  className={styles.closeButton}
                  onClick={reset}
                  aria-label="Cerrar"
                >
                  <CloseIcon size={18} />
                </button>
              </div>

              <div className={styles.dialogBody}>
                <div className={styles.field}>
                  <span className={styles.labelText}>Proveedor</span>
                  <div className={styles.providerChoice}>
                    {(['tiktok', 'instagram'] as MediaProvider[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={[styles.chip, form.provider === p ? styles.chipActive : ''].join(
                          ' '
                        )}
                        onClick={() => setForm((current) => ({ ...current, provider: p }))}
                        disabled={saving}
                      >
                        {label(p)}
                      </button>
                    ))}
                  </div>
                </div>

                <label className={styles.field}>
                  <span className={styles.labelText}>URL de TikTok o Instagram *</span>
                  <input
                    className={styles.input}
                    type="url"
                    value={form.url}
                    onChange={(event) => updateUrl(event.target.value)}
                    placeholder="https://www.tiktok.com/... o https://www.instagram.com/reel/..."
                    disabled={saving}
                    autoFocus
                    required
                  />
                </label>

                {
                  <div className={styles.field}>
                    <span className={styles.labelText}>Thumbnail manual (opcional)</span>
                    {!form.thumbnailFile && form.thumbnail_url && (
                      <img
                        className={styles.imagePreview}
                        src={form.thumbnail_url}
                        alt="Thumbnail actual"
                      />
                    )}
                    <label className={styles.fileButton}>
                      {form.thumbnailFile || form.thumbnail_url ? 'Cambiar imagen' : 'Subir imagen'}
                      <input
                        className={styles.fileInput}
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file && file.type.startsWith('image/'))
                            setForm((current) => ({ ...current, thumbnailFile: file }))
                          else if (file) setError('El archivo debe ser una imagen.')
                        }}
                        disabled={saving}
                      />
                    </label>
                    {form.thumbnailFile && (
                      <span className={styles.hint}>{form.thumbnailFile.name}</span>
                    )}
                    <span className={styles.hint}>
                      {form.provider === 'tiktok'
                        ? 'TikTok ya no entrega la miniatura automáticamente: subí una captura del video. Se redimensiona a 800px y se comprime a menos de 45KB.'
                        : 'Se redimensiona a 800px y se comprime a menos de 45KB.'}
                    </span>
                  </div>
                }

                <label className={styles.toggleRow}>
                  <span>
                    <strong>Contenido activo</strong>
                    <small>Si está inactivo, no se muestra en la tienda.</small>
                  </span>
                  <input
                    type="checkbox"
                    className={styles.switch}
                    checked={form.is_active}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, is_active: event.target.checked }))
                    }
                    disabled={saving}
                  />
                </label>

                {error && (
                  <p className={styles.formError} role="alert">
                    <AlertIcon size={16} />
                    {error}
                  </p>
                )}
              </div>

              <div className={styles.dialogFooter}>
                {!creating && selected && (
                  <button
                    type="button"
                    className={styles.deleteButton}
                    aria-label="Eliminar contenido"
                    onClick={() => setDeleting(selected)}
                    disabled={deleteItem.isPending || saving}
                  >
                    <TrashIcon size={16} />
                    <span className={styles.deleteLabel}>Eliminar</span>
                  </button>
                )}
                <span className={styles.footerSpacer} />
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={reset}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.saveButton} disabled={saving}>
                  {saving ? 'Guardando...' : creating ? 'Agregar' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </>,
          document.body
        )}

      {toast && (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      )}

      {deleting && (
        <ConfirmModal
          title="Eliminar contenido"
          message={
            '¿Eliminar este contenido de ' +
            label(deleting.provider) +
            '? Esta acción no se puede deshacer.'
          }
          confirmLabel="Eliminar"
          isDanger
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

function label(provider: MediaProvider): string {
  return provider === 'tiktok' ? 'TikTok' : 'Instagram'
}

// Guarda la URL sin parámetros de seguimiento (?_r=1&fbclid=..., ?igsh=...)
function cleanUrl(url: string): string {
  try {
    const u = new URL(url.trim())
    u.search = ''
    u.hash = ''
    return u.toString()
  } catch {
    return url.trim()
  }
}

// Muestra la URL sin parámetros de seguimiento (?_r=1&fbclid=...)
function shortUrl(url: string): string {
  try {
    const u = new URL(url)
    return (u.hostname.replace(/^www\./, '') + u.pathname).replace(/\/$/, '')
  } catch {
    return url
  }
}

export default MediaContentPage
