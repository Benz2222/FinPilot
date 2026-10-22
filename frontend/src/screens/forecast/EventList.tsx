import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { formatDate } from '@/lib/date'
import { formatVnd } from '@/lib/money'
import type { CashEvent } from '@/lib/types'

export function DirectionBadge({ direction }: { direction: CashEvent['direction'] }) {
  return direction === 'In' ? (
    <span className="inline-flex items-center gap-1 text-jade">
      <ArrowDownLeft aria-hidden="true" className="size-3.5" />
      Thu
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-ink-2">
      <ArrowUpRight aria-hidden="true" className="size-3.5" />
      Chi
    </span>
  )
}

/** Compact list of cash events (the "not counted" lists); wraps instead of scrolling on phones. */
export function EventList({ events }: { events: CashEvent[] }) {
  return (
    <ul className="divide-y divide-ink/10 text-foreground">
      {events.map((event) => (
        <li key={event.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5">
          <span className="min-w-0 break-words">
            <span className="font-medium">{event.label}</span> <DirectionBadge direction={event.direction} />
          </span>
          <span className="whitespace-nowrap tabular-nums">
            {formatVnd(event.amount)} · {formatDate(event.date)}
          </span>
        </li>
      ))}
    </ul>
  )
}
