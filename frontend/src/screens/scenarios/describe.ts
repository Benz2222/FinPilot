import { diffDays, formatDayMonth } from '@/lib/date'
import { formatMoneyWords } from '@/lib/money'
import type { Adjustment } from '@/lib/shop'
import type { CashEvent } from '@/lib/types'

export type PresetId = 'add' | 'less' | 'later' | 'split' | 'late-receipt' | 'exclude'

export const PRESETS: { id: PresetId; title: string; hint: string }[] = [
  { id: 'split', title: 'Chia đợt', hint: 'Trả một khoản chi làm hai lần' },
  { id: 'later', title: 'Nhập muộn hơn', hint: 'Dời một khoản chi sang ngày sau' },
  { id: 'less', title: 'Nhập ít hơn', hint: 'Giảm số tiền một khoản chi' },
  { id: 'late-receipt', title: 'Tiền về trễ', hint: 'Giả sử một khoản thu về muộn' },
  { id: 'add', title: 'Thêm khoản nhập', hint: 'Một lô hàng chưa có trong lịch' },
  { id: 'exclude', title: 'Bỏ một khoản', hint: 'Xem nếu không có khoản này' },
]

/** One line, in plain words, of what the adjustment assumes. */
export function describeAdjustment(a: Adjustment, byId: Map<string, CashEvent>): string {
  if (a.kind === 'add') {
    return `Thêm ${a.direction === 'In' ? 'thu' : 'chi'} “${a.label}” ${formatMoneyWords(a.amount)} ngày ${formatDayMonth(a.date)}`
  }
  const target = byId.get(a.targetId)
  if (!target) return 'Khoản gốc không còn trong lịch (đã xóa, đã xong hoặc đã hủy)'
  const name = `“${target.label}”`
  switch (a.kind) {
    case 'shift': {
      const n = diffDays(target.date, a.date)
      const how = n > 0 ? `trễ ${n} ngày` : n < 0 ? `sớm ${-n} ngày` : 'cùng ngày'
      return `Dời ${name} từ ${formatDayMonth(target.date)} sang ${formatDayMonth(a.date)} (${how})`
    }
    case 'resize':
      return `${name}: ${formatMoneyWords(target.amount)} → ${formatMoneyWords(a.amount)}`
    case 'split':
      return `Chia ${name} ${formatMoneyWords(target.amount)} thành ${a.parts
        .map((p) => `${formatMoneyWords(p.amount)} ngày ${formatDayMonth(p.date)}`)
        .join(' + ')}`
    case 'exclude':
      return `Bỏ ${name} ${formatMoneyWords(target.amount)}`
  }
}

/** What the owner gives up with this kind of change. The app lists these; it never decides. */
export function tradeOff(a: Adjustment, byId: Map<string, CashEvent>): string {
  const target = a.kind === 'add' ? null : byId.get(a.targetId)
  switch (a.kind) {
    case 'add':
      return a.direction === 'Out' ? 'Thêm hàng để bán, nhưng thêm tiền ra trước khi tiền bán về.' : 'Chỉ đúng nếu khoản thu này chắc chắn về.'
    case 'split':
      return 'Có thể tốn phí ship nhiều lần, mất chiết khấu số lượng, nhà cung cấp chưa chắc đồng ý.'
    case 'resize':
      return 'Ít hàng hơn để bán; giá nhập mỗi món có thể cao hơn.'
    case 'shift':
      return target?.direction === 'In'
        ? 'Đây là rủi ro, không phải lựa chọn: xem shop chịu được nếu tiền về trễ không.'
        : 'Có thể hết hàng, lỡ doanh thu trong thời gian chờ.'
    case 'exclude':
      return target?.direction === 'In' ? 'Xem shop ra sao nếu khoản thu này không về.' : 'Chỉ đúng nếu thật sự không phải chi khoản này.'
  }
}
