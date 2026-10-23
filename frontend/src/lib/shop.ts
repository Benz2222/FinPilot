import { addDays, isValidIsoDate } from './date'
import { addMoney, compareMoney, isZero, subtractMoney } from './money'
import type { CashEvent, Direction, ForecastRequest, ForecastResponse, IsoDate, Money } from './types'

export const HORIZON_DAYS = 56

export type ObligationStatus = 'open' | 'paid' | 'cancelled'

/** Money that actually moved for an obligation (part or all of it), on a real date. */
export interface Payment {
  id: string
  amount: Money
  date: IsoDate
}

/** A planned receipt (In) or payment (Out) in the shop's real schedule. */
export interface Obligation {
  id: string
  direction: Direction
  label: string
  amount: Money
  date: IsoDate
  note: string
  status: ObligationStatus
  payments: Payment[]
  /** Set when the line came from an imported file. */
  importedFrom?: string
}

/** Confirmed closing balance at the end of `cutoff`: it already contains every movement up to and including that day. */
export interface BalanceSnapshot {
  amount: Money
  cutoff: IsoDate
}

export interface ImportRecord {
  fileSha256: string
  fileName: string
  committedAt: string
  lineCount: number
}

export type Adjustment =
  | { kind: 'add'; id: string; direction: Direction; label: string; amount: Money; date: IsoDate }
  | { kind: 'shift'; id: string; targetId: string; date: IsoDate }
  | { kind: 'resize'; id: string; targetId: string; amount: Money }
  | { kind: 'split'; id: string; targetId: string; parts: { id: string; amount: Money; date: IsoDate }[] }
  | { kind: 'exclude'; id: string; targetId: string }

/** What a scenario produced the last time it was computed (kept so a stale scenario still shows its old numbers). */
export interface ScenarioOutcome {
  start: IsoDate
  closings: Money[]
  lowestBalance: Money
  lowestBalanceDate: IsoDate
  firstShortageDate: IsoDate | null
  maxShortage: Money
  endingBalance: Money
}

export interface Scenario {
  id: string
  name: string
  createdAt: string
  adjustments: Adjustment[]
  /** Fingerprint of the real data the outcome was computed from. */
  baseFingerprint: string
  outcome: ScenarioOutcome | null
}

export interface ShopData {
  version: 1
  balance: BalanceSnapshot | null
  obligations: Obligation[]
  scenarios: Scenario[]
  imports: ImportRecord[]
}

export function emptyShop(): ShopData {
  return { version: 1, balance: null, obligations: [], scenarios: [], imports: [] }
}

export function paidTotal(o: Obligation): Money {
  return addMoney('0', ...o.payments.map((p) => p.amount))
}

/** Unpaid part of an obligation (never below 0). A 10m obligation paid 4m leaves 6m. */
export function remaining(o: Obligation): Money {
  const left = subtractMoney(o.amount, paidTotal(o))
  return compareMoney(left, '0') < 0 ? '0' : left
}

/** Amount that is still expected to move: only open obligations count. */
export function outstanding(o: Obligation): Money {
  return o.status === 'open' ? remaining(o) : '0'
}

export function forecastStart(balance: BalanceSnapshot): IsoDate {
  return addDays(balance.cutoff, 1)
}

/** Open, still unpaid and dated on/before the cutoff: the engine cannot place it, the user must give a new date. */
export function isOverdue(o: Obligation, balance: BalanceSnapshot | null): boolean {
  return balance !== null && !isZero(outstanding(o)) && o.date <= balance.cutoff
}

/**
 * The real schedule as an engine request.
 * - Opening cash is the snapshot; the forecast starts the day after the cutoff.
 * - Each open obligation sends only its unpaid remainder, on its expected date.
 * - Payments dated after the cutoff are not in the snapshot yet, so they are sent as actual movements.
 *   Payments on/before the cutoff are already inside the snapshot and are never re-added.
 */
