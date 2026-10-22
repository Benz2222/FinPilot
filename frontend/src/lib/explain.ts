import { diffDays, formatDayMonth } from './date'
import { compareMoney, formatMoneyWords } from './money'
import type { CashEvent, ForecastResponse, IsoDate } from './types'

/** "hôm nay", "ngày mai", "sau 7 ngày", "2 ngày trước" (no date). */
export function inDays(date: IsoDate, today: IsoDate): string {
  const n = diffDays(today, date)
  if (n === 0) return 'hôm nay'
  if (n === 1) return 'ngày mai'
  return n > 0 ? `sau ${n} ngày` : `${-n} ngày trước`
}

/** "hôm nay", "ngày mai", "29/10 (sau 7 ngày)", "20/10 (2 ngày trước)". */
export function relativeDay(date: IsoDate, today: IsoDate): string {
  const n = diffDays(today, date)
  if (n === 0) return 'hôm nay'
  if (n === 1) return 'ngày mai'
  return n > 0 ? `ngày ${formatDayMonth(date)} (sau ${n} ngày)` : `ngày ${formatDayMonth(date)} (${-n} ngày trước)`
}

export interface StorySegment {
  text: string
  /** The shortage itself: drawn as the alarm. */
  alarm?: boolean
}

export interface ShortageStory {
  /** Plain sentence: "Nếu chi “Nhập hàng” 30 triệu hôm nay, bạn dự kiến thiếu 5 triệu vào …". */
  sentence: string
  segments: StorySegment[]
  firstDate: IsoDate
  firstShortage: string
  /** Largest payment before the first short day (the decision that sets it up), if any. */
  lead: CashEvent | null
  /** Payments due on the first short day. */
  triggers: CashEvent[]
  /** First receipt after the first short day: the money that arrives too late. */
  lateReceipt: CashEvent | null
}

/** Explains the first shortage in the owner's words. Null when the balance never goes below zero. */
export function explainShortage(result: ForecastResponse, events: readonly CashEvent[], today: IsoDate): ShortageStory | null {
  const first = result.firstShortageDate
  if (!first) return null
  const day = result.days.find((d) => d.date === first)
  if (!day) return null
  const start = result.days[0].date
  const end = result.days[result.days.length - 1].date
  const inRange = events.filter((e) => e.date >= start && e.date <= end)
  const outsBefore = inRange.filter((e) => e.direction === 'Out' && e.date < first)
  const lead = outsBefore.reduce<CashEvent | null>((best, e) => (!best || compareMoney(e.amount, best.amount) > 0 ? e : best), null)
  const triggers = inRange.filter((e) => e.direction === 'Out' && e.date === first)
  const lateReceipt =
    inRange.filter((e) => e.direction === 'In' && e.date > first).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
  const firstShortage = day.closing.replace(/^-/, '')

  const segments: StorySegment[] = [
    { text: lead ? `Nếu chi “${lead.label}” ${formatMoneyWords(lead.amount)} ${relativeDay(lead.date, today)}, bạn dự kiến ` : 'Bạn dự kiến ' },
    { text: `thiếu ${formatMoneyWords(firstShortage)} vào ${relativeDay(first, today)}`, alarm: true },
  ]
  if (triggers.length > 0) segments.push({ text: `, khi đến hạn ${triggers.map((t) => `“${t.label}”`).join(', ')}` })
  if (lateReceipt) segments.push({ text: `, trước khi khoản thu “${lateReceipt.label}” ${relativeDay(lateReceipt.date, today)} về` })
  segments.push({ text: '.' })

  return {
    sentence: segments.map((x) => x.text).join(''),
    segments,
    firstDate: first,
    firstShortage,
    lead,
    triggers,
    lateReceipt,
  }
}
