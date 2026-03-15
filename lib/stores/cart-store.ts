import { create } from "zustand"

const CART_STORAGE_KEY = "dental-cart-v1"

export interface CartItem {
  productId: string
  name: string
  ref: string
  brand: string | null
  unit: string
  category: string
  quantity: number
}

interface CartState {
  caseId: string | null
  caseName: string | null
  items: CartItem[]
  setCaseContext: (caseId: string, caseName: string) => void
  clearCaseContext: () => void
  addItem: (item: Omit<CartItem, "quantity">) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getItemCount: () => number
}

function loadFromStorage(): { caseId: string | null; caseName: string | null; items: CartItem[] } {
  if (typeof window === "undefined") return { caseId: null, caseName: null, items: [] }
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return { caseId: null, caseName: null, items: [] }
    const parsed = JSON.parse(raw)
    if (parsed.version !== 1) return { caseId: null, caseName: null, items: [] }
    return { caseId: parsed.caseId, caseName: parsed.caseName, items: parsed.items ?? [] }
  } catch {
    return { caseId: null, caseName: null, items: [] }
  }
}

function saveToStorage(state: { caseId: string | null; caseName: string | null; items: CartItem[] }) {
  if (typeof window === "undefined") return
  localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      caseId: state.caseId,
      caseName: state.caseName,
      items: state.items,
      updatedAt: new Date().toISOString(),
    })
  )
}

export const useCartStore = create<CartState>((set, get) => {
  const initial = loadFromStorage()
  return {
    caseId: initial.caseId,
    caseName: initial.caseName,
    items: initial.items,

    setCaseContext: (caseId, caseName) => {
      const current = get()
      // If switching case, clear cart
      if (current.caseId && current.caseId !== caseId) {
        const newState = { caseId, caseName, items: [] }
        set(newState)
        saveToStorage(newState)
      } else {
        set({ caseId, caseName })
        saveToStorage({ ...get() })
      }
    },

    clearCaseContext: () => {
      set({ caseId: null, caseName: null, items: [] })
      saveToStorage({ caseId: null, caseName: null, items: [] })
    },

    addItem: (item) => {
      const items = get().items
      const existing = items.find((i) => i.productId === item.productId)
      let newItems: CartItem[]
      if (existing) {
        newItems = items.map((i) =>
          i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i
        )
      } else {
        newItems = [...items, { ...item, quantity: 1 }]
      }
      set({ items: newItems })
      saveToStorage({ ...get(), items: newItems })
    },

    removeItem: (productId) => {
      const newItems = get().items.filter((i) => i.productId !== productId)
      set({ items: newItems })
      saveToStorage({ ...get(), items: newItems })
    },

    updateQuantity: (productId, quantity) => {
      if (quantity <= 0) {
        get().removeItem(productId)
        return
      }
      const newItems = get().items.map((i) =>
        i.productId === productId ? { ...i, quantity } : i
      )
      set({ items: newItems })
      saveToStorage({ ...get(), items: newItems })
    },

    clearCart: () => {
      set({ items: [] })
      saveToStorage({ ...get(), items: [] })
    },

    getItemCount: () => {
      return get().items.reduce((sum, i) => sum + i.quantity, 0)
    },
  }
})
