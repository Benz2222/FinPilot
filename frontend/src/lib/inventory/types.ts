import type { IsoDate, Money } from '../types'

/** in = nhập hàng, sale = xuất bán, out = xuất khác (hỏng, mất, tặng), count = kiểm kê. */
export type DocKind = 'in' | 'sale' | 'out' | 'count'

export interface Product {
  id: string
  name: string
  code: string
  unit: string
  salePrice: Money
  costPrice: Money
  /** Warn at or below this many on hand; null = no warning. */
  lowStockAt: number | null
  archived: boolean
  onHand: number
  averageCost: Money
  stockValue: Money
}

/** The fields the owner edits; the server derives the rest. */
export type ProductInput = Omit<Product, 'onHand' | 'averageCost' | 'stockValue'>

export interface DocLine {
  productId: string
  /** in/sale/out: more than 0. count: the counted number on hand (0 or more). */
  quantity: number
  /** in: unit cost, sale: selling price; '0' for out and count. */
  unitPrice: Money
  /** count only: counted minus what was on hand just before. */
  difference?: number
  /** sale/out/count: the average cost applied. */
  unitCost?: Money
}

export interface DocCash {
  date: IsoDate
  /** The money has already moved on `date`. */
  settled: boolean
}

export interface StockDocument {
  id: string
  kind: DocKind
  date: IsoDate
  party: string
  note: string
  lines: DocLine[]
  /** in/sale only. */
  cash: DocCash | null
  total: Money
  obligationId: string | null
}

export type StockDocumentInput = Omit<StockDocument, 'total' | 'obligationId'>

export interface InventoryResponse {
  dataVersion: number
  products: Product[]
  documents: StockDocument[]
}

export type ReportGroup = 'day' | 'week' | 'month'

export interface ReportFigures {
  unitsSold: number
  revenue: Money
  costOfGoods: Money
  grossProfit: Money
}

export interface SalesReport {
  from: IsoDate
  to: IsoDate
  group: ReportGroup
  totals: ReportFigures & { saleCount: number }
  periods: (ReportFigures & { start: IsoDate })[]
  products: (ReportFigures & { productId: string; name: string })[]
  stockLoss: Money
}
