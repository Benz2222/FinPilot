import { addDays, formatDayMonth, formatMonthYear, formatWeekday } from '@/lib/date'
import type { ReportGroup } from '@/lib/inventory/types'

/** "Thứ Tư 12/11", "Tuần 10/11 – 16/11", "Tháng 11/2026". */
export function periodLabel(start: string, group: ReportGroup): string {
  if (group === 'day') return `${formatWeekday(start)} ${formatDayMonth(start)}`
  if (group === 'week') return `Tuần ${formatDayMonth(start)} – ${formatDayMonth(addDays(start, 6))}`
  return `Tháng ${formatMonthYear(start)}`
}
