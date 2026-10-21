import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useUploadProductImage,
} from '../hooks/useProducts'
import { useCategories } from '../hooks/useCategories'
import type { ProductType } from '@jaby/shared'
import ConfirmModal from '../components/ConfirmModal'
import {
  PauseIcon,
  PlayIcon,
  StarIcon,
  PlusIcon,
  CloseIcon,
  EditIcon,
  ImageIcon,
  TrashIcon,
  AlertIcon,
} from '../components/icons'
import styles from './ProductsPage.module.css'

interface ProductFormData {
  name: string
  description: string
  price: string
  category_id: string
  image_url: string
  imageFile: File | null
  is_active: boolean
  is_featured: boolean
  is_out_of_stock: boolean
}

const EMPTY_FORM: ProductFormData = {
  name: '',
  description: '',
  price: '',
  category_id: '',
  image_url: '',
  imageFile: null,
  is_active: true,
  is_featured: false,
  is_out_of_stock: false,
}

function productToForm(p: ProductType): ProductFormData {
  return {
    name: p.name,
    description: p.description ?? '',
    price: p.price != null ? String(p.price) : '',
    category_id: p.category_id,
    image_url: p.image_url ?? '',
    imageFile: null,
    is_active: p.is_active,
    is_featured: p.is_featured,
    is_out_of_stock: p.is_out_of_stock,
  }
}

type StatusFilter = 'all' | 'active' | 'paused' | 'out_of_stock'

const formatPrice = (price: number | null | undefined): string =>
  price == null ? '' : `$${price.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`

