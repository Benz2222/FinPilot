import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, TriangleAlert } from 'lucide-react'
import { Card } from '@astryxdesign/core/Card'
import { Collapsible } from '@astryxdesign/core/Collapsible'
import { formatDayMonth, formatWeekday } from '@/lib/date'
import { inDays } from '@/lib/explain'
import { formatVnd, isNegative } from '@/lib/money'
import type { CashEvent, ForecastDay, ForecastResponse, IsoDate } from '@/lib/types'
import { cn } from '@/lib/utils'
import { INTRADAY_RISK_NOTE } from './copy'

interface DayTableProps {
  result: ForecastResponse
  events: CashEvent[]
  today: IsoDate
}

/** A day with its items, or a run of days with none (the balance stays the same through it). */
type Row = { days: ForecastDay[]; items: CashEvent[] }

function toRows(result: ForecastResponse, events: CashEvent[]): Row[] {
  const byId = new Map(events.map((e) => [e.id, e]))
  const rows: Row[] = []
  for (const day of result.days) {
    const items = day.eventIds.map((id) => byId.get(id)).filter((e): e is CashEvent => Boolean(e))
    const prev = rows[rows.length - 1]
    if (items.length === 0 && prev && prev.items.length === 0 && day.date !== result.firstShortageDate) prev.days.push(day)
    else rows.push({ days: [day], items })
  }
  return rows
}

/**
 * Every day of the forecast, collapsed by default; it is also the text alternative to the chart. One row per day with
 * its items and closing balance; days without items are merged into one row. On a phone the date and the balance
 * share a line and the items run full width under them, so no figure is ever cut.
 */
export function DayTable({ result, events, today }: DayTableProps) {
  const [open, setOpen] = useState(false)

  return (
    <Card padding={0} className="day-toggle overflow-hidden">
      <Collapsible
        isOpen={open}
        onOpenChange={setOpen}
        chevronPosition="start"
        trigger={
          <span className="block text-base leading-snug font-semibold">
            {open ? 'Ẩn' : 'Xem'} chi tiết từng ngày ({result.days.length} ngày)
          </span>
        }
      >
        <DayList result={result} events={events} today={today} />
      </Collapsible>
    </Card>
  )
}

/** The rows of the day detail. */
export function DayList({ result, events, today }: DayTableProps) {
  return (
    <ol aria-label="Chi tiết số dư từng ngày" className="divide-y border-t">
      <li aria-hidden="true" className="flex justify-between gap-x-4 bg-muted px-4 py-2 text-sm font-medium text-secondary sm:grid sm:grid-cols-[9.5rem_minmax(0,1fr)_11rem] sm:px-5">
        <span>Ngày</span>
        <span className="hidden sm:block">Khoản</span>
        <span className="text-right">Cuối ngày</span>
      </li>
      {toRows(result, events).map((row) => (
        <DayRow key={row.days[0].date} row={row} firstShortage={result.firstShortageDate} today={today} />
      ))}
    </ol>
  )
}

function DayRow({ row, firstShortage, today }: { row: Row; firstShortage: IsoDate | null; today: IsoDate }) {
  const first = row.days[0]
  const last = row.days[row.days.length - 1]
  const negative = isNegative(last.closing)
  const run = row.days.length > 1

  return (
    <li
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 border-l-4 py-3 pr-4 pl-3 sm:grid-cols-[9.5rem_minmax(0,1fr)_11rem] sm:pr-5 sm:pl-4',
        negative ? 'border-l-[var(--color-error)]' : 'border-l-transparent',
      )}
    >
      <div className="min-w-0">
        {run ? (
          <p className="num font-medium">
            {formatDayMonth(first.date)} – {formatDayMonth(last.date)}
          </p>
        ) : (
          <p className="num">
            <span className="font-medium whitespace-nowrap">
              {formatWeekday(first.date)} {formatDayMonth(first.date)}
            </span>{' '}
            <span className="text-sm whitespace-nowrap text-secondary">{inDays(first.date, today)}</span>
          </p>
        )}
        {first.date === firstShortage && <p className="text-xs font-semibold text-shortage">Bắt đầu thiếu tiền</p>}
        {first.hasIntradayTimingRisk && (
          <p className="flex items-center gap-1 text-xs text-caution" title={INTRADAY_RISK_NOTE}>
            <TriangleAlert aria-hidden="true" className="size-3 shrink-0" />
            Thu và chi cùng ngày
          </p>
        )}
      </div>

      <p className={cn('num text-right font-bold whitespace-nowrap sm:col-start-3 sm:row-start-1', negative && 'text-shortage')}>
        <span className="sr-only">Cuối ngày: </span>
        {formatVnd(last.closing)}
      </p>

      {row.items.length > 0 ? (
        <ul className="col-span-full grid gap-1 text-sm sm:col-span-1 sm:col-start-2 sm:row-start-1">
          {row.items.map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="flex min-w-0 items-baseline gap-1.5">
                {e.direction === 'In' ? (
                  <ArrowDownLeft aria-label="Thu" className="size-3.5 shrink-0 self-center text-ok" />
                ) : (
                  <ArrowUpRight aria-label="Chi" className="size-3.5 shrink-0 self-center text-secondary" />
                )}
                <span className="min-w-0 break-words">{e.label}</span>
              </span>
              <span className={cn('num ml-auto whitespace-nowrap', e.direction === 'In' ? 'text-ok' : 'text-secondary')}>
                {e.direction === 'In' ? '+' : '−'}
                {formatVnd(e.amount)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="col-span-full text-sm text-secondary sm:col-span-1 sm:col-start-2 sm:row-start-1">Không thu chi</p>
      )}
    </li>
  )
}
