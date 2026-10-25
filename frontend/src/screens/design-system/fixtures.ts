import { addDays } from '@/lib/date'
import { addMoney, compareMoney, isNegative, subtractMoney } from '@/lib/money'
import type { PlannedRow } from '@/lib/import'
import type { Obligation, ScenarioOutcome } from '@/lib/shop'
import type { CashEvent, ForecastResponse, ImportRow, IsoDate, Money } from '@/lib/types'

/** Sample shop for the design-system page: three weeks, one stock order that tips the balance below zero. */
export const DS_TODAY: IsoDate = '2026-10-22'

const ev = (id: string, day: number, direction: CashEvent['direction'], amount: Money, label: string): CashEvent => ({
  id,
  direction,
  amount,
  date: addDays(DS_TODAY, day),
  label,
})

export const shortEvents: CashEvent[] = [
  ev('cod-1', 1, 'In', '4200000', 'Tiền COD Giao Hàng Nhanh'),
  ev('stock', 3, 'Out', '28000000', 'Nhập hàng thu đông'),
  ev('ads', 5, 'Out', '3500000', 'Quảng cáo Facebook'),
  ev('rent', 7, 'Out', '9000000', 'Tiền thuê kho'),
  ev('cod-2', 9, 'In', '6800000', 'Tiền COD Giao Hàng Nhanh'),
  ev('shopee', 12, 'In', '15400000', 'Shopee đối soát'),
  ev('salary', 15, 'Out', '7000000', 'Lương nhân viên'),
  ev('cod-3', 18, 'In', '9100000', 'Tiền COD Giao Hàng Nhanh'),
]

export const okEvents: CashEvent[] = shortEvents.map((e) => (e.id === 'stock' ? { ...e, amount: '14000000' } : e))

/** Day-by-day closing balances, the same shape the forecast API returns. Fixture only; the app asks the server. */
export function sampleForecast(opening: Money, events: CashEvent[], horizonDays = 21): ForecastResponse {
  const days: ForecastResponse['days'] = []
  let balance = opening
  for (let i = 0; i < horizonDays; i++) {
    const date = addDays(DS_TODAY, i)
    const today = events.filter((e) => e.date === date)
    const inflow = addMoney('0', ...today.filter((e) => e.direction === 'In').map((e) => e.amount))
    const outflow = addMoney('0', ...today.filter((e) => e.direction === 'Out').map((e) => e.amount))
    const closing = subtractMoney(addMoney(balance, inflow), outflow)
    days.push({
      date,
      opening: balance,
      inflow,
      outflow,
      closing,
      eventIds: today.map((e) => e.id),
      hasIntradayTimingRisk: inflow !== '0' && outflow !== '0',
    })
    balance = closing
  }
  const lowest = days.reduce((a, d) => (compareMoney(d.closing, a.closing) < 0 ? d : a))
  const firstShort = days.find((d) => isNegative(d.closing))
  return {
    days,
    lowestBalance: lowest.closing,
    lowestBalanceDate: lowest.date,
    firstShortageDate: firstShort?.date ?? null,
    maxShortage: isNegative(lowest.closing) ? subtractMoney('0', lowest.closing) : '0',
    unresolvedEvents: [],
    eventsAfterHorizon: [],
  }
}

/** A forecast reduced to what the scenario comparison draws. */
export function outcomeOf(result: ForecastResponse): ScenarioOutcome {
  return {
    start: result.days[0].date,
    closings: result.days.map((d) => d.closing),
    lowestBalance: result.lowestBalance,
    lowestBalanceDate: result.lowestBalanceDate,
    firstShortageDate: result.firstShortageDate,
    maxShortage: result.maxShortage,
    endingBalance: result.days[result.days.length - 1].closing,
  }
}

const ob = (id: string, day: number, direction: Obligation['direction'], amount: Money, label: string, extra: Partial<Obligation> = {}): Obligation => ({
  id,
  direction,
  amount,
  date: addDays(DS_TODAY, day),
  label,
  note: '',
  status: 'open',
  payments: [],
  ...extra,
})

export const dsObligations: Obligation[] = [
  ob('o-overdue', -2, 'In', '3600000', 'Tiền COD Viettel Post'),
  ob('o-today', 0, 'Out', '3500000', 'Quảng cáo Facebook'),
  ob('o-partial', 3, 'Out', '28000000', 'Nhập hàng thu đông', {
    note: 'Đợt 1 đã chuyển',
    payments: [{ id: 'p1', amount: '10000000', date: addDays(DS_TODAY, -1) }],
  }),
  ob('o-in', 12, 'In', '15400000', 'Shopee đối soát'),
  ob('o-paid', -5, 'Out', '9000000', 'Tiền thuê kho', { status: 'paid', payments: [{ id: 'p2', amount: '9000000', date: addDays(DS_TODAY, -5) }] }),
]

const row = (rowNumber: number, r: Partial<ImportRow>): ImportRow => ({
  rowNumber,
  direction: 'Out',
  label: 'Nhập hàng',
  amount: '5000000',
  date: addDays(DS_TODAY, 4),
  paid: null,
  note: null,
  errors: [],
  ...r,
})

export const dsPlanned: PlannedRow[] = [
  { row: row(2, { direction: 'In', label: 'Tiền COD Giao Hàng Nhanh', amount: '4200000' }), valid: true, duplicateOf: null },
  { row: row(3, { amount: null, errors: [{ column: 'soTien', message: 'Số tiền phải là số nguyên dương' }] }), valid: false, duplicateOf: null },
  { row: row(4, { label: 'Quảng cáo Facebook', amount: '3500000', date: DS_TODAY }), valid: true, duplicateOf: { kind: 'existing', label: 'Quảng cáo Facebook' } },
]
