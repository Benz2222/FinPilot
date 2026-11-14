import { ArrowDownToLine, ClipboardCheck, PackageMinus, ShoppingBag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { StockTask } from '@/app/routes'
import type { DocKind } from '@/lib/inventory/types'

export interface KindMeta {
  /** The document's name in lists and as the form's title. */
  title: string
  /** What the shortcut on the stock page says it is for. */
  hint: string
  icon: LucideIcon
  task: StockTask
  /** Label of the other side of the document. */
  party: string
}

export const KIND: Record<DocKind, KindMeta> = {
  in: { title: 'Nhập hàng', hint: 'Mua hàng từ nhà cung cấp', icon: ArrowDownToLine, task: 'nhap', party: 'Nhà cung cấp' },
  sale: { title: 'Bán hàng', hint: 'Ghi những món đã bán', icon: ShoppingBag, task: 'ban', party: 'Khách hoặc kênh bán' },
  out: { title: 'Xuất khác', hint: 'Hàng hỏng, mất, tặng', icon: PackageMinus, task: 'xuat', party: 'Gửi cho ai' },
  count: { title: 'Kiểm kê', hint: 'Đếm lại hàng trong kho', icon: ClipboardCheck, task: 'kiem-ke', party: '' },
}

export const KIND_OF_TASK: Partial<Record<StockTask, DocKind>> = { nhap: 'in', ban: 'sale', xuat: 'out', 'kiem-ke': 'count' }

/** Why stock leaves other than by a sale; fills the note. */
export const OUT_REASONS = ['Hàng hỏng', 'Bị mất', 'Tặng khách', 'Dùng chụp ảnh']

/** "5 cái" — the unit the owner typed, or just the number. */
export function withUnit(quantity: number, unit: string): string {
  return unit ? `${quantity} ${unit}` : String(quantity)
}
