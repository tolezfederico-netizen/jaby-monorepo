import { useEffect, useState } from 'react'
import { detectProvider, extractExternalId } from '@jaby/shared'
import type { MediaContentType, MediaProvider } from '@jaby/shared'
import ConfirmModal from '../components/ConfirmModal'
import { useCreateMediaContent, useDeleteMediaContent, useMediaContent, useUpdateMediaContent, useUploadMediaThumbnail } from '../hooks/useMediaContent'
import styles from './MediaContentPage.module.css'

interface FormData {
  provider: MediaProvider
  url: string
  is_active: boolean
  thumbnail_url: string | null
  thumbnailFile: File | null
}

const EMPTY_FORM: FormData = { provider: 'tiktok', url: '', is_active: true, thumbnail_url: null, thumbnailFile: null }
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
  const [mobile, setMobile] = useState(window.innerWidth <= 768)
  const list = [...(items ?? [])].sort((a, b) => a.order - b.order)
  const tiktokCount = list.filter((item) => item.provider === 'tiktok').length
  const instagramCount = list.filter((item) => item.provider === 'instagram').length
  const panelOpen = creating || selected !== null
  const saving = createItem.isPending || updateItem.isPending || uploadThumbnail.isPending

  useEffect(() => {
    const query = window.matchMedia('(max-width: 768px)')
    const onChange = (event: MediaQueryListEvent) => setMobile(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

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
    setForm({ provider: item.provider, url: item.url, is_active: item.is_active, thumbnail_url: item.thumbnail_url, thumbnailFile: null })
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
    if (creating && count >= LIMIT) return 'Límite de ' + LIMIT + ' contenidos de ' + label(form.provider) + ' alcanzado.'
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
      if (form.provider === 'instagram' && form.thumbnailFile) {
        thumbnailUrl = await uploadThumbnail.mutateAsync({
          file: form.thumbnailFile,
          provider: form.provider,
          externalId: extractExternalId(form.url.trim(), form.provider),
        })
      }
      if (creating) {
        const result = await createItem.mutateAsync({
          provider: form.provider,
          url: form.url.trim(),
          order: items?.length ?? 0,
          is_active: form.is_active,
          thumbnail_url: form.provider === 'instagram' ? thumbnailUrl : null,
          thumbnail_source: form.provider === 'instagram' ? 'manual' : 'auto',
        })
        reset()
        setNotice(result.thumbnailWarning)
      } else if (selected) {
        const result = await updateItem.mutateAsync({
          id: selected.id,
          payload: {
            provider: form.provider,
            url: form.url.trim(),
            is_active: form.is_active,
            ...(form.provider === 'instagram' ? { thumbnail_url: thumbnailUrl, thumbnail_source: 'manual' as const } : {}),
          },
        })
        reset()
        setNotice(result.thumbnailWarning)
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
      setError('Error al cambiar el estado. Intentá de nuevo.')
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
      setError('Error al reordenar el contenido. Intentá de nuevo.')
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await deleteItem.mutateAsync(deleting.id)
      if (selected?.id === deleting.id) reset()
      setDeleting(null)
    } catch {
      setError('Error al eliminar el contenido. Intentá de nuevo.')
      setDeleting(null)
    }
  }

  return (
    <div className={styles.page}>
      <main className={styles.listColumn}>
        <header className={styles.listHeader}>
          <div>
            <h1 className={styles.title}>Contenido Multimedia</h1>
            <div className={styles.counters}>
              <span className={styles.counter}>TikTok: {tiktokCount}/{LIMIT}</span>
              <span className={styles.counterInstagram}>Instagram: {instagramCount}/{LIMIT}</span>
            </div>
          </div>
          <button className={styles.createButton} onClick={openCreate}>+ Agregar contenido</button>
        </header>
        {notice && <p className={styles.formError} role="status">{notice}</p>}
        {isLoading ? <p className={styles.emptyText}>Cargando contenido...</p> : !list.length ? (
          <p className={styles.emptyText}>No hay contenido multimedia cargado todavía.</p>
        ) : (
          <ul className={styles.list}>
            {list.map((item, index) => (
              <li key={item.id} className={[styles.item, selected?.id === item.id ? styles.itemSelected : '', !item.is_active ? styles.itemInactive : ''].join(' ')} onClick={() => openEdit(item)}>
                <div className={styles.itemMain}>
                  <div className={styles.itemOrder}>
                    <button className={styles.orderBtn} onClick={(event) => move(index, -1, event)} disabled={index === 0}>↑</button>
                    <span>{index + 1}</span>
                    <button className={styles.orderBtn} onClick={(event) => move(index, 1, event)} disabled={index === list.length - 1}>↓</button>
                  </div>
                  {item.thumbnail_url ? <img src={item.thumbnail_url} alt="" className={styles.itemThumb} /> : <div className={styles.itemThumbPlaceholder}>{item.provider === 'tiktok' ? 'TT' : 'IG'}</div>}
                  <div className={styles.itemInfo}>
                    <span className={styles.providerBadge}>{label(item.provider)}</span>
                    <span className={styles.itemUrl}>{item.url}</span>
                    <span className={styles.itemMeta}>Orden {item.order} · Thumbnail {item.thumbnail_source}</span>
                  </div>
                  <span className={[styles.activeBadge, item.is_active ? styles.activeBadgeOn : styles.activeBadgeOff].join(' ')}>{item.is_active ? 'Activo' : 'Inactivo'}</span>
                </div>
                <div className={styles.itemActions}>
                  <button className={styles.actionBtn} onClick={(event) => toggleActive(item, event)} disabled={updateItem.isPending}>{item.is_active ? 'Desactivar' : 'Activar'}</button>
                  <button className={styles.actionBtnDelete} onClick={(event) => { event.stopPropagation(); setDeleting(item) }} disabled={deleteItem.isPending}>Eliminar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {panelOpen && mobile && <div className={styles.overlay} onClick={reset} />}
      <aside className={[styles.panel, panelOpen && mobile ? styles.panelVisible : ''].join(' ')}>
        {!panelOpen ? <div className={styles.panelEmpty}><span className={styles.panelEmptyIcon}>◉</span><p className={styles.panelEmptyTitle}>Ningún contenido seleccionado</p><p className={styles.panelEmptyDesc}>Seleccioná un contenido para editarlo o agregá uno nuevo.</p><button className={styles.createButton} onClick={openCreate}>+ Agregar contenido</button></div> : (
          <>
            <div className={styles.panelHeader}><h2 className={styles.panelTitle}>{creating ? 'Nuevo contenido' : 'Editar contenido'}</h2><button className={styles.closeButton} onClick={reset} aria-label="Cerrar">x</button></div>
            <form className={styles.form} onSubmit={submit}>
              <label className={styles.label}>Proveedor
                <select className={styles.input} value={form.provider} onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value as MediaProvider }))} disabled={saving}><option value="tiktok">TikTok</option><option value="instagram">Instagram</option></select>
              </label>
              <label className={styles.label}>URL de TikTok o Instagram *
                <input className={styles.input} type="url" value={form.url} onChange={(event) => updateUrl(event.target.value)} placeholder="https://www.tiktok.com/... o https://www.instagram.com/reel/..." disabled={saving} required />
              </label>
              {form.provider === 'instagram' && <label className={styles.label}>Thumbnail manual (opcional)
                <input className={styles.inputFile} type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file && file.type.startsWith('image/')) setForm((current) => ({ ...current, thumbnailFile: file })); else if (file) setError('El archivo debe ser una imagen.') }} disabled={saving} />
                {form.thumbnailFile && <span className={styles.fileHint}>{form.thumbnailFile.name}</span>}
                {!form.thumbnailFile && form.thumbnail_url && <img className={styles.imagePreview} src={form.thumbnail_url} alt="Thumbnail actual" />}
                <span className={styles.fieldHint}>Se redimensiona a 800px y se comprime a menos de 45KB.</span>
              </label>}
              {form.provider === 'tiktok' && <p className={styles.fieldHint}>El thumbnail se obtiene automáticamente desde TikTok.</p>}
              <label className={styles.checkboxLabel}><input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} disabled={saving} /> Contenido activo</label>
              {error && <p className={styles.formError} role="alert">{error}</p>}
              <div className={styles.formActions}><button type="button" className={styles.cancelButton} onClick={reset} disabled={saving}>Cancelar</button><button type="submit" className={styles.saveButton} disabled={saving}>{saving ? 'Guardando...' : creating ? 'Agregar' : 'Guardar cambios'}</button></div>
              {!creating && selected && <button type="button" className={styles.deleteButton} onClick={() => setDeleting(selected)} disabled={deleteItem.isPending}>Eliminar contenido</button>}
            </form>
          </>
        )}
      </aside>
      {deleting && <ConfirmModal title="Eliminar contenido" message={'¿Eliminar este contenido de ' + label(deleting.provider) + '? Esta acción no se puede deshacer.'} confirmLabel="Eliminar" isDanger onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />}
    </div>
  )
}

function label(provider: MediaProvider): string {
  return provider === 'tiktok' ? 'TikTok' : 'Instagram'
}

export default MediaContentPage
