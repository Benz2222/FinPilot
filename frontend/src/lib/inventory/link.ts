import type { Obligation } from '../shop'

/**
 * The stock document that owns a schedule line (a nhập hàng or an xuất bán), or null for a line the owner typed.
 * The one place that reads the server's marker (`stockDocumentId` on the obligation in /api/shop).
 */
export function stockDocumentOf(o: Obligation): string | null {
  return o.stockDocumentId ?? null
}
