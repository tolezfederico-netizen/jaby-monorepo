import { useStoreConfig } from './useStoreConfig'

function isWithinHours(open: string, close: string): boolean {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

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
      isError,
      isAppActive: false,
      isStoreOpen: false,
      isDeliveryAvailable: false,
      reopenTime: null,
      showPrices: true,
      config: null,
    }
  }

  const isAppActive = config.is_app_active

  const isStoreOpen = isWithinHours(
    config.business_hours_open,
    config.business_hours_close
  )

  const isDeliveryAvailable =
    config.delivery_enabled &&
    isWithinHours(
      config.delivery_hours_open,
      config.delivery_hours_close
    )

  const reopenTime = !isStoreOpen ? config.business_hours_open : null

  return {
    isLoading,
    isError,
    isAppActive,
    isStoreOpen,
    isDeliveryAvailable,
    reopenTime,
    showPrices: config.show_prices,
    config,
  }
}
