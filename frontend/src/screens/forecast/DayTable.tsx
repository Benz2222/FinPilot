import { useId, useState } from 'react'
import { ChevronDown, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatWeekday } from '@/lib/date'
import { formatVnd, isNegative, isZero } from '@/lib/money'
import type { CashEvent, ForecastResponse } from '@/lib/types'
import { INTRADAY_RISK_NOTE } from './copy'

interface DayTableProps {
  result: ForecastResponse
  events: CashEvent[]
}

const stickyHead = 'placard sticky top-0 z-10 bg-muted shadow-[inset_0_-1px_0_var(--border)]'

/** Every day of the forecast as a table: collapsed by default, it is also the text alternative to the chart. */
export function DayTable({ result, events }: DayTableProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const labelsById = new Map(events.map((e) => [e.id, e.label]))

  return (
    <Card className="overflow-hidden">
      <Button
        type="button"
        variant="ghost"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="h-12 w-full justify-start rounded-none px-4 font-semibold text-foreground sm:px-5"
      >
        <ChevronDown aria-hidden="true" className={open ? 'rotate-180' : ''} />
        {open ? 'Ẩn' : 'Xem'} chi tiết từng ngày ({result.days.length} ngày)
      </Button>

      {open && (
        <div
          id={panelId}
          tabIndex={0} // scrollable region must be reachable by keyboard
          role="region"
          aria-label="Chi tiết số dư từng ngày"
          className="max-h-[28rem] overflow-auto border-t focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
        >
          {/* Plain <table>: the shadcn wrapper adds its own overflow container, which would break the sticky header. */}
          <table className="w-full min-w-[46rem] caption-bottom text-sm">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={stickyHead}>Ngày</TableHead>
                <TableHead className={`${stickyHead} text-right`}>Đầu ngày</TableHead>
                <TableHead className={`${stickyHead} text-right`}>Thu</TableHead>
                <TableHead className={`${stickyHead} text-right`}>Chi</TableHead>
                <TableHead className={`${stickyHead} text-right`}>Cuối ngày</TableHead>
                <TableHead className={stickyHead}>Khoản phát sinh</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.days.map((day, index) => {
                const negative = isNegative(day.closing)
                const isFirstShortage = day.date === result.firstShortageDate
                const labels = day.eventIds.map((id) => labelsById.get(id)).filter(Boolean)
                return (
                  <TableRow key={day.date} className={negative ? 'bg-shortage-soft hover:bg-shortage-soft' : undefined}>
                    <TableCell className="align-top whitespace-nowrap">
                      <span className="num font-medium">{formatDate(day.date)}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {formatWeekday(day.date)} · ngày {index}
                      </span>
                      {isFirstShortage && (
                        <span className="mt-0.5 block text-xs font-medium text-shortage">Bắt đầu thiếu tiền</span>
                      )}
                      {day.hasIntradayTimingRisk && (
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-caution" title={INTRADAY_RISK_NOTE}>
                          <TriangleAlert aria-hidden="true" className="size-3" />
                          Thu và chi cùng ngày
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right num align-top whitespace-nowrap">
                      {formatVnd(day.opening)}
                    </TableCell>
                    <TableCell className="text-right num align-top whitespace-nowrap">
                      {isZero(day.inflow) ? <span className="text-muted-foreground">—</span> : `+${formatVnd(day.inflow)}`}
                    </TableCell>
                    <TableCell className="text-right num align-top whitespace-nowrap">
                      {isZero(day.outflow) ? <span className="text-muted-foreground">—</span> : `−${formatVnd(day.outflow)}`}
                    </TableCell>
                    <TableCell
                      className={`text-right num align-top font-medium whitespace-nowrap ${negative ? 'text-shortage' : ''}`}
                    >
                      {formatVnd(day.closing)}
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      {labels.length > 0 ? labels.join(', ') : '—'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </table>
        </div>
      )}
    </Card>
  )
}
