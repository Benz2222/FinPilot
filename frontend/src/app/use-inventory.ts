import { createContext, use, useEffect } from 'react'
import type { InventoryResponse, ProductInput, StockDocumentInput } from '@/lib/inventory/types'

export interface InventoryContextValue {
  /** null until the first read finishes. */
  inventory: InventoryResponse | null
  loadError: string | null
  /** Reads the stock once, the first time a stock screen opens. */
  ensureLoaded: () => void
  reload: () => void
  /** Each write resolves to null when saved, or a sentence for the owner when not. The shop is read again after it, because stock in and sales change the schedule. */
  saveProduct: (product: ProductInput) => Promise<string | null>
  deleteProduct: (id: string) => Promise<string | null>
  saveDocument: (document: StockDocumentInput) => Promise<string | null>
  deleteDocument: (id: string) => Promise<string | null>
}

export const InventoryContext = createContext<InventoryContextValue | null>(null)

export function useInventory(): InventoryContextValue {
  const value = use(InventoryContext)
  if (!value) throw new Error('useInventory must be used inside <InventoryProvider>')
  const { ensureLoaded } = value
  useEffect(ensureLoaded, [ensureLoaded])
  return value
}
