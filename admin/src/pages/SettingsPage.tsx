import { useState, useEffect } from 'react'
import { useStoreConfig, useUpdateStoreConfig } from '../hooks/useStoreConfig'
import { useBanner, useUpdateBanner } from '../hooks/useBanner'
import ConfirmModal from '../components/ConfirmModal'
import CoverageZoneModal from '../components/CoverageZoneModal'
import { CheckCircleIcon, ChatIcon, ClockIcon, CloseIcon, PlusIcon, ScooterIcon, StoreIcon, AlertIcon } from '../components/icons'
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
  tiktok_username: string
  neighborhood: string
  municipality: string
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
    tiktok_username: '',
    neighborhood: '',
    municipality: '',
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
      tiktok_username: config.tiktok_username ?? '',
      neighborhood: config.neighborhood ?? '',
      municipality: config.municipality ?? '',
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
      // Solo dígitos: los links de wa.me se arman con toWhatsAppNumber
      whatsapp_number: form.whatsapp_number.replace(/\D/g, ''),
      business_hours_open: form.business_hours_open,
      business_hours_close: form.business_hours_close,
      show_prices: form.show_prices,
      instagram_url: form.instagram_url.trim(),
      tiktok_username: form.tiktok_username.trim() || null,
      neighborhood: form.neighborhood.trim() || null,
      municipality: form.municipality.trim() || null,
    }

    try {
      await updateConfig.mutateAsync(payload)
      setSaved(true)
    } catch {
      setError('Error al guardar. Intentá de nuevo.')
    }
  }

  if (isLoading) return <p className={styles.loadingText}>Cargando...</p>

  const busy = updateConfig.isPending

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <span className={styles.sectionIcon}><StoreIcon size={20} /></span>
        <div>
          <h2 className={styles.sectionTitle}>Información del local</h2>
          <p className={styles.sectionDesc}>Se muestra en la tienda y en el banner de información.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formBody}>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Nombre del local</label>
              <input name="store_name" value={form.store_name} onChange={handleField}
                className={styles.input} required disabled={busy} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>WhatsApp</label>
              <input name="whatsapp_number" value={form.whatsapp_number} onChange={handleField}
                className={styles.input} placeholder="1122334455" required disabled={busy} />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Dirección</label>
            <input name="address" value={form.address} onChange={handleField}
              className={styles.input} required disabled={busy} />
          </div>

          <div className={`${styles.fieldRow} ${styles.fieldRowCompact}`}>
            <div className={styles.field}>
              <label className={styles.label}>Barrio</label>
              <input name="neighborhood" value={form.neighborhood} onChange={handleField}
                className={styles.input} disabled={busy} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Municipio</label>
              <input name="municipality" value={form.municipality} onChange={handleField}
                className={styles.input} disabled={busy} />
            </div>
          </div>

          <div className={styles.group}>
            <span className={styles.groupTitle}><ClockIcon size={14} /> Horario de atención</span>
            <div className={`${styles.fieldRow} ${styles.fieldRowCompact}`}>
              <div className={styles.field}>
                <label className={styles.label}>Apertura</label>
                <input name="business_hours_open" type="time" value={form.business_hours_open}
                  onChange={handleField} className={styles.input} required disabled={busy} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Cierre</label>
                <input name="business_hours_close" type="time" value={form.business_hours_close}
                  onChange={handleField} className={styles.input} required disabled={busy} />
              </div>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Instagram</label>
              <input name="instagram_url" type="url" value={form.instagram_url}
                onChange={handleField} className={styles.input}
                placeholder="https://instagram.com/tulocal" required disabled={busy} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Usuario de TikTok</label>
              <input name="tiktok_username" value={form.tiktok_username}
                onChange={handleField} className={styles.input} placeholder="@tulocal" disabled={busy} />
            </div>
          </div>

          <label className={styles.toggleRow}>
            <span>
              <strong>Mostrar precios en el catálogo público</strong>
              <small>Si lo desactivás, los clientes no ven los precios.</small>
            </span>
            <input name="show_prices" type="checkbox" className={styles.switch}
              checked={form.show_prices} onChange={handleField} disabled={busy} />
          </label>
        </div>

        <div className={`${styles.formFooter} ${styles.footerLeft}`}>
          <div className={styles.status}>
            {error && (
              <span className={styles.errorText} role="alert"><AlertIcon size={16} />{error}</span>
            )}
            {saved && (
              <span className={styles.successText}><CheckCircleIcon size={16} />Cambios guardados</span>
            )}
          </div>
          <button type="submit" className={styles.saveButton} disabled={busy}>
            {busy ? 'Guardando...' : 'Guardar cambios'}
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
  coverage_zones: string[]
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
    coverage_zones: [],
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false)
  const [zoneToDelete, setZoneToDelete] = useState<string | null>(null)

  useEffect(() => {
    if (!config) return
    setForm({
      is_enabled: config.delivery_enabled,
      delivery_hours_open: config.delivery_hours_open,
      delivery_hours_close: config.delivery_hours_close,
      cost: String(config.delivery_cost),
      minimum_order: String(config.delivery_minimum_order),
      coverage_zones: config.delivery_coverage_zones,
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
      delivery_coverage_zones: form.coverage_zones,
    }

    try {
      await updateConfig.mutateAsync(payload)
      setSaved(true)
    } catch {
      setError('Error al guardar. Intentá de nuevo.')
    }
  }

  if (isLoading) return <p className={styles.loadingText}>Cargando...</p>

  const handleAddZone = (zone: string) => {
    setForm((prev) => ({
      ...prev,
      coverage_zones: [...prev.coverage_zones, zone],
    }))
    setSaved(false)
  }

  const handleDeleteZone = () => {
    if (!zoneToDelete) return
    setForm((prev) => ({
      ...prev,
      coverage_zones: prev.coverage_zones.filter((zone) => zone !== zoneToDelete),
    }))
    setZoneToDelete(null)
    setSaved(false)
  }

  const busy = updateConfig.isPending

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <span className={styles.sectionIcon}><ScooterIcon size={20} /></span>
        <div>
          <h2 className={styles.sectionTitle}>Delivery</h2>
          <p className={styles.sectionDesc}>Horarios, costos y zonas donde llegás.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formBody}>
          <label className={styles.toggleRow}>
            <span>
              <strong>Habilitar delivery</strong>
              <small>Si está apagado, la tienda solo ofrece retiro en el local.</small>
            </span>
            <input name="is_enabled" type="checkbox" className={styles.switch}
              checked={form.is_enabled} onChange={handleField} disabled={busy} />
          </label>

          <div className={`${styles.deliveryFields} ${form.is_enabled ? '' : styles.dimmed}`}>
            <div className={styles.group}>
              <span className={styles.groupTitle}><ClockIcon size={14} /> Horario de delivery</span>
              <div className={`${styles.fieldRow} ${styles.fieldRowCompact}`}>
                <div className={styles.field}>
                  <label className={styles.label}>Inicio</label>
                  <input name="delivery_hours_open" type="time" value={form.delivery_hours_open}
                    onChange={handleField} className={styles.input} required disabled={busy} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Fin</label>
                  <input name="delivery_hours_close" type="time" value={form.delivery_hours_close}
                    onChange={handleField} className={styles.input} required disabled={busy} />
                </div>
              </div>
            </div>

            <div className={`${styles.fieldRow} ${styles.fieldRowCompact}`}>
              <div className={styles.field}>
                <label className={styles.label}>Costo de envío</label>
                <div className={styles.moneyInput}>
                  <span>$</span>
                  <input name="cost" type="number" min="0" value={form.cost}
                    onChange={handleField} required disabled={busy} />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Monto mínimo</label>
                <div className={styles.moneyInput}>
                  <span>$</span>
                  <input name="minimum_order" type="number" min="0" value={form.minimum_order}
                    onChange={handleField} required disabled={busy} />
                </div>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Zonas de cobertura</label>
              <div className={styles.coverageZonesList}>
                {form.coverage_zones.map((zone) => (
                  <span key={zone} className={styles.coverageZoneTag}>
                    {zone}
                    <button
                      type="button"
                      className={styles.coverageZoneRemove}
                      onClick={() => setZoneToDelete(zone)}
                      disabled={busy}
                      aria-label={`Eliminar zona ${zone}`}
                    >
                      <CloseIcon size={12} />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  className={styles.addZoneButton}
                  onClick={() => setIsZoneModalOpen(true)}
                  disabled={busy}
                >
                  <PlusIcon size={13} /> Agregar zona
                </button>
              </div>
              <span className={styles.hint}>
                {form.coverage_zones.length === 0
                  ? 'Sin zonas cargadas: se envía a cualquier zona.'
                  : 'Dejá vacío si no querés restringir por zona.'}
              </span>
            </div>
          </div>
        </div>

        <div className={`${styles.formFooter} ${styles.footerRight}`}>
          <div className={styles.status}>
            {error && (
              <span className={styles.errorText} role="alert"><AlertIcon size={16} />{error}</span>
            )}
            {saved && (
              <span className={styles.successText}><CheckCircleIcon size={16} />Cambios guardados</span>
            )}
          </div>
          <button type="submit" className={styles.saveButton} disabled={busy}>
            {busy ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      {isZoneModalOpen && (
        <CoverageZoneModal
          existingZones={form.coverage_zones}
          isSaving={updateConfig.isPending}
          onConfirm={handleAddZone}
          onClose={() => setIsZoneModalOpen(false)}
        />
      )}

      {zoneToDelete && (
        <ConfirmModal
          title="Eliminar zona de cobertura"
          message={`¿Eliminar "${zoneToDelete}" de las zonas de cobertura?`}
          confirmLabel="Eliminar"
          isDanger={true}
          onConfirm={handleDeleteZone}
          onCancel={() => setZoneToDelete(null)}
        />
      )}
    </section>
  )
}

// ─── Banner Section ───────────────────────────────────────────────────────────

const BANNER_MAX_LENGTH = 120

function BannerSection() {
  const { data: banner, isLoading } = useBanner()
  const updateBanner = useUpdateBanner()

  const [text, setText] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (banner === undefined) return
    setText(banner?.text ?? '')
    setIsActive(banner?.is_active ?? false)
  }, [banner])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)

    const trimmed = text.trim()
    if (isActive && !trimmed) {
      setError('Escribí un mensaje o desactivá el banner.')
      return
    }

    try {
      await updateBanner.mutateAsync({ text: trimmed || null, is_active: isActive })
      setSaved(true)
    } catch {
      setError('Error al guardar. Intentá de nuevo.')
    }
  }

  if (isLoading) return <p className={styles.loadingText}>Cargando...</p>

  const busy = updateBanner.isPending
  const previewText = text.trim()

  return (
    <section className={`${styles.section} ${styles.sectionWide}`}>
      <header className={`${styles.sectionHeader} ${styles.headerCenter}`}>
        <span className={styles.sectionIcon}><ChatIcon size={20} /></span>
        <div>
          <h2 className={styles.sectionTitle}>Banner promocional</h2>
          <p className={styles.sectionDesc}>Mensaje destacado arriba del catálogo de la tienda.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={`${styles.formBody} ${styles.bannerBody}`}>
          <div className={styles.bannerControls}>
          <label className={styles.toggleRow}>
            <span>
              <strong>Mostrar banner</strong>
              <small>Si está apagado, la tienda no muestra ningún mensaje.</small>
            </span>
            <input
              type="checkbox"
              className={styles.switch}
              checked={isActive}
              onChange={(e) => { setIsActive(e.target.checked); setSaved(false) }}
              disabled={busy}
            />
          </label>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="banner-text">Mensaje</label>
            <input
              id="banner-text"
              className={styles.input}
              value={text}
              maxLength={BANNER_MAX_LENGTH}
              onChange={(e) => { setText(e.target.value); setSaved(false) }}
              placeholder="Ej: ¡2x1 en cervezas hasta las 12!"
              disabled={busy}
            />
            <span className={styles.hint}>{text.length}/{BANNER_MAX_LENGTH} caracteres</span>
          </div>
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Así se ve en la tienda</span>
            <div className={`${styles.bannerPreview} ${isActive && previewText ? '' : styles.bannerPreviewOff}`}>
              {previewText || 'Tu mensaje va a aparecer acá'}
            </div>
            {!isActive && (
              <span className={styles.hint}>El banner está apagado: los clientes no lo ven.</span>
            )}
          </div>
        </div>

        <div className={`${styles.formFooter} ${styles.footerCenter}`}>
          <div className={styles.status}>
            {error && (
              <span className={styles.errorText} role="alert"><AlertIcon size={16} />{error}</span>
            )}
            {saved && (
              <span className={styles.successText}><CheckCircleIcon size={16} />Cambios guardados</span>
            )}
          </div>
          <button type="submit" className={styles.saveButton} disabled={busy}>
            {busy ? 'Guardando...' : 'Guardar cambios'}
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
      <StoreInfoSection />
      <DeliverySection />
      <BannerSection />
    </div>
  )
}

export default SettingsPage
