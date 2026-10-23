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
    <ol className="divide-y">
      <li aria-hidden="true" className="hidden grid-cols-[6rem_minmax(0,1fr)_minmax(0,12rem)_9.5rem] gap-x-4 bg-muted/60 px-5 py-2 text-xs font-medium text-muted-foreground sm:grid">
        <span>Ngày</span>
        <span>Khoản</span>
        <span>Số dư sau khoản</span>
        <span className="text-right">Còn lại</span>
      </li>
      {steps.map((s, i) => {
        const v = values[i]
        const width = (Math.abs(v) / max) * span
        const negative = isNegative(s.balance)
        return (
          <li
            key={s.key}
            className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-4 py-2.5 sm:grid-cols-[6rem_minmax(0,1fr)_minmax(0,12rem)_9.5rem] sm:px-5 ${negative ? 'bg-shortage-soft' : ''}`}
          >
            <p className="num col-span-full text-xs text-muted-foreground sm:col-span-1 sm:text-sm">{formatDate(s.date)}</p>
            <p className="min-w-0 text-sm break-words">
              <span className="font-medium">{s.label}</span>
              {s.event && (
                <span className={`num ml-2 whitespace-nowrap ${s.event.direction === 'In' ? 'text-ok' : 'text-muted-foreground'}`}>
                  {s.event.direction === 'In' ? '+' : '−'}
                  {formatVnd(s.event.amount)}
                </span>
              )}
            </p>
            <div aria-hidden="true" className="relative order-last col-span-full h-2 rounded-full bg-muted sm:order-none sm:col-span-1">
              {hasNegative && <span className="absolute inset-y-[-3px] left-1/2 w-px bg-muted-foreground" />}
              <span
                className={`absolute inset-y-0 rounded-full ${negative ? 'bg-shortage' : 'bg-primary'}`}
                style={negative ? { right: `${100 - zero}%`, width: `${width}%` } : { left: `${zero}%`, width: `${width}%` }}
              />
            </div>
            <p className={`num text-right text-sm font-semibold whitespace-nowrap ${negative ? 'text-shortage' : ''}`}>
              <span className="sr-only">Còn lại: </span>
              {formatVnd(s.balance)}
            </p>
          </li>
        )
      })}
    </ol>
  )
}
