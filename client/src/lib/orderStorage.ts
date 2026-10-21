import type { OrderModalityType } from '@jaby/shared'

export const LAST_ORDER_STORAGE_KEY = 'antojos-express-last-order'

export interface LastOrderItem {
  product_id?: string
  name: string
  quantity: number
  price: number | null
}

export interface LastOrderSnapshot {
  items: LastOrderItem[]
  total: number
  modality: OrderModalityType
  confirmedAt: string
}

function isLastOrderSnapshot(value: unknown): value is LastOrderSnapshot {
  if (!value || typeof value !== 'object') return false

  const snapshot = value as LastOrderSnapshot
  return (
    Array.isArray(snapshot.items) &&
    snapshot.items.every(
      (item) =>
        item &&
        typeof item.name === 'string' &&
        (item.product_id === undefined || typeof item.product_id === 'string') &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0 &&
        (item.price === null || typeof item.price === 'number')
    ) &&
    typeof snapshot.total === 'number' &&
    (snapshot.modality === 'pickup' || snapshot.modality === 'delivery') &&
    typeof snapshot.confirmedAt === 'string'
  )
}

export function readLastOrder(): LastOrderSnapshot | null {
  try {
    const stored = window.localStorage.getItem(LAST_ORDER_STORAGE_KEY)
    if (!stored) return null

    const parsed: unknown = JSON.parse(stored)
    return isLastOrderSnapshot(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveLastOrder(snapshot: LastOrderSnapshot): void {
  try {
    window.localStorage.setItem(LAST_ORDER_STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // The order confirmation flow should not fail if localStorage is unavailable.
  }
}