export function baselineRequest(data: ShopData): ForecastRequest | null {
  const { balance } = data
  if (!balance) return null
  const events: CashEvent[] = []
  for (const o of data.obligations) {
    const left = outstanding(o)
    if (!isZero(left)) events.push({ id: o.id, direction: o.direction, amount: left, date: o.date, label: o.label })
    for (const p of o.payments) {
      if (p.date > balance.cutoff && !isZero(p.amount)) {
        events.push({ id: p.id, direction: o.direction, amount: p.amount, date: p.date, label: `${o.label} (đã ${o.direction === 'In' ? 'thu' : 'trả'})` })
      }
    }
  }
  return { openingCash: balance.amount, start: forecastStart(balance), horizonDays: HORIZON_DAYS, events }
}

/** Scenario events: the baseline with adjustments applied to copies. The baseline array and its events are never mutated. */
export function applyAdjustments(base: readonly CashEvent[], adjustments: readonly Adjustment[]): CashEvent[] {
  let events = base.map((e) => ({ ...e }))
  for (const a of adjustments) {
    switch (a.kind) {
      case 'add':
        events.push({ id: a.id, direction: a.direction, amount: a.amount, date: a.date, label: a.label })
        break
      case 'shift':
        events = events.map((e) => (e.id === a.targetId ? { ...e, date: a.date } : e))
        break
      case 'resize':
        events = events.map((e) => (e.id === a.targetId ? { ...e, amount: a.amount } : e))
        break
      case 'exclude':
        events = events.filter((e) => e.id !== a.targetId)
        break
      case 'split': {
        const target = events.find((e) => e.id === a.targetId)
        if (!target) break
        events = events.filter((e) => e.id !== a.targetId)
        a.parts.forEach((part, i) =>
          events.push({ ...target, id: part.id, amount: part.amount, date: part.date, label: `${target.label} (đợt ${i + 1})` }),
        )
        break
      }
    }
  }
  return events
}

/** Adjustments whose target is no longer in the real schedule (deleted, paid or cancelled since). */
export function missingTargets(base: readonly CashEvent[], adjustments: readonly Adjustment[]): Adjustment[] {
  const ids = new Set(base.map((e) => e.id))
  return adjustments.filter((a) => a.kind !== 'add' && !ids.has(a.targetId))
}

export function scenarioRequest(base: ForecastRequest, adjustments: readonly Adjustment[]): ForecastRequest {
  return { ...base, events: applyAdjustments(base.events, adjustments) }
}

/**
 * Stable short hash of the real data a forecast depends on; a scenario whose fingerprint differs is stale.
 * Events are sorted first: the order the server lists obligations in does not change any balance.
 */
export function fingerprint(request: ForecastRequest | null): string {
  const sorted = request && { ...request, events: [...request.events].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) }
  const text = JSON.stringify(sorted)
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export function toOutcome(result: ForecastResponse): ScenarioOutcome {
  const last = result.days[result.days.length - 1]
  return {
    start: result.days[0]?.date ?? '',
    closings: result.days.map((d) => d.closing),
    lowestBalance: result.lowestBalance,
    lowestBalanceDate: result.lowestBalanceDate,
    firstShortageDate: result.firstShortageDate,
    maxShortage: result.maxShortage,
    endingBalance: last?.closing ?? '0',
  }
}

export interface ObligationDraft {
  direction: Direction | ''
  label: string
  amount: Money
  date: IsoDate
  note: string
}

export type DraftErrors = Partial<Record<'direction' | 'label' | 'amount' | 'date', string>>

const POSITIVE = /^\d+$/

/** Missing fields are errors, never zero. */
export function validateDraft(d: ObligationDraft): DraftErrors {
  const errors: DraftErrors = {}
  if (d.direction !== 'In' && d.direction !== 'Out') errors.direction = 'Chọn khoản thu hay khoản chi'
  if (!d.label.trim()) errors.label = 'Nhập nội dung khoản này'
  if (!d.amount) errors.amount = 'Nhập số tiền'
  else if (!POSITIVE.test(d.amount) || isZero(d.amount)) errors.amount = 'Số tiền phải lớn hơn 0'
  if (!isValidIsoDate(d.date)) errors.date = 'Chọn ngày dự kiến'
  return errors
}

/** Same direction, amount, date and label (case/space-insensitive) as an existing line. */
export function duplicateKey(direction: Direction, label: string, amount: Money, date: IsoDate): string {
  return [direction, label.trim().toLocaleLowerCase('vi').replace(/\s+/g, ' '), BigInt(amount).toString(), date].join('|')
}
