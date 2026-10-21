import { useStoreConfig } from './useStoreConfig'

// Los horarios del local están en hora argentina, aunque el dispositivo tenga otra zona horaria.
// Misma lógica que supabase/functions/create-order/index.ts.
function getArgentinaMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0) % 24
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

function isWithinHours(open: string, close: string): boolean {
  const currentMinutes = getArgentinaMinutes()

  const [openH, openM] = open.split(':').map(Number)
  const [closeH, closeM] = close.split(':').map(Number)

  const openMinutes = openH * 60 + openM
  const closeMinutes = closeH * 60 + closeM

  if (closeMinutes <= openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes
  }

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes
}

export function useAppStatus() {
  const { data: config, isLoading, isError } = useStoreConfig()

  if (isLoading || isError || !config) {
    return {
      isLoading,
      isAppActive: false,
      isStoreOpen: false,
      isDeliveryAvailable: false,
      reopenTime: null,
      showPrices: true,
      config: null,
    }
  }

  const isAppActive = config.is_app_active

  const isStoreOpen = isWithinHours(config.business_hours_open, config.business_hours_close)

  const isDeliveryAvailable =
    config.delivery_enabled &&
    isWithinHours(config.delivery_hours_open, config.delivery_hours_close)

  const reopenTime = !isStoreOpen ? config.business_hours_open.slice(0, 5) : null

  return {
    isLoading,
    isAppActive,
    isStoreOpen,
    isDeliveryAvailable,
    reopenTime,
    showPrices: config.show_prices,
    config,
  }
}
