import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '../hooks/useCategories'
import { useProducts } from '../hooks/useProducts'
import type { CategoryType } from '@jaby/shared'
import ConfirmModal from '../components/ConfirmModal'
import {
  CategoriesIcon,
  CloseIcon,
  EditIcon,
  PlusIcon,
  TrashIcon,
  AlertIcon,
} from '../components/icons'
import styles from './CategoriesPage.module.css'

function CategoriesPage() {
  const { data: categories, isLoading } = useCategories()
  const { data: products } = useProducts()
  const createCategory = useCreateCategory()
  const deleteCategory = useDeleteCategory()
  const updateCategory = useUpdateCategory()

  const [isCreating, setIsCreating] = useState(false)
  const [selected, setSelected] = useState<CategoryType | null>(null)
  const [name, setName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryType | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const isDialogOpen = isCreating || selected !== null
  const isSaving = createCategory.isPending || updateCategory.isPending

  const showToast = (message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 4000)
  }
  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const productCounts = (categoryId: string) => {
    const list = (products ?? []).filter((p) => p.category_id === categoryId)
    return { total: list.length, paused: list.filter((p) => !p.is_active).length }
  }

  const openCreate = () => {
    setSelected(null)
    setName('')
    setFormError(null)
    setIsCreating(true)
  }

  const openEdit = (category: CategoryType) => {
    setIsCreating(false)
    setSelected(category)
    setName(category.name)
    setFormError(null)
  }

  const closeDialog = () => {
    setIsCreating(false)
    setSelected(null)
    setName('')
    setFormError(null)
  }

  useEffect(() => {
    if (!isDialogOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !categoryToDelete) closeDialog()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isDialogOpen, categoryToDelete])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const trimmed = name.trim()
    if (!trimmed) {
      setFormError('El nombre es obligatorio.')
      return
    }
    const duplicated = (categories ?? []).some(
      (c) => c.id !== selected?.id && c.name.toLowerCase() === trimmed.toLowerCase()
    )
    if (duplicated) {
      setFormError('Ya existe una categoría con ese nombre.')
      return
    }

    try {
      if (isCreating) {
        await createCategory.mutateAsync({ name: trimmed })
      } else if (selected) {
        await updateCategory.mutateAsync({ id: selected.id, payload: { name: trimmed } })
      }
      closeDialog()
    } catch {
      setFormError('Ocurrió un error al guardar. Intentá de nuevo.')
    }
  }

  const handleDeleteRequest = (category: CategoryType) => {
    const { total } = productCounts(category.id)
    if (total > 0) {
      showToast(
        `No se puede eliminar "${category.name}": tiene ${total} ${total === 1 ? 'producto' : 'productos'}. Movelos a otra categoría primero.`
      )
      return
    }
    setCategoryToDelete(category)
  }

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return
    try {
      await deleteCategory.mutateAsync(categoryToDelete.id)
      if (selected?.id === categoryToDelete.id) closeDialog()
    } catch {
      showToast('Error al eliminar la categoría. Intentá de nuevo.')
    }
    setCategoryToDelete(null)
  }

  const total = categories?.length ?? 0

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <span className={styles.topBarInfo}>
          {total} {total === 1 ? 'categoría' : 'categorías'}
        </span>
        <button className={styles.createButton} onClick={openCreate}>
          <PlusIcon size={16} />
          Nueva categoría
        </button>
      </div>

      {isLoading ? (
        <p className={styles.loadingText}>Cargando categorías...</p>
      ) : !categories?.length ? (
        <p className={styles.emptyText}>No hay categorías todavía.</p>
      ) : (
        <ul className={styles.list}>
          {categories.map((category) => {
            const { total: count, paused } = productCounts(category.id)
            return (
              <li key={category.id} className={styles.card} onClick={() => openEdit(category)}>
                <span className={styles.cardIcon}>
                  <CategoriesIcon size={20} />
                </span>
                <div className={styles.cardInfo}>
                  <span className={styles.cardName} title={category.name}>
                    {category.name}
                  </span>
                  <span className={styles.cardMeta}>
                    {count === 0
                      ? 'Sin productos'
                      : `${count} ${count === 1 ? 'producto' : 'productos'}${
                          paused > 0 ? ` · ${paused} ${paused === 1 ? 'pausado' : 'pausados'}` : ''
                        }`}
                  </span>
                </div>
                <div className={styles.cardActions}>
                  <button
                    className={styles.iconBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      openEdit(category)
                    }}
                    title="Editar"
                    aria-label="Editar"
                  >
                    <EditIcon size={15} />
                  </button>
                  <button
                    className={`${styles.iconBtn} ${styles.iconBtnDelete}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteRequest(category)
                    }}
                    disabled={deleteCategory.isPending}
                    title="Eliminar"
                    aria-label="Eliminar"
                  >
                    <TrashIcon size={15} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {isDialogOpen &&
        createPortal(
          <>
            <div className={styles.overlay} onClick={closeDialog} />
            <form className={styles.dialog} onSubmit={handleSubmit} role="dialog" aria-modal="true">
              <div className={styles.dialogHeader}>
                <h2 className={styles.dialogTitle}>
                  {isCreating ? 'Nueva categoría' : 'Editar categoría'}
                </h2>
                <button
                  type="button"
                  className={styles.closeButton}
                  onClick={closeDialog}
                  aria-label="Cerrar"
                >
                  <CloseIcon size={18} />
                </button>
              </div>

              <div className={styles.dialogBody}>
                <label className={styles.label} htmlFor="category-name">
                  Nombre *
                </label>
                <input
                  id="category-name"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={styles.input}
                  placeholder="Ej: Cervezas"
                  disabled={isSaving}
                  autoFocus
                  required
                />
                {formError && (
                  <p className={styles.formError} role="alert">
                    <AlertIcon size={16} />
                    {formError}
                  </p>
                )}
              </div>

              <div className={styles.dialogFooter}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={closeDialog}
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.saveButton} disabled={isSaving}>
                  {isSaving ? 'Guardando...' : isCreating ? 'Crear categoría' : 'Guardar cambios'}
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

      {categoryToDelete && (
        <ConfirmModal
          title="Eliminar categoría"
          message={`¿Eliminar "${categoryToDelete.name}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          isDanger={true}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setCategoryToDelete(null)}
        />
      )}
    </div>
  )
}

export default CategoriesPage
