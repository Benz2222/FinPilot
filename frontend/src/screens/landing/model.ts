import { addDays } from '@/lib/date'
import type { CashEvent, ForecastResponse, IsoDate } from '@/lib/types'

/*
 * The landing page's example: a fictional pottery shop, Tiệm Gốm Mây, with the old landing page's figures. Worked out
 * in the browser so the hero answers at once while the visitor drags; the app itself asks the server.
 */

export const HORIZON = 56
export const OPENING = 96_400_000
export const PAYROLL = 48_500_000
export const RENT = 28_000_000
export const RESTOCK_MAX = 150_000_000
export const RESTOCK_DEFAULT = 45_000_000
/** Payments at least this big get a marker and can be named as the bill that tips the balance. */
const BIG = 20_000_000

type Kind = 'payout' | 'cod' | 'supplier' | 'payroll' | 'rent' | 'ops' | 'restock' | 'sales'

export interface Flow {
  day: number
  amount: number
  kind: Kind
  label: string
}

const BASE: Flow[] = (() => {
  const flows: Flow[] = []
  const add = (day: number, amount: number, kind: Kind, label: string) => flows.push({ day, amount, kind, label })
  for (const [day, amount] of [[3, 16_520_000], [10, 17_940_000], [17, 19_870_000], [24, 18_410_000], [31, 20_160_000], [38, 19_730_000], [45, 21_950_000], [52, 20_680_000]])
    add(day, amount, 'payout', 'Marketplace payout')
  for (let d = 2; d < HORIZON; d += 4) add(d, 5_400_000 + ((d * 37) % 23) * 90_000 + (d % 3) * 1_250, 'cod', 'COD remittance')
  add(6, -21_600_000, 'supplier', 'Clay & glaze')
  add(12, -PAYROLL, 'payroll', 'Payroll')
  add(19, -RENT, 'rent', 'Workshop rent')
  add(22, -3_850_000, 'ops', 'Utilities')
  add(33, -24_300_000, 'supplier', 'Packaging')
  add(42, -PAYROLL, 'payroll', 'Payroll')
  add(49, -RENT, 'rent', 'Workshop rent')
  for (let w = 1; w < HORIZON; w += 7) add(w, -7_500_000, 'ops', 'Ads & shipping')
  return flows
})()

/** The day the second half of a split order is paid. */
export const SECOND_HALF_DAY = 28

export interface Flight {
  restock: number
  split: boolean
  byDay: Flow[][]
  /** Closing balance per day, day 0 = today. */
  balances: number[]
  min: number
  minDay: number
  /** First day below zero, or -1. */
  firstShort: number
  short: boolean
}

/** The 56 days with a restock order of `restock` paid today, or half today and half on day 28. */
export function fly(restock: number, split: boolean): Flight {
  const flows = BASE.slice()
  if (restock > 0) {
    if (split) {
      const half = Math.round(restock / 2)
      flows.push({ day: 0, amount: -half, kind: 'restock', label: 'Restock 1/2' })
      flows.push({ day: SECOND_HALF_DAY, amount: -(restock - half), kind: 'restock', label: 'Restock 2/2' })
    } else flows.push({ day: 0, amount: -restock, kind: 'restock', label: 'Restock order' })
    // The new stock sells: 30% of the order back each week from day 24.
    for (const day of [24, 31, 38, 45, 52]) flows.push({ day, amount: Math.round(restock * 0.3), kind: 'sales', label: 'New-stock sales' })
  }
  const byDay: Flow[][] = Array.from({ length: HORIZON }, () => [])
  for (const f of flows) byDay[f.day].push(f)
  const balances: number[] = []
  let balance = OPENING
  for (const day of byDay) {
    for (const f of day) balance += f.amount
    balances.push(balance)
  }
  let minDay = 0
  balances.forEach((b, i) => {
    if (b < balances[minDay]) minDay = i
  })
  const firstShort = balances.findIndex((b) => b < 0)
  return { restock, split, byDay, balances, min: balances[minDay], minDay, firstShort, short: firstShort >= 0 }
}

