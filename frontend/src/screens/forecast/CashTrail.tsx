import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { formatDayMonth, formatWeekday } from '@/lib/date'
import { formatVnd, isNegative } from '@/lib/money'
import type { CashEvent, ForecastResponse } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Step {
  key: string
  date: string
  label: string
  event: CashEvent | null
  balance: string
}

/**
 * The money trail from the opening balance to the lowest day: one row per item with the balance after it, so the
 * owner sees which items take the shop below zero. Red marks only the balances below zero.
 */
export function CashTrail({ result, events }: { result: ForecastResponse; events: CashEvent[] }) {
  const byId = new Map(events.map((e) => [e.id, e]))
  const stopAt = result.lowestBalanceDate
  const steps: Step[] = [{ key: 'open', date: result.days[0].date, label: 'Số dư đầu kỳ', event: null, balance: result.days[0].opening }]
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

  return (
    <ol className="divide-y">
      <li aria-hidden="true" className="hidden grid-cols-[6.5rem_minmax(0,1fr)_10rem] gap-x-4 bg-muted px-5 py-2 text-sm font-medium text-secondary sm:grid">
        <span>Ngày</span>
        <span>Khoản</span>
        <span className="text-right">Còn lại</span>
      </li>
      {steps.map((s) => {
        const negative = isNegative(s.balance)
        const isIn = s.event?.direction === 'In'
        return (
          <li
            key={s.key}
            className={cn(
              'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 border-l-4 py-3 pr-4 pl-3 sm:grid-cols-[6.5rem_minmax(0,1fr)_10rem] sm:pr-5 sm:pl-4',
              negative ? 'border-l-[var(--color-error)]' : 'border-l-transparent',
            )}
          >
            <p className="num col-span-full text-sm text-secondary sm:col-span-1">
              {formatWeekday(s.date)} {formatDayMonth(s.date)}
            </p>
            <p className="flex min-w-0 items-center gap-2 break-words">
              {s.event &&
                (isIn ? (
                  <ArrowDownLeft aria-label="Thu" className="size-4 shrink-0 text-ok" />
                ) : (
                  <ArrowUpRight aria-label="Chi" className="size-4 shrink-0 text-secondary" />
                ))}
              <span className="min-w-0">
                <span className="font-medium">{s.label}</span>
                {s.event && (
                  <span className={cn('num ml-2 text-sm whitespace-nowrap', isIn ? 'text-ok' : 'text-secondary')}>
                    {isIn ? '+' : '−'}
                    {formatVnd(s.event.amount)}
                  </span>
                )}
              </span>
            </p>
            <p className={cn('num text-right font-bold whitespace-nowrap', negative && 'text-shortage')}>
              <span className="sr-only">Còn lại: </span>
              {formatVnd(s.balance)}
            </p>
          </li>
        )
      })}
    </ol>
  )
}
