import { useCallback, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { InventoryError, inventoryApi } from '@/lib/inventory/api'
import type { InventoryResponse } from '@/lib/inventory/types'
import { InventoryContext } from './use-inventory'
import type { InventoryContextValue } from './use-inventory'
import { useShop } from './use-shop'

/** The shop's stock, read when a stock screen first opens and kept in step with every write the owner makes. */
export function InventoryProvider({ children }: { children: ReactNode }) {
  const { refresh } = useShop()
  const [inventory, setInventory] = useState<InventoryResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const started = useRef(false)

  const load = useCallback(() => {
    started.current = true
    setLoadError(null)
    inventoryApi.load().then(setInventory, (e: unknown) => setLoadError(e instanceof InventoryError ? e.message : 'Đã có lỗi không mong muốn.'))
  }, [])

  const ensureLoaded = useCallback(() => {
    if (!started.current) load()
  }, [load])

  const write = useCallback(
    async (action: () => Promise<InventoryResponse>, touchesSchedule: boolean) => {
      try {
        setInventory(await action())
      } catch (e) {
        return e instanceof InventoryError ? e.message : 'Đã có lỗi không mong muốn. Chưa lưu gì cả.'
      }
      if (touchesSchedule) await refresh()
      return null
    },
    [refresh],
  )

  const value = useMemo<InventoryContextValue>(
    () => ({
      inventory,
      loadError,
      ensureLoaded,
      reload: load,
      saveProduct: (p) => write(() => inventoryApi.saveProduct(p), false),
      deleteProduct: (id) => write(() => inventoryApi.deleteProduct(id), false),
      saveDocument: (d) => write(() => inventoryApi.saveDocument(d), true),
      deleteDocument: (id) => write(() => inventoryApi.deleteDocument(id), true),
    }),
    [inventory, loadError, ensureLoaded, load, write],
  )
  return <InventoryContext value={value}>{children}</InventoryContext>
}
