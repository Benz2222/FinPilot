import { diffDays, formatDayMonth } from './date'
import { compareMoney, formatMoneyWords } from './money'
import type { CashEvent, ForecastResponse, IsoDate } from './types'

/**
 * "hôm nay", "ngày mai", "sau 7 ngày", "2 ngày trước" (no date). The one day count of the app: every place that says how
 * far away a day is (verdict, chart, day list, comparison) goes through here.
 */
export function inDays(date: IsoDate, today: IsoDate): string {
  const n = diffDays(today, date)
  if (n === 0) return 'hôm nay'
  if (n === 1) return 'ngày mai'
  return n > 0 ? `sau ${n} ngày` : `${-n} ngày trước`
}

/** "hôm nay", "ngày mai", "29/10 (sau 7 ngày)", "20/10 (2 ngày trước)". */
export function relativeDay(date: IsoDate, today: IsoDate): string {
  const n = diffDays(today, date)
  return n === 0 || n === 1 ? inDays(date, today) : `ngày ${formatDayMonth(date)} (${inDays(date, today)})`
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
  /** Lowest day, when it is later and deeper than the first short day. */
  worst: { date: IsoDate; shortage: string } | null
  /** Payments due on the first short day. */
  triggers: CashEvent[]
  /** First receipt after the first short day: the money that arrives too late. */
  lateReceipt: CashEvent | null
}

/** Characters the verdict sentence may take: about four lines on a phone. */
const SENTENCE_BUDGET = 140
/** Longest name the sentence quotes; the lists under the verdict carry the full one. */
const NAME_MAX = 24

/** "hôm nay", "ngày mai", "ngày 29/10": a date in the sentence without its day count. */
function onDay(date: IsoDate, today: IsoDate): string {
  const n = diffDays(today, date)
  return n === 0 || n === 1 ? inDays(date, today) : `ngày ${formatDayMonth(date)}`
}

/** A long name cut at a comma or a word, with "…". */
function shorten(name: string): string {
  if (name.length <= NAME_MAX) return name
  const cut = name.slice(0, NAME_MAX + 1)
  const comma = cut.lastIndexOf(',')
  const space = cut.lastIndexOf(' ')
  const at = comma > NAME_MAX / 2 ? comma : space > NAME_MAX / 2 ? space : NAME_MAX
  return `${name.slice(0, at).replace(/[\s,.;:–-]+$/, '')}…`
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
  const worst = result.lowestBalanceDate !== first ? { date: result.lowestBalanceDate, shortage: result.maxShortage } : null

  // The shortage facts always stay; the bill due that day and the late receipt join only while the sentence stays short.
  const head: StorySegment = {
    text: lead ? `Nếu chi “${shorten(lead.label)}” ${formatMoneyWords(lead.amount)} ${onDay(lead.date, today)}, bạn dự kiến ` : 'Bạn dự kiến ',
  }
  const alarm: StorySegment = { text: `thiếu ${formatMoneyWords(firstShortage)} ${relativeDay(first, today)}`, alarm: true }
  const tail: StorySegment[] = worst
    ? [{ text: ', ' }, { text: `nhiều nhất ${formatMoneyWords(worst.shortage)} ${onDay(worst.date, today)}`, alarm: true }, { text: '.' }]
    : [{ text: '.' }]
  const extras: StorySegment[] = []
  if (triggers.length > 0)
    extras.push({ text: ` khi đến hạn “${shorten(triggers[0].label)}”${triggers.length > 1 ? ` và ${triggers.length - 1} khoản khác` : ''}` })
  if (lateReceipt) extras.push({ text: `, trước khi khoản thu “${shorten(lateReceipt.label)}” về ${onDay(lateReceipt.date, today)}` })
  const middle: StorySegment[] = []
  const length = (segs: StorySegment[]) => segs.reduce((n, x) => n + x.text.length, 0)
  for (const extra of extras) {
    if (length([head, alarm, ...middle, extra, ...tail]) > SENTENCE_BUDGET) break
    middle.push(extra)
  }
  const segments = [head, alarm, ...middle, ...tail]

  return {
    sentence: segments.map((x) => x.text).join(''),
    segments,
    firstDate: first,
    firstShortage,
    worst,
    lead,
    triggers,
    lateReceipt,
  }
}
