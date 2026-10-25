import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Card } from '@astryxdesign/core/Card'
import { Collapsible } from '@astryxdesign/core/Collapsible'
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table'
import { formatDate, formatWeekday } from '@/lib/date'
import { formatVnd, isNegative, isZero } from '@/lib/money'
import type { CashEvent, ForecastResponse } from '@/lib/types'
import { INTRADAY_RISK_NOTE } from './copy'

interface DayTableProps {
  result: ForecastResponse
  events: CashEvent[]
}

/** Every day of the forecast as a table: collapsed by default, it is also the text alternative to the chart. */
export function DayTable({ result, events }: DayTableProps) {
  const [open, setOpen] = useState(false)
  const labelsById = new Map(events.map((e) => [e.id, e.label]))

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
        <div role="region" className="day-table border-t" aria-label="Chi tiết số dư từng ngày">
          <Table density="compact">
            <TableHeader>
              <TableRow isHeaderRow>
                <TableHeaderCell>Ngày</TableHeaderCell>
                <TableHeaderCell className="text-right">Đầu ngày</TableHeaderCell>
                <TableHeaderCell className="text-right">Thu</TableHeaderCell>
                <TableHeaderCell className="text-right">Chi</TableHeaderCell>
                <TableHeaderCell className="text-right">Cuối ngày</TableHeaderCell>
                <TableHeaderCell>Khoản phát sinh</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.days.map((day, index) => {
                const negative = isNegative(day.closing)
                const isFirstShortage = day.date === result.firstShortageDate
                const labels = day.eventIds.map((id) => labelsById.get(id)).filter(Boolean)
                return (
                  <TableRow key={day.date}>
                    <TableCell className={`border-l-4 align-top whitespace-nowrap ${negative ? 'border-l-[var(--color-error)]' : 'border-l-transparent'}`}>
                      <span className="num font-medium">{formatDate(day.date)}</span>
                      <span className="ml-2 text-xs text-secondary">
                        {formatWeekday(day.date)} · ngày {index}
                      </span>
                      {isFirstShortage && <span className="mt-0.5 block text-xs font-semibold text-shortage">Bắt đầu thiếu tiền</span>}
                      {day.hasIntradayTimingRisk && (
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-caution" title={INTRADAY_RISK_NOTE}>
                          <TriangleAlert aria-hidden="true" className="size-3" />
                          Thu và chi cùng ngày
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="num text-right align-top whitespace-nowrap">{formatVnd(day.opening)}</TableCell>
                    <TableCell className="num text-right align-top whitespace-nowrap">
                      {isZero(day.inflow) ? <span className="text-secondary">—</span> : `+${formatVnd(day.inflow)}`}
                    </TableCell>
                    <TableCell className="num text-right align-top whitespace-nowrap">
                      {isZero(day.outflow) ? <span className="text-secondary">—</span> : `−${formatVnd(day.outflow)}`}
                    </TableCell>
                    <TableCell className={`num text-right align-top font-semibold whitespace-nowrap ${negative ? 'text-shortage' : ''}`}>
                      {formatVnd(day.closing)}
                    </TableCell>
                    <TableCell className="align-top text-secondary">{labels.length > 0 ? labels.join(', ') : '—'}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Collapsible>
    </Card>
  )
}
