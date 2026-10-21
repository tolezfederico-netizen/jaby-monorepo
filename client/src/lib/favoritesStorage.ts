const FAVORITES_STORAGE_KEY = 'antojos-express-favorites'

function isFavoriteIds(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((id) => typeof id === 'string')
}

export function readFavoriteIds(): string[] {
  try {
    const stored = window.localStorage.getItem(FAVORITES_STORAGE_KEY)
    if (!stored) return []

    const parsed: unknown = JSON.parse(stored)
    return isFavoriteIds(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeFavoriteIds(ids: string[]): void {
  try {
    if (ids.length === 0) {
      window.localStorage.removeItem(FAVORITES_STORAGE_KEY)
    } else {
      window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids))
    }
  } catch {
    // Favorites remain available in memory if localStorage is unavailable.
  }
}

export function toggleFavoriteId(ids: string[], productId: string): string[] {
  return ids.includes(productId) ? ids.filter((id) => id !== productId) : [...ids, productId]
}
