import { useState, useEffect } from 'react'
import { useStoreConfig, useUpdateStoreConfig } from '../hooks/useStoreConfig'
import styles from './SettingsPage.module.css'

// ─── Store Info Section ───────────────────────────────────────────────────────

interface StoreInfoForm {
  store_name: string
  address: string
  whatsapp_number: string
  business_hours_open: string
  business_hours_close: string
  show_prices: boolean
  instagram_url: string
  logo_url: string
}

function StoreInfoSection() {
  const { data: config, isLoading } = useStoreConfig()
  const updateConfig = useUpdateStoreConfig()

  const [form, setForm] = useState<StoreInfoForm>({
    store_name: '',
    address: '',
    whatsapp_number: '',
    business_hours_open: '10:00',
    business_hours_close: '23:00',
    show_prices: true,
    instagram_url: '',
    logo_url: '',
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!config) return
    setForm({
      store_name: config.store_name,
      address: config.address,
      whatsapp_number: config.whatsapp_number,
      business_hours_open: config.business_hours_open,
      business_hours_close: config.business_hours_close,
      show_prices: config.show_prices,
      instagram_url: config.instagram_url ?? '',
      logo_url: config.logo_url ?? '',
    })
  }, [config])

  const handleField = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    setSaved(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)

    const payload = {
      store_name: form.store_name.trim(),
      address: form.address.trim(),
      whatsapp_number: form.whatsapp_number.trim(),
      business_hours_open: form.business_hours_open,
      business_hours_close: form.business_hours_close,
      show_prices: form.show_prices,
      instagram_url: form.instagram_url.trim() || null,
      logo_url: form.logo_url.trim() || null,
    }

    try {
      await updateConfig.mutateAsync(payload)
      setSaved(true)
    } catch {
      setError('Error al guardar. Intentá de nuevo.')
    }
  }

  if (isLoading) return <p className={styles.loadingText}>Cargando...</p>

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Información del local</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Nombre del local</label>
            <input name="store_name" value={form.store_name} onChange={handleField}
              className={styles.input} required disabled={updateConfig.isPending} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>WhatsApp (con código de país)</label>
            <input name="whatsapp_number" value={form.whatsapp_number} onChange={handleField}
              className={styles.input} placeholder="5491100000000" required
              disabled={updateConfig.isPending} />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Dirección</label>
          <input name="address" value={form.address} onChange={handleField}
            className={styles.input} required disabled={updateConfig.isPending} />
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Horario apertura</label>
            <input name="business_hours_open" type="time" value={form.business_hours_open}
              onChange={handleField} className={styles.input} required
              disabled={updateConfig.isPending} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Horario cierre</label>
            <input name="business_hours_close" type="time" value={form.business_hours_close}
              onChange={handleField} className={styles.input} required
              disabled={updateConfig.isPending} />
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Instagram (opcional)</label>
            <input name="instagram_url" type="url" value={form.instagram_url}
              onChange={handleField} className={styles.input} placeholder="https://instagram.com/..."
              disabled={updateConfig.isPending} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>URL del logo (opcional)</label>
            <input name="logo_url" type="url" value={form.logo_url}
              onChange={handleField} className={styles.input} placeholder="https://..."
              disabled={updateConfig.isPending} />
          </div>
        </div>

        <label className={styles.checkboxLabel}>
          <input name="show_prices" type="checkbox" checked={form.show_prices}
            onChange={handleField} disabled={updateConfig.isPending} />
          Mostrar precios en el catálogo público
        </label>

        {error && <p className={styles.errorText} role="alert">{error}</p>}
        {saved && <p className={styles.successText}>Cambios guardados.</p>}

        <div className={styles.formActions}>
          <button type="submit" className={styles.saveButton} disabled={updateConfig.isPending}>
            {updateConfig.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </section>
  )
}

// ─── Delivery Section ─────────────────────────────────────────────────────────

interface DeliveryForm {
  is_enabled: boolean
  delivery_hours_open: string
  delivery_hours_close: string
  cost: string
  minimum_order: string
  coverage_zones: string
}

function DeliverySection() {
  const { data: config, isLoading } = useStoreConfig()
  const updateConfig = useUpdateStoreConfig()

  const [form, setForm] = useState<DeliveryForm>({
    is_enabled: false,
    delivery_hours_open: '18:00',
    delivery_hours_close: '23:00',
    cost: '0',
    minimum_order: '0',
    coverage_zones: '',
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!config) return
    setForm({
      is_enabled: config.delivery_enabled,
      delivery_hours_open: config.delivery_hours_open,
      delivery_hours_close: config.delivery_hours_close,
      cost: String(config.delivery_cost),
      minimum_order: String(config.delivery_minimum_order),
      coverage_zones: config.delivery_coverage_zones.join(', '),
    })
  }, [config])

  const handleField = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    setSaved(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)

    const payload = {
      delivery_enabled: form.is_enabled,
      delivery_hours_open: form.delivery_hours_open,
      delivery_hours_close: form.delivery_hours_close,
      delivery_cost: Number(form.cost),
      delivery_minimum_order: Number(form.minimum_order),
      delivery_coverage_zones: form.coverage_zones
        .split(',')
        .map((z) => z.trim())
        .filter(Boolean),
    }

    try {
      await updateConfig.mutateAsync(payload)
      setSaved(true)
    } catch {
      setError('Error al guardar. Intentá de nuevo.')
    }
  }

  if (isLoading) return <p className={styles.loadingText}>Cargando...</p>

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Delivery</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.checkboxLabel}>
          <input name="is_enabled" type="checkbox" checked={form.is_enabled}
            onChange={handleField} disabled={updateConfig.isPending} />
          Habilitar delivery
        </label>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Horario inicio delivery</label>
            <input name="delivery_hours_open" type="time" value={form.delivery_hours_open}
              onChange={handleField} className={styles.input} required
              disabled={updateConfig.isPending} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Horario fin delivery</label>
            <input name="delivery_hours_close" type="time" value={form.delivery_hours_close}
              onChange={handleField} className={styles.input} required
              disabled={updateConfig.isPending} />
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Costo de envío ($)</label>
            <input name="cost" type="number" min="0" value={form.cost}
              onChange={handleField} className={styles.input} required
              disabled={updateConfig.isPending} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Monto mínimo ($)</label>
            <input name="minimum_order" type="number" min="0" value={form.minimum_order}
              onChange={handleField} className={styles.input} required
              disabled={updateConfig.isPending} />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Zonas de cobertura (separadas por coma)</label>
          <input name="coverage_zones" value={form.coverage_zones} onChange={handleField}
            className={styles.input} placeholder="Lomas de Zamora, Banfield, Temperley"
            disabled={updateConfig.isPending} />
          <span className={styles.hint}>Dejá vacío si no querés restringir por zona.</span>
        </div>

        {error && <p className={styles.errorText} role="alert">{error}</p>}
        {saved && <p className={styles.successText}>Cambios guardados.</p>}

        <div className={styles.formActions}>
          <button type="submit" className={styles.saveButton} disabled={updateConfig.isPending}>
            {updateConfig.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function SettingsPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Configuración</h1>
      <StoreInfoSection />
      <DeliverySection />
    </div>
  )
}

export default SettingsPage
