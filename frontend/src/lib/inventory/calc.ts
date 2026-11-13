import { addMoney } from '../money'
import type { Money } from '../types'
import type { DocLine, Product } from './types'

/** Quantity × unit price, exact (BigInt). */
export function lineTotal(quantity: number, unitPrice: Money): Money {
  return (BigInt(quantity) * BigInt(unitPrice)).toString()
}

/** Sum of the lines' quantity × price. */
export function documentTotal(lines: readonly Pick<DocLine, 'quantity' | 'unitPrice'>[]): Money {
  return addMoney('0', ...lines.map((l) => lineTotal(l.quantity, l.unitPrice)))
}

/** What the stock list shows next to a product: nothing left, running low, or fine. */
export type StockLevel = 'out' | 'low' | 'ok'

export function stockLevel(p: Pick<Product, 'onHand' | 'lowStockAt'>): StockLevel {
  if (p.onHand <= 0) return 'out'
  return p.lowStockAt !== null && p.onHand <= p.lowStockAt ? 'low' : 'ok'
}

/** Money value of a change in stock at a unit cost: `-3` pieces at 120.000 ₫ is `-360000`. */
export function valueOfChange(difference: number, unitCost: Money): Money {
  return (BigInt(difference) * BigInt(unitCost)).toString()
}

/** Whole-shop figures for the stock page: what the stock is worth and how many products need attention. Archived products are not part of the shop's stock. */
export function stockSummary(products: readonly Product[]) {
  const active = products.filter((p) => !p.archived)
  return {
    count: active.length,
    value: addMoney('0', ...active.map((p) => p.stockValue)),
    out: active.filter((p) => stockLevel(p) === 'out').length,
    low: active.filter((p) => stockLevel(p) === 'low').length,
  }
}

/** The products a document may use right now: not archived, or already on the document being edited. */
export function pickableProducts(products: readonly Product[], usedIds: ReadonlySet<string> = new Set()): Product[] {
  return products.filter((p) => !p.archived || usedIds.has(p.id))
}

/** A typed quantity: whole number of 0 or more, or null when it is empty or not a number. */
export function parseQuantity(text: string): number | null {
  const t = text.trim()
  return /^\d{1,7}$/.test(t) ? Number(t) : null
}

/** A name or code for matching a search: lower case, no accents (so "ao so mi" finds "Áo sơ mi"). */
export function searchKey(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim()
}

export function matchesSearch(p: Pick<Product, 'name' | 'code'>, query: string): boolean {
  const q = searchKey(query)
  return q === '' || searchKey(p.name).includes(q) || searchKey(p.code).includes(q)
}