/** The bill that tips `day` below zero: the biggest payment that day, else a big one up to a week before. */
export function culprit(f: Flight, day: number): Flow | null {
  for (let back = 0; back <= 7 && day - back >= 0; back += 1) {
    const outs = f.byDay[day - back].filter((e) => e.amount < 0 && (back === 0 || -e.amount >= BIG))
    if (outs.length) return outs.reduce((a, b) => (b.amount < a.amount ? b : a))
  }
  return null
}

/** The same days in the shape the forecast API returns, for the app's chart. */
export function toForecast(f: Flight, today: IsoDate): { result: ForecastResponse; events: CashEvent[] } {
  const events: CashEvent[] = []
  const days: ForecastResponse['days'] = f.byDay.map((flows, i) => {
    const date = addDays(today, i)
    flows.forEach((e, k) => events.push({ id: `${i}-${k}`, direction: e.amount < 0 ? 'Out' : 'In', amount: String(Math.abs(e.amount)), date, label: e.label }))
    const inflow = flows.reduce((s, e) => s + Math.max(0, e.amount), 0)
    const outflow = flows.reduce((s, e) => s + Math.max(0, -e.amount), 0)
    return {
      date,
      opening: String(i === 0 ? OPENING : f.balances[i - 1]),
      inflow: String(inflow),
      outflow: String(outflow),
      closing: String(f.balances[i]),
      eventIds: flows.map((_, k) => `${i}-${k}`),
      hasIntradayTimingRisk: false,
    }
  })
  return {
    events,
    result: {
      days,
      lowestBalance: String(f.min),
      lowestBalanceDate: addDays(today, f.minDay),
      firstShortageDate: f.short ? addDays(today, f.firstShort) : null,
      maxShortage: f.min < 0 ? String(-f.min) : '0',
      unresolvedEvents: [],
      eventsAfterHorizon: [],
    },
  }
}

/* English figures and dates, as the old page wrote them: ₫45,000,000 · ₫12.8M · Mon 16 Nov. */

const grouped = new Intl.NumberFormat('en-US')
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function fmtVnd(v: number): string {
  return `${v < 0 ? '−' : ''}₫${grouped.format(Math.abs(Math.round(v)))}`
}
export function fmtM(v: number, digits = 1): string {
  return `${v < 0 ? '−' : ''}₫${(Math.abs(v) / 1e6).toFixed(digits)}M`
}
const at = (today: IsoDate, day: number) => new Date(`${addDays(today, day)}T00:00:00Z`)
/** `Mon 16 Nov` */
export function dayLabel(today: IsoDate, day: number): string {
  const d = at(today, day)
  return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MO[d.getUTCMonth()]}`
}
/** `16 Nov` */
export function shortDate(today: IsoDate, day: number): string {
  const d = at(today, day)
  return `${d.getUTCDate()} ${MO[d.getUTCMonth()]}`
}

export const VERDICT = { short: 'Pull up', clear: 'Clear skies' } as const

/** The verdict as one sentence; its alarm phrase is the part drawn on the white highlight. */
export function verdictSentence(f: Flight, today: IsoDate): { alarm: string; rest: string } {
  if (!f.short)
    return { alarm: '', rest: `Payroll, rent and suppliers all clear. Lowest point ${fmtVnd(f.min)} on ${dayLabel(today, f.minDay)}.` }
  const c = culprit(f, f.firstShort)
  return {
    alarm: `Short ${fmtVnd(-f.balances[f.firstShort])} on ${dayLabel(today, f.firstShort)}`,
    rest: `${c ? `, when ${c.label.toLowerCase()} (${fmtM(-c.amount)}) is due` : ''}.${f.split ? ' Try a smaller order.' : ' Try splitting the payment.'}`,
  }
}
