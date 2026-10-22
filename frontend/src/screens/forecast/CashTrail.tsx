import { formatDate } from '@/lib/date'
import { formatVnd, isNegative, toPlotNumber } from '@/lib/money'
import type { CashEvent, ForecastResponse } from '@/lib/types'

interface Step {
  key: string
  date: string
  label: string
  event: CashEvent | null
  balance: string
}

/**
 * The money trail from the opening balance to the lowest day: one step per item, each with the balance after it,
 * drawn as a bar either side of zero. Shows *which* items take the shop below zero.
 */
export function CashTrail({ result, events }: { result: ForecastResponse; events: CashEvent[] }) {
  const byId = new Map(events.map((e) => [e.id, e]))
  const stopAt = result.lowestBalanceDate
  const steps: Step[] = [
    { key: 'open', date: result.days[0].date, label: 'Số dư đầu kỳ', event: null, balance: result.days[0].opening },
  ]
  for (const day of result.days) {
    if (day.date > stopAt) break
    let running = BigInt(day.opening)
    // Within a day the engine does not know the order; list receipts first, as it adds them before closing.
    const dayEvents = day.eventIds
      .map((id) => byId.get(id))
      .filter((e): e is CashEvent => Boolean(e))
      .sort((a, b) => (a.direction === b.direction ? 0 : a.direction === 'In' ? -1 : 1))
    for (const e of dayEvents) {
      running += e.direction === 'In' ? BigInt(e.amount) : -BigInt(e.amount)
      steps.push({ key: e.id, date: day.date, label: e.label, event: e, balance: running.toString() })
    }
  }

  const values = steps.map((s) => toPlotNumber(s.balance))
  const max = Math.max(1, ...values.map(Math.abs))
  const hasNegative = values.some((v) => v < 0)
  const zero = hasNegative ? 50 : 0 // % from the left where zero sits
  const span = hasNegative ? 50 : 100

  return (
    <ol className="grid gap-px overflow-hidden rounded-xl bg-ink/10 ring-1 ring-ink/10">
      {steps.map((s, i) => {
        const v = values[i]
        const width = (Math.abs(v) / max) * span
        const negative = isNegative(s.balance)
        return (
          <li key={s.key} className={`grid gap-x-4 gap-y-1 bg-card px-4 py-3 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_9.5rem] sm:items-center ${negative ? 'bg-[#fbeeec]' : ''}`}>
            <div className="min-w-0">
              <p className="text-xs text-ink-3">{formatDate(s.date)}</p>
              <p className="font-semibold break-words">
                {s.label}
                {s.event && (
                  <span className={`ml-2 figure font-bold whitespace-nowrap ${s.event.direction === 'In' ? 'text-jade' : 'text-ink-2'}`}>
                    {s.event.direction === 'In' ? '+' : '−'}
                    {formatVnd(s.event.amount)}
                  </span>
                )}
              </p>
            </div>
            <div aria-hidden="true" className="relative h-3 rounded-sm bg-paper-2">
              {hasNegative && <span className="absolute inset-y-[-4px] left-1/2 w-0.5 bg-ink" />}
              <span
                className={`absolute inset-y-0 rounded-sm ${negative ? 'hatch-shortage bg-destructive/70' : 'bg-[#1f5fa8]'}`}
                style={negative ? { right: `${100 - zero}%`, width: `${width}%` } : { left: `${zero}%`, width: `${width}%` }}
              />
            </div>
            <p className={`figure text-right text-xl font-bold whitespace-nowrap ${negative ? 'text-destructive' : ''}`}>
              <span className="sr-only">Còn lại: </span>
              {formatVnd(s.balance)}
            </p>
          </li>
        )
      })}
    </ol>
  )
}
