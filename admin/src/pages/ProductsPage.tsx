import { useState, useEffect } from 'react'
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useUploadProductImage,
} from '../hooks/useProducts'
import { useCategories } from '../hooks/useCategories'
import type { ProductType } from '@shared/types/index'
import ConfirmModal from '../components/ConfirmModal'
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
  }
}

function ProductsPage() {
  const MAX_FEATURED_PRODUCTS = 4

  const { data: products, isLoading } = useProducts()
  const { data: categories } = useCategories()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()
  const uploadImage = useUploadProductImage()

  const [selected, setSelected] = useState<ProductType | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState<ProductFormData>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [productToDelete, setProductToDelete] = useState<ProductType | null>(null)
  const [searchName, setSearchName] = useState('')
  const [searchCategoryId, setSearchCategoryId] = useState('')

  const isPanelActive = isCreating || selected !== null
  const isMobile = useIsMobile()

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

  const closePanel = () => {
    setSelected(null)
    setIsCreating(false)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!form.name.trim()) { setFormError('El nombre es obligatorio.'); return }
    if (!form.category_id) { setFormError('Seleccioná una categoría.'); return }

    if (form.is_featured) {
      const featuredCount = (products ?? []).filter(
        (p) => p.is_featured && p.id !== selected?.id
      ).length
      if (featuredCount >= MAX_FEATURED_PRODUCTS) {
        setFormError(
          `Solo podés tener hasta ${MAX_FEATURED_PRODUCTS} productos destacados en simultáneo.`
        )
        return
      }
    }

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
      }

      if (isCreating) {
        await createProduct.mutateAsync(payload)
      } else if (selected) {
        await updateProduct.mutateAsync({ id: selected.id, payload })
      }
      closePanel()
    } catch {
      setFormError('Ocurrió un error al guardar. Intentá de nuevo.')
    }
  }

  const handleToggleActive = async (product: ProductType, e: React.MouseEvent) => {
    e.stopPropagation()
    if (updateProduct.isPending) return
    await updateProduct.mutateAsync({
      id: product.id,
      payload: { is_active: !product.is_active },
    })
  }

  const handleDeleteRequest = (product: ProductType, e: React.MouseEvent) => {
    e.stopPropagation()
    setProductToDelete(product)
  }

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return
    await deleteProduct.mutateAsync(productToDelete.id)
    if (selected?.id === productToDelete.id) closePanel()
    setProductToDelete(null)
  }

  const handleDeleteCancel = () => setProductToDelete(null)

  const isSaving = createProduct.isPending || updateProduct.isPending || uploadImage.isPending

  const filteredProducts = (products ?? []).filter((p) => {
    const matchesName = p.name.toLowerCase().includes(searchName.toLowerCase().trim())
    const matchesCategory = searchCategoryId === '' || p.category_id === searchCategoryId
    return matchesName && matchesCategory
  })

  return (
    <div className={styles.page}>
      {/* Lista */}
      <div className={styles.listColumn}>
        <div className={styles.listHeader}>
          <h1 className={styles.title}>Productos</h1>
          {!isPanelActive && isMobile && (
            <button className={styles.createButton} onClick={openCreate}>
              + Nuevo producto
            </button>
          )}
        </div>

        <div className={styles.searchBar}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar por nombre..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
          <select
            className={styles.searchSelect}
            value={searchCategoryId}
            onChange={(e) => setSearchCategoryId(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <p className={styles.loadingText}>Cargando productos...</p>
        ) : !products?.length ? (
          <p className={styles.emptyText}>No hay productos todavía.</p>
        ) : filteredProducts.length === 0 ? (
          <p className={styles.emptyText}>No hay productos que coincidan con la búsqueda.</p>
        ) : (
          <ul className={styles.list}>
            {filteredProducts.map((product) => (
              <li
                key={product.id}
                className={`${styles.item} ${
                  selected?.id === product.id ? styles.itemSelected : ''
                } ${!product.is_active ? styles.itemInactive : ''}`}
                onClick={() => openEdit(product)}
              >
                <div className={styles.itemMain}>
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className={styles.itemThumb}
                    />
                  )}
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{product.name}</span>
                    <span className={styles.itemMeta}>
                      {categories?.find((c) => c.id === product.category_id)?.name ?? '—'}
                      {product.price != null && ` · $${product.price}`}
                      {product.is_featured && (
                        <span className={styles.featuredTag}>Destacado</span>
                      )}
                    </span>
                  </div>
                  <span
                    className={`${styles.activeBadge} ${
                      product.is_active ? styles.activeBadgeOn : styles.activeBadgeOff
                    }`}
                  >
                    {product.is_active ? 'Activo' : 'Pausado'}
                  </span>
                </div>

                <div className={styles.itemActions}>
                  <button
                    className={`${styles.actionBtn} ${
                      product.is_active ? styles.actionBtnPause : styles.actionBtnActivate
                    }`}
                    onClick={(e) => handleToggleActive(product, e)}
                    disabled={updateProduct.isPending}
                  >
                    {product.is_active ? 'Pausar' : 'Activar'}
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                    onClick={(e) => handleDeleteRequest(product, e)}
                    disabled={deleteProduct.isPending}
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Panel lateral — siempre visible */}
      {isPanelActive && isMobile && (
        <div
          className={styles.overlay}
          onClick={closePanel}
        />
      )}
      <div className={`${styles.panel} ${isPanelActive && isMobile ? styles.panelVisible : ''}`}>
        {!isPanelActive ? (
          <div className={styles.panelEmpty}>
            <span className={styles.panelEmptyIcon}>📦</span>
            <p className={styles.panelEmptyTitle}>Ningún producto seleccionado</p>
            <p className={styles.panelEmptyDesc}>
              Seleccioná un producto de la lista para editarlo, o creá uno nuevo.
            </p>
            <button className={styles.createButton} onClick={openCreate}>
              + Nuevo producto
            </button>
          </div>
        ) : (
          <>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                {isCreating ? 'Nuevo producto' : 'Editar producto'}
              </h2>
              <button className={styles.closeButton} onClick={closePanel}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
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
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Imagen del producto</label>
                {(form.imageFile || form.image_url) && (
                  <img
                    src={form.imageFile ? URL.createObjectURL(form.imageFile) : form.image_url}
                    alt="Preview"
                    className={styles.imagePreview}
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageFile}
                  disabled={isSaving}
                  className={styles.inputFile}
                />
                {uploadImage.isPending && (
                  <p className={styles.uploadingText}>Subiendo imagen...</p>
                )}
              </div>

              <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    name="is_active"
                    type="checkbox"
                    checked={form.is_active}
                    onChange={handleField}
                    disabled={isSaving}
                  />
                  Producto activo
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    name="is_featured"
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={handleField}
                    disabled={isSaving}
                  />
                  Producto destacado
                </label>
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
                  {isSaving ? 'Guardando...' : isCreating ? 'Crear producto' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      {productToDelete && (
        <ConfirmModal
          title="Eliminar producto"
          message={`¿Eliminar "${productToDelete.name}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          isDanger={true}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
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

export default ProductsPage
