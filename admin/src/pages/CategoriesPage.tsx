import { useState } from 'react'
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from '../hooks/useCategories'
import type { CategoryType } from '@jaby/shared'
import ConfirmModal from '../components/ConfirmModal'
import styles from './CategoriesPage.module.css'

function CategoriesPage() {
  const { data: categories, isLoading } = useCategories()
  const createCategory = useCreateCategory()
  const deleteCategory = useDeleteCategory()
  const updateCategory = useUpdateCategory()

  const [isCreating, setIsCreating] = useState(false)
  const [selected, setSelected] = useState<CategoryType | null>(null)
  const [name, setName] = useState('')
  const [editName, setEditName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryType | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const isSaving = createCategory.isPending || updateCategory.isPending

  const openCreate = () => {
    setSelected(null)
    setName('')
    setFormError(null)
    setIsCreating(true)
    setIsPanelOpen(true)
  }

  const openEdit = (category: CategoryType) => {
    setIsCreating(false)
    setSelected(category)
    setEditName(category.name)
    setFormError(null)
    setIsPanelOpen(true)
  }

  const closePanel = () => {
    setIsCreating(false)
    setSelected(null)
    setName('')
    setEditName('')
    setFormError(null)
    setIsPanelOpen(false)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!name.trim()) { setFormError('El nombre es obligatorio.'); return }

    try {
      await createCategory.mutateAsync({ name: name.trim() })
      closePanel()
    } catch {
      setFormError('Ocurrió un error al guardar. Intentá de nuevo.')
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!editName.trim()) { setFormError('El nombre es obligatorio.'); return }

    try {
      await updateCategory.mutateAsync({ id: selected!.id, payload: { name: editName.trim() } })
      closePanel()
    } catch {
      setFormError('Ocurrió un error al guardar. Intentá de nuevo.')
    }
  }

  const handleDeleteRequest = (category: CategoryType) => {
    setCategoryToDelete(category)
  }

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return
    try {
      await deleteCategory.mutateAsync(categoryToDelete.id)
      setCategoryToDelete(null)
    } catch {
      setFormError('Error al eliminar la categoría. Intentá de nuevo.')
      setCategoryToDelete(null)
    }
  }

  const handleDeleteCancel = () => setCategoryToDelete(null)

  return (
    <div className={styles.page}>
      <div className={styles.listColumn}>
        <div className={styles.listHeader}>
          <h1 className={styles.title}>Categorías</h1>
        </div>

        {isLoading ? (
          <p className={styles.loadingText}>Cargando categorías...</p>
        ) : !categories?.length ? (
          <p className={styles.emptyText}>No hay categorías todavía.</p>
        ) : (
          <ul className={styles.list}>
            {categories.map((category) => (
              <li
                key={category.id}
                className={`${styles.item} ${selected?.id === category.id ? styles.itemSelected : ''}`}
              >
                <div className={styles.itemMain}>
                  <span className={styles.itemName}>{category.name}</span>
                </div>
                <div className={styles.itemActions}>
                  <button
                    className={`${styles.actionBtn} ${styles.actionBtnEdit}`}
                    onClick={() => openEdit(category)}
                  >
                    Editar
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                    onClick={() => handleDeleteRequest(category)}
                    disabled={deleteCategory.isPending}
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isPanelOpen && (
        <div
          className={styles.panelOverlay}
          onClick={closePanel}
        />
      )}
      <div className={`${styles.panel} ${isPanelOpen ? styles.panelVisible : ''}`}>
        {!isCreating && selected === null ? (
          <div className={styles.panelEmpty}>
            <span className={styles.panelEmptyIcon}>📂</span>
            <p className={styles.panelEmptyTitle}>Ninguna categoría seleccionada</p>
            <p className={styles.panelEmptyDesc}>
              Seleccioná una categoría para editarla, o creá una nueva.
            </p>
            <button className={styles.createButton} onClick={openCreate}>
              + Nueva categoría
            </button>
          </div>
        ) : isCreating ? (
          <>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Nueva categoría</h2>
              <button className={styles.closeButton} onClick={closePanel}>✕</button>
            </div>

            <form onSubmit={handleCreateSubmit} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Nombre *</label>
                <input
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={styles.input}
                  placeholder="Ej: Cervezas"
                  disabled={isSaving}
                  required
                />
              </div>

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
                  {isSaving ? 'Guardando...' : 'Crear categoría'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Editar categoría</h2>
              <button className={styles.closeButton} onClick={closePanel}>✕</button>
            </div>

            <form onSubmit={handleEditSubmit} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Nombre *</label>
                <input
                  name="editName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={styles.input}
                  placeholder="Ej: Cervezas"
                  disabled={isSaving}
                  required
                />
              </div>

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
                  {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      {categoryToDelete && (
        <ConfirmModal
          title="Eliminar categoría"
          message={`¿Eliminar "${categoryToDelete.name}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          isDanger={true}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </div>
  )
}

export default CategoriesPage
