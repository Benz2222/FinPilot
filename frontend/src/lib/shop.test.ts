import { describe, expect, test } from 'vitest'
import { addDays } from './date'
import { addMoney, subtractMoney } from './money'
import { applyAdjustments, baselineRequest, emptyShop, fingerprint, remaining, scenarioRequest } from './shop'
import type { Adjustment, Obligation, ShopData } from './shop'
import type { ForecastRequest } from './types'

const CUTOFF = '2026-10-21'
const START = '2026-10-22'

function ob(id: string, direction: 'In' | 'Out', amount: string, day: number, extra: Partial<Obligation> = {}): Obligation {
  return { id, direction, label: id, amount, date: addDays(START, day), note: '', status: 'open', payments: [], ...extra }
}

/** The engine's rule (closing = opening + in − out, day by day), to read a request's balances without a server. */
function closings(request: ForecastRequest): string[] {
  const out: string[] = []
  let balance = request.openingCash
  for (let i = 0; i < request.horizonDays; i += 1) {
    const date = addDays(request.start, i)
    for (const e of request.events.filter((x) => x.date === date)) {
      balance = e.direction === 'In' ? addMoney(balance, e.amount) : subtractMoney(balance, e.amount)
    }
    out.push(balance)
  }
  return out
}

function referenceShop(): ShopData {
  return {
    ...emptyShop(),
    balance: { amount: '50000000', cutoff: CUTOFF },
    obligations: [ob('buy', 'Out', '30000000', 0), ob('payroll', 'Out', '25000000', 7), ob('payout', 'In', '35000000', 14)],
  }
}

describe('baseline request', () => {
  test('only the unpaid remainder of an open obligation is sent: 10m paid 4m sends 6m', () => {
    const o = ob('a', 'Out', '10000000', 3, { payments: [{ id: 'p', amount: '4000000', date: CUTOFF }] })
    expect(remaining(o)).toBe('6000000')
    const request = baselineRequest({ ...emptyShop(), balance: { amount: '0', cutoff: CUTOFF }, obligations: [o] })!
    expect(request.events).toEqual([expect.objectContaining({ id: 'a', amount: '6000000' })])
  })

  test('the forecast starts the day after the cutoff and never re-adds what the snapshot already holds', () => {
    const paidBefore = ob('rent', 'Out', '8000000', 2, {
      payments: [{ id: 'old', amount: '3000000', date: CUTOFF }, { id: 'new', amount: '1000000', date: START }],
    })
    const request = baselineRequest({ ...emptyShop(), balance: { amount: '20000000', cutoff: CUTOFF }, obligations: [paidBefore] })!
    expect(request.start).toBe(START)
    // 3m paid on the cutoff is inside the snapshot; 1m paid after it moves on its date; 4m remains.
    expect(request.events.map((e) => [e.id, e.amount])).toEqual([['rent', '4000000'], ['new', '1000000']])
  })

  test('paid and cancelled obligations send nothing but their post-cutoff payments', () => {
    const data = { ...emptyShop(), balance: { amount: '0', cutoff: CUTOFF }, obligations: [
      ob('x', 'Out', '5000000', 1, { status: 'cancelled' }),
      ob('y', 'Out', '5000000', 1, { status: 'paid', payments: [{ id: 'py', amount: '5000000', date: CUTOFF }] }),
    ] }
    expect(baselineRequest(data)!.events).toEqual([])
  })
})

describe('scenarios', () => {
  test('the order the server lists obligations in does not make a scenario stale', () => {
    const data = referenceShop()
    const reversed = { ...data, obligations: [...data.obligations].reverse() }
    expect(fingerprint(baselineRequest(reversed))).toBe(fingerprint(baselineRequest(data)))
  })

  test('adjustments leave the baseline data unchanged', () => {
    const data = referenceShop()
    const before = structuredClone(data)
    const base = baselineRequest(data)!
    const baseCopy = structuredClone(base)
    const adjustments: Adjustment[] = [
      { kind: 'shift', id: 's', targetId: 'payout', date: addDays(START, 16) },
      { kind: 'resize', id: 'r', targetId: 'payroll', amount: '1' },
      { kind: 'exclude', id: 'e', targetId: 'buy' },
      { kind: 'add', id: 'n', direction: 'Out', label: 'Thêm', amount: '1', date: START },
    ]
    applyAdjustments(base.events, adjustments)
    expect(base).toEqual(baseCopy)
    expect(data).toEqual(before)
  })

  test('split 20m day 0 + 10m day 15 gives 30/5/40/30 on days 0/7/14/15; payout delayed to day 16 → −5 on day 15', () => {
    const base = baselineRequest(referenceShop())!
    expect([0, 7, 14].map((d) => closings(base)[d])).toEqual(['20000000', '-5000000', '30000000'])

    const split: Adjustment = {
      kind: 'split', id: 'sp', targetId: 'buy',
      parts: [{ id: 'p1', amount: '20000000', date: START }, { id: 'p2', amount: '10000000', date: addDays(START, 15) }],
    }
    const splitDays = closings(scenarioRequest(base, [split]))
    expect([0, 7, 14, 15].map((d) => splitDays[d])).toEqual(['30000000', '5000000', '40000000', '30000000'])

    const late = closings(scenarioRequest(base, [split, { kind: 'shift', id: 'l', targetId: 'payout', date: addDays(START, 16) }]))
    expect(late[15]).toBe('-5000000')
  })
})
