import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import { MAX_ITEM_QUANTITY, type ProductType } from '@jaby/shared'
import { useProducts } from '../hooks/useProducts'

const CART_STORAGE_KEY = 'antojos-express-cart'

interface CartItem {
  product: ProductType
  quantity: number
}

interface CartState {
  items: CartItem[]
}

type CartAction =
  | { type: 'ADD_ITEM'; product: ProductType }
  | { type: 'REMOVE_ITEM'; productId: string }
  | { type: 'UPDATE_QUANTITY'; productId: string; quantity: number }
  | { type: 'CLEAR_CART' }
  | { type: 'SYNC_PRODUCTS'; products: ProductType[] }

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(i => i.product.id === action.product.id)
      if (existing) {
        if (existing.quantity >= MAX_ITEM_QUANTITY) return state
        return {
          items: state.items.map(i =>
            i.product.id === action.product.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        }
      }
      return { items: [...state.items, { product: action.product, quantity: 1 }] }
    }
    case 'REMOVE_ITEM':
      return { items: state.items.filter(i => i.product.id !== action.productId) }
    case 'UPDATE_QUANTITY':
      if (action.quantity <= 0) {
        return { items: state.items.filter(i => i.product.id !== action.productId) }
      }
      return {
        items: state.items.map(i =>
          i.product.id === action.productId
            ? { ...i, quantity: Math.min(action.quantity, MAX_ITEM_QUANTITY) }
            : i
        ),
      }
    case 'CLEAR_CART':
      return { items: [] }
    case 'SYNC_PRODUCTS': {
      // El carrito guardado puede tener precios viejos: se reemplaza cada producto por su versión
      // actual del catálogo. Si ya no existe se deja como está y el servidor lo rechaza al confirmar.
      const byId = new Map(action.products.map((product) => [product.id, product]))
      let changed = false
      const items = state.items.map((item) => {
        const current = byId.get(item.product.id)
        if (!current || current === item.product) return item
        changed = true
        return { ...item, product: current }
      })
      return changed ? { items } : state
    }
    default:
      return state
  }
}

function isPersistedCartState(value: unknown): value is CartState {
  if (!value || typeof value !== 'object' || !Array.isArray((value as CartState).items)) {
    return false
  }

  return (value as CartState).items.every((item) => (
    item &&
    typeof item === 'object' &&
    item.product &&
    typeof item.product === 'object' &&
    typeof item.product.id === 'string' &&
    typeof item.product.name === 'string' &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0
  ))
}

function getInitialCartState(): CartState {
  try {
    const stored = window.localStorage.getItem(CART_STORAGE_KEY)
    if (!stored) return { items: [] }

    const parsed: unknown = JSON.parse(stored)
    return isPersistedCartState(parsed) ? parsed : { items: [] }
  } catch {
    return { items: [] }
  }
}

interface CartContextValue {
  items: CartItem[]
  addItem: (product: ProductType) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, getInitialCartState)
  const { data: products } = useProducts()

  useEffect(() => {
    if (products) dispatch({ type: 'SYNC_PRODUCTS', products })
  }, [products])

  useEffect(() => {
    try {
      if (state.items.length === 0) {
        window.localStorage.removeItem(CART_STORAGE_KEY)
      } else {
        window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state))
      }
    } catch {
      // localStorage can be unavailable or full; the in-memory cart remains usable.
    }
  }, [state])

  const totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0)
  const totalPrice = state.items.reduce(
    (sum, i) => sum + (i.product.price ?? 0) * i.quantity,
    0
  )

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        addItem: (product) => dispatch({ type: 'ADD_ITEM', product }),
        removeItem: (productId) => dispatch({ type: 'REMOVE_ITEM', productId }),
        updateQuantity: (productId, quantity) =>
          dispatch({ type: 'UPDATE_QUANTITY', productId, quantity }),
        clearCart: () => {
          dispatch({ type: 'CLEAR_CART' })
          try {
            window.localStorage.removeItem(CART_STORAGE_KEY)
          } catch {
            // The reducer state is still cleared if localStorage is unavailable.
          }
        },
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart debe usarse dentro de CartProvider')
  return context
}