function ProductsPage() {
  const MAX_FEATURED_PRODUCTS = 6

  const { data: products, isLoading } = useProducts()
  const { data: categories } = useCategories()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()
  const uploadImage = useUploadProductImage()
  const [searchParams, setSearchParams] = useSearchParams()

  const [selected, setSelected] = useState<ProductType | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState<ProductFormData>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [productToDelete, setProductToDelete] = useState<ProductType | null>(null)
  const [productToPause, setProductToPause] = useState<ProductType | null>(null)
  const [confirmPauseOnSave, setConfirmPauseOnSave] = useState(false)
  const [searchName, setSearchName] = useState('')
  const [searchCategoryId, setSearchCategoryId] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    searchParams.get('filter') === 'out_of_stock' ? 'out_of_stock' : 'all'
  )
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const isDialogOpen = isCreating || selected !== null

  const showToast = (message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const openCreate = () => {
    setSelected(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setIsCreating(true)
  }

  const openEdit = (product: ProductType) => {
    setIsCreating(false)
    setForm(productToForm(product))
    setFormError(null)
    setSelected(product)
  }

  const closeDialog = () => {
    setSelected(null)
    setIsCreating(false)
    setForm(EMPTY_FORM)
    setFormError(null)
    setConfirmPauseOnSave(false)
  }

  // Esc cierra la ventana (si no hay un modal de confirmación encima)
  useEffect(() => {
    if (!isDialogOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !productToDelete && !confirmPauseOnSave) closeDialog()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isDialogOpen, productToDelete, confirmPauseOnSave])

  const imagePreview = useMemo(
    () => (form.imageFile ? URL.createObjectURL(form.imageFile) : form.image_url),
    [form.imageFile, form.image_url]
  )
  useEffect(() => {
    return () => {
      if (form.imageFile && imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [form.imageFile, imagePreview])

  const handleField = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setFormError('El archivo debe ser una imagen.')
      return
    }
    setForm((prev) => ({ ...prev, imageFile: file }))
    setFormError(null)
  }

  const featuredOthers = (products ?? []).filter(
    (p) => p.is_featured && p.id !== selected?.id
  ).length
  const featuredLimitReached = featuredOthers >= MAX_FEATURED_PRODUCTS

  const saveForm = async () => {
    setFormError(null)
    try {
      let finalImageUrl = form.image_url || undefined
      if (form.imageFile) {
        finalImageUrl = await uploadImage.mutateAsync(form.imageFile)
      }

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: form.price !== '' ? Number(form.price) : undefined,
        category_id: form.category_id,
        image_url: finalImageUrl,
        is_active: form.is_active,
        is_featured: form.is_featured,
        is_out_of_stock: form.is_out_of_stock,
      }

      if (isCreating) {
        await createProduct.mutateAsync(payload)
      } else if (selected) {
        await updateProduct.mutateAsync({ id: selected.id, payload })
      }
      closeDialog()
    } catch {
      setFormError('Ocurrió un error al guardar. Intentá de nuevo.')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!form.name.trim()) {
      setFormError('El nombre es obligatorio.')
      return
    }
    if (!form.category_id) {
      setFormError('Seleccioná una categoría.')
      return
    }

    if (form.is_featured && featuredLimitReached) {
      setFormError(
        `Solo podés tener hasta ${MAX_FEATURED_PRODUCTS} productos destacados en simultáneo.`
      )
      return
    }

    // Pausar un producto activo desde el formulario también pide confirmación
    if (!isCreating && selected?.is_active && !form.is_active) {
      setConfirmPauseOnSave(true)
      return
    }

    void saveForm()
  }

  const handleToggleActive = (product: ProductType, e: React.MouseEvent) => {
    e.stopPropagation()
    if (updateProduct.isPending) return
    if (product.is_active) {
      // Pausar pide confirmación para evitar pausas accidentales
      setProductToPause(product)
      return
    }
    void setActive(product, true)
  }

  const setActive = async (product: ProductType, isActive: boolean) => {
    try {
      await updateProduct.mutateAsync({
        id: product.id,
        payload: { is_active: isActive },
      })
      showToast(isActive ? `"${product.name}" ya está activo.` : `"${product.name}" quedó pausado.`)
    } catch {
      showToast('No se pudo cambiar el estado del producto. Intentá de nuevo.')
    }
  }

  const handlePauseConfirm = async () => {
    if (!productToPause) return
    const product = productToPause
    setProductToPause(null)
    await setActive(product, false)
  }

  const handleToggleFeatured = async (product: ProductType, e: React.MouseEvent) => {
    e.stopPropagation()
    if (updateProduct.isPending) return
    if (!product.is_featured) {
      const count = (products ?? []).filter((p) => p.is_featured).length
      if (count >= MAX_FEATURED_PRODUCTS) {
        showToast(
          `Solo podés tener hasta ${MAX_FEATURED_PRODUCTS} productos destacados en simultáneo.`
        )
        return
      }
    }
    try {
      await updateProduct.mutateAsync({
        id: product.id,
        payload: { is_featured: !product.is_featured },
      })
    } catch {
      showToast('No se pudo cambiar el destacado. Intentá de nuevo.')
    }
  }

  const handleDeleteRequest = (product: ProductType, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setProductToDelete(product)
  }

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return
    try {
      await deleteProduct.mutateAsync(productToDelete.id)
      if (selected?.id === productToDelete.id) closeDialog()
      setProductToDelete(null)
    } catch {
      showToast('Error al eliminar el producto. Intentá de nuevo.')
      setProductToDelete(null)
    }
  }

  const isSaving = createProduct.isPending || updateProduct.isPending || uploadImage.isPending

  const all = products ?? []
  const counts = {
    all: all.length,
    active: all.filter((p) => p.is_active).length,
    paused: all.filter((p) => !p.is_active).length,
    out_of_stock: all.filter((p) => p.is_out_of_stock).length,
  }

  const statusOptions: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'active', label: 'Activos' },
    { key: 'paused', label: 'Pausados' },
    { key: 'out_of_stock', label: 'Agotados' },
  ]

  const changeStatusFilter = (key: StatusFilter) => {
    setStatusFilter(key)
    if (searchParams.get('filter')) setSearchParams({})
  }

  const filteredProducts = all.filter((p) => {
    const matchesName = p.name.toLowerCase().includes(searchName.toLowerCase().trim())
    const matchesCategory = searchCategoryId === '' || p.category_id === searchCategoryId
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && p.is_active) ||
      (statusFilter === 'paused' && !p.is_active) ||
      (statusFilter === 'out_of_stock' && p.is_out_of_stock)
    return matchesName && matchesCategory && matchesStatus
  })

  const categoryName = (id: string) => categories?.find((c) => c.id === id)?.name ?? '—'

  return (
    <div className={styles.page}>
      {/* Barra superior fija */}
      <div className={styles.filtersWrapper}>
        <div className={styles.filtersTop}>
          <label className={styles.searchBox}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar por nombre..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </label>

          <span className={styles.filterLabel}>Estado</span>
          <div className={styles.statusGroup}>
            {statusOptions.map((o) => (
              <button
                key={o.key}
                type="button"
                className={`${styles.chip} ${statusFilter === o.key ? styles.chipActive : ''}`}
                onClick={() => changeStatusFilter(o.key)}
              >
                {o.label}
                <span className={styles.chipCount}>{counts[o.key]}</span>
              </button>
            ))}
          </div>

          <button className={styles.createButton} onClick={openCreate}>
            <PlusIcon size={16} />
            Nuevo producto
          </button>
        </div>

        <div className={`${styles.chipRow} ${styles.categoryRow}`}>
          <button
            type="button"
            className={`${styles.chip} ${searchCategoryId === '' ? styles.chipActive : ''}`}
            onClick={() => setSearchCategoryId('')}
          >
            Todas las categorías
          </button>
          {categories?.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`${styles.chip} ${searchCategoryId === c.id ? styles.chipActive : ''}`}
              onClick={() => setSearchCategoryId(searchCategoryId === c.id ? '' : c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <p className={styles.loadingText}>Cargando productos...</p>
      ) : !products?.length ? (
        <p className={styles.emptyText}>No hay productos todavía.</p>
      ) : filteredProducts.length === 0 ? (
        <p className={styles.emptyText}>No hay productos que coincidan con los filtros.</p>
      ) : (
        <ul className={styles.list}>
          {filteredProducts.map((product) => (
            <li
              key={product.id}
              className={`${styles.card} ${!product.is_active ? styles.cardInactive : ''}`}
              onClick={() => openEdit(product)}
            >
              <div className={styles.cardImageWrap}>
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className={styles.cardImage}
                    loading="lazy"
                  />
                ) : (
                  <span className={styles.cardImagePlaceholder}>
                    <ImageIcon size={32} />
                  </span>
                )}
                <button
                  type="button"
                  className={`${styles.starButton} ${product.is_featured ? styles.starButtonOn : ''}`}
                  onClick={(e) => handleToggleFeatured(product, e)}
                  title={product.is_featured ? 'Quitar de destacados' : 'Marcar como destacado'}
                  aria-label={
                    product.is_featured ? 'Quitar de destacados' : 'Marcar como destacado'
                  }
                >
                  <StarIcon size={16} filled={product.is_featured} />
                </button>
                {!product.is_active && <span className={styles.pausedRibbon}>Pausado</span>}
              </div>

              <div className={styles.cardBody}>
                <span className={styles.cardName} title={product.name}>
                  {product.name}
                </span>
                <span className={styles.cardCategory}>{categoryName(product.category_id)}</span>
                <div className={styles.cardTags}>
                  <span className={styles.cardPrice}>
                    {product.price != null ? formatPrice(product.price) : 'Sin precio'}
                  </span>
                  {product.is_out_of_stock && <span className={styles.tagOut}>Agotado</span>}
                  {product.is_featured && <span className={styles.tagFeatured}>Destacado</span>}
                </div>
              </div>

              <div className={styles.cardFooter}>
                <button
                  className={`${styles.iconBtn} ${
                    product.is_active ? styles.iconBtnPause : styles.iconBtnActivate
                  }`}
                  onClick={(e) => handleToggleActive(product, e)}
                  disabled={updateProduct.isPending}
                  title={product.is_active ? 'Pausar' : 'Activar'}
                >
                  {product.is_active ? <PauseIcon size={15} /> : <PlayIcon size={15} />}
                  {product.is_active ? 'Pausar' : 'Activar'}
                </button>
                <button
                  className={styles.iconBtn}
                  onClick={(e) => {
                    e.stopPropagation()
                    openEdit(product)
                  }}
                  title="Editar"
                  aria-label="Editar"
                >
                  <EditIcon size={15} />
                </button>
                <button
                  className={`${styles.iconBtn} ${styles.iconBtnDelete}`}
                  onClick={(e) => handleDeleteRequest(product, e)}
                  disabled={deleteProduct.isPending}
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

      {/* Ventana centrada de edición / creación */}
      {isDialogOpen &&
        createPortal(
          <>
            <div className={styles.overlay} onClick={closeDialog} />
            <form className={styles.dialog} onSubmit={handleSubmit} role="dialog" aria-modal="true">
              <div className={styles.dialogHeader}>
                <h2 className={styles.dialogTitle}>
                  {isCreating ? 'Nuevo producto' : 'Editar producto'}
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
                <div className={styles.imageCol}>
                  <div className={styles.imageBox}>
                    {imagePreview ? (
                      <img src={imagePreview} alt="Vista previa" className={styles.imagePreview} />
                    ) : (
                      <span className={styles.imageEmpty}>
                        <ImageIcon size={36} />
                        Sin imagen
                      </span>
                    )}
                  </div>
                  <label className={styles.fileButton}>
                    {imagePreview ? 'Cambiar imagen' : 'Subir imagen'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFile}
                      disabled={isSaving}
                      className={styles.fileInput}
                    />
                  </label>
                  {form.imageFile && <span className={styles.fileName}>{form.imageFile.name}</span>}
                  {uploadImage.isPending && (
                    <p className={styles.uploadingText}>Subiendo imagen...</p>
                  )}
                </div>

                <div className={styles.fieldsCol}>
                  <div className={styles.field}>
                    <label className={styles.label}>Nombre *</label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleField}
                      className={styles.input}
                      placeholder="Ej: Cerveza Quilmes 1L"
                      disabled={isSaving}
                      required
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Descripción</label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleField}
                      className={styles.textarea}
                      placeholder="Descripción breve del producto"
                      rows={2}
                      disabled={isSaving}
                    />
                  </div>

                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Precio</label>
                      <input
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={handleField}
                        className={styles.input}
                        placeholder="0"
                        disabled={isSaving}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Categoría *</label>
                      <select
                        name="category_id"
                        value={form.category_id}
                        onChange={handleField}
                        className={styles.select}
                        disabled={isSaving}
                        required
                      >
                        <option value="">Seleccionar</option>
                        {categories?.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className={styles.toggleList}>
                    <label className={styles.toggleRow}>
                      <span>
                        <strong>Producto activo</strong>
                        <small>Si está pausado, no se muestra en la tienda.</small>
                      </span>
                      <input
                        name="is_active"
                        type="checkbox"
                        className={styles.switch}
                        checked={form.is_active}
                        onChange={handleField}
                        disabled={isSaving}
                      />
                    </label>
                    <label className={styles.toggleRow}>
                      <span>
                        <strong>Destacado</strong>
                        <small>
                          Aparece en el carrusel de la tienda (
                          {featuredOthers + (form.is_featured ? 1 : 0)}/{MAX_FEATURED_PRODUCTS}).
                        </small>
                      </span>
                      <input
                        name="is_featured"
                        type="checkbox"
                        className={styles.switch}
                        checked={form.is_featured}
                        onChange={handleField}
                        disabled={isSaving || (featuredLimitReached && !form.is_featured)}
                      />
                    </label>
                    <label className={styles.toggleRow}>
                      <span>
                        <strong>Agotado</strong>
                        <small>Se muestra en la tienda pero no se puede pedir.</small>
                      </span>
                      <input
                        name="is_out_of_stock"
                        type="checkbox"
                        className={styles.switch}
                        checked={form.is_out_of_stock}
                        onChange={handleField}
                        disabled={isSaving}
                      />
                    </label>
                    {featuredLimitReached && !form.is_featured && (
                      <p className={styles.hintWarning}>
                        Ya hay {MAX_FEATURED_PRODUCTS} productos destacados. Quitá uno para poder
                        destacar este.
                      </p>
                    )}
                  </div>

                  {formError && (
                    <p className={styles.formError} role="alert">
                      <AlertIcon size={16} />
                      {formError}
                    </p>
                  )}
                </div>
              </div>

              <div className={styles.dialogFooter}>
                {!isCreating && selected && (
                  <button
                    type="button"
                    className={styles.deleteButton}
                    aria-label="Eliminar producto"
                    onClick={() => handleDeleteRequest(selected)}
                    disabled={isSaving}
                  >
                    <TrashIcon size={16} />
                    <span className={styles.deleteLabel}>Eliminar</span>
                  </button>
                )}
                <span className={styles.footerSpacer} />
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={closeDialog}
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.saveButton} disabled={isSaving}>
                  {isSaving ? 'Guardando...' : isCreating ? 'Crear producto' : 'Guardar cambios'}
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

      {productToPause && (
        <ConfirmModal
          title="Pausar producto"
          message={`¿Pausar "${productToPause.name}"? Dejará de verse en la tienda hasta que lo actives de nuevo.`}
          confirmLabel="Pausar"
          isWarning={true}
          onConfirm={handlePauseConfirm}
          onCancel={() => setProductToPause(null)}
        />
      )}

      {confirmPauseOnSave && (
        <ConfirmModal
          title="Pausar producto"
          message={`Vas a guardar "${form.name.trim() || selected?.name}" como pausado. Dejará de verse en la tienda hasta que lo actives de nuevo.`}
          confirmLabel="Pausar y guardar"
          isWarning={true}
          onConfirm={() => {
            setConfirmPauseOnSave(false)
            void saveForm()
          }}
          onCancel={() => setConfirmPauseOnSave(false)}
        />
      )}

      {productToDelete && (
        <ConfirmModal
          title="Eliminar producto"
          message={`¿Eliminar "${productToDelete.name}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          isDanger={true}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setProductToDelete(null)}
        />
      )}
    </div>
  )
}

export default ProductsPage
