import { useEffect, useState } from 'react'
import { ChartColumn, TriangleAlert } from 'lucide-react'
import { Button } from '@astryxdesign/core/Button'
import { Collapsible } from '@astryxdesign/core/Collapsible'
import { ProgressBar } from '@astryxdesign/core/ProgressBar'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { stockHref } from '@/app/routes'
import { useShop } from '@/app/use-shop'
import { Chip } from '@/components/fields'
import { EmptyState, ErrorState, Loading, PageHeader, Panel } from '@/components/page'
import { StatGrid, StatTile } from '@/components/readout'
import { endOfMonth, formatDayMonth, startOfMonth, startOfWeek } from '@/lib/date'
import { InventoryError, inventoryApi } from '@/lib/inventory/api'
import type { ReportGroup, SalesReport } from '@/lib/inventory/types'
import { compareMoney, formatVnd, isNegative, isZero, toPlotNumber } from '@/lib/money'
import { cn } from '@/lib/utils'
import { periodLabel } from './period'
import { SalesChart } from './SalesChart'

type Range = 'week' | 'month' | 'last-month' | 'quarter'

const RANGES: { id: Range; label: string }[] = [
  { id: 'week', label: 'Tuần này' },
  { id: 'month', label: 'Tháng này' },
  { id: 'last-month', label: 'Tháng trước' },
  { id: 'quarter', label: '3 tháng' },
]

const GROUPS: { id: ReportGroup; label: string }[] = [
  { id: 'day', label: 'Ngày' },
  { id: 'week', label: 'Tuần' },
  { id: 'month', label: 'Tháng' },
]

/** The dates of a range, and the grouping that reads best for it. A range never runs past today. */
function rangeOf(range: Range, today: string): { from: string; to: string; group: ReportGroup } {
  switch (range) {
    case 'week':
      return { from: startOfWeek(today), to: today, group: 'day' }
    case 'month':
      return { from: startOfMonth(today), to: today, group: 'day' }
    case 'last-month': {
      const from = startOfMonth(today, -1)
      return { from, to: endOfMonth(from), group: 'day' }
    }
    case 'quarter':
      return { from: startOfMonth(today, -2), to: today, group: 'week' }
  }
}

const SHOWN_PRODUCTS = 8

function rangeTitle(range: Range, from: string, to: string): string {
  return range === 'week' || range === 'month' ? `${RANGES.find((r) => r.id === range)!.label} · ${formatDayMonth(from)} – ${formatDayMonth(to)}` : `${formatDayMonth(from)} – ${formatDayMonth(to)}`
}

export function RevenueScreen() {
  const { today } = useShop()
  const [range, setRange] = useState<Range>('week')
  const [groupChoice, setGroupChoice] = useState<ReportGroup | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [showAllProducts, setShowAllProducts] = useState(false)
  const [showPeriods, setShowPeriods] = useState(false)
  const { from, to, group: defaultGroup } = rangeOf(range, today)
  const group = groupChoice ?? defaultGroup
  const key = `${from}|${to}|${group}|${attempt}`
  const [settled, setSettled] = useState<{ key: string; report: SalesReport | null; error: string | null } | null>(null)

  useEffect(() => {
    const c = new AbortController()
    inventoryApi.report(from, to, group, c.signal).then(
      (report) => !c.signal.aborted && setSettled({ key, report, error: null }),
      (e: unknown) => !c.signal.aborted && setSettled({ key, report: null, error: e instanceof InventoryError ? e.message : 'Đã có lỗi không mong muốn.' }),
    )
    return () => c.abort()
  }, [from, to, group, key])

  const current = settled?.key === key ? settled : null
  const report = current?.report ?? settled?.report ?? null

  const header = <PageHeader title="Doanh thu" />
  const controls = (
    <div role="group" aria-label="Khoảng thời gian" className="flex flex-wrap gap-2">
      {RANGES.map((r) => (
        <Chip
          key={r.id}
          pressed={range === r.id}
          onClick={() => {
            setRange(r.id)
            setGroupChoice(null)
          }}
        >
          {r.label}
        </Chip>
      ))}
    </div>
  )

  if (!report) {
    return (
      <div className="grid gap-5">
        {header}
        {controls}
        {current?.error ? (
          <div role="alert">
            <ErrorState title="Chưa mở được báo cáo doanh thu" description={current.error} onRetry={() => setAttempt((n) => n + 1)} />
          </div>
        ) : (
          <Loading>Đang tính doanh thu…</Loading>
        )}
      </div>
    )
  }

  const { totals } = report
  const loading = current === null
  const sold = totals.saleCount > 0
  const topRevenue = report.products.reduce((max, p) => (compareMoney(p.revenue, max) > 0 ? p.revenue : max), '1')
  const shownProducts = showAllProducts ? report.products : report.products.slice(0, SHOWN_PRODUCTS)
  const periodsSold = report.periods.filter((p) => p.unitsSold > 0 || !isZero(p.revenue)).reverse()
  const groupWord = { day: 'ngày', week: 'tuần', month: 'tháng' }[report.group]

  return (
    <div className="grid gap-5 lg:gap-6">
      {header}
      {controls}

      <div className={cn('grid gap-5 lg:gap-6', loading && 'opacity-60 transition-opacity')} aria-busy={loading}>
        <section aria-label={rangeTitle(range, report.from, report.to)} className="grid gap-3">
          <StatGrid className="sm:grid-cols-3">
            <StatTile label="Bán được" value={formatVnd(totals.revenue)} sub={sold ? `${totals.saleCount} lần bán · ${totals.unitsSold} cái` : undefined} />
            <StatTile label="Tiền vốn của hàng đã bán" value={formatVnd(totals.costOfGoods)} />
            <StatTile label="Lãi từ hàng bán" value={formatVnd(totals.grossProfit)} negative={isNegative(totals.grossProfit)} sub="Chưa trừ thuê mặt bằng, lương, quảng cáo…" />
          </StatGrid>
          {!isZero(report.stockLoss) && (
            <p className="flex items-start gap-2 text-sm text-secondary">
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-caution" />
              <span>
                Hàng hỏng, mất hoặc thiếu khi kiểm kê trong kỳ này trị giá <b className="num text-primary">{formatVnd(report.stockLoss)}</b>, chưa trừ vào lãi ở trên.
              </span>
            </p>
          )}
        </section>

        {!sold ? (
          <EmptyState
            icon={<ChartColumn />}
            title="Chưa có đơn bán nào trong kỳ này"
            action={<Button variant="primary" label="Ghi bán hàng" href={stockHref('ban')} />}
          />
        ) : (
          <>
            <Panel
              title={`Theo ${groupWord}`}
              titleId="chart-title"
              action={
                <SegmentedControl label="Xem theo" size="sm" value={report.group} onChange={(v) => setGroupChoice(v as ReportGroup)}>
                  {GROUPS.map((g) => (
                    <SegmentedControlItem key={g.id} value={g.id} label={g.label} />
                  ))}
                </SegmentedControl>
              }
            >
              <SalesChart periods={report.periods} group={report.group} label={`Doanh thu và lãi theo ${groupWord}`} labelOf={(start) => periodLabel(start, report.group)} />
            </Panel>

            <Panel title="Bán chạy nhất" titleId="products-title" flush>
              <ol className="divide-y border-t">
                {shownProducts.map((p, i) => (
                  <li key={p.productId} className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-3 sm:px-5">
                    <span className="figure num text-lg text-secondary">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="font-semibold break-words text-primary">{p.name}</p>
                      <p className="num text-sm text-secondary">Bán {p.unitsSold} cái</p>
                    </div>
                    <div className="text-right">
                      <p className="num font-semibold">{formatVnd(p.revenue)}</p>
                      <p className={cn('num text-sm', isNegative(p.grossProfit) ? 'text-shortage' : 'text-secondary')}>Lãi {formatVnd(p.grossProfit)}</p>
                    </div>
                    <div className="col-start-2 col-end-4">
                      <ProgressBar label={`Doanh thu của ${p.name} so với món bán nhiều nhất`} isLabelHidden value={Math.max(0, Math.round((toPlotNumber(p.revenue) / toPlotNumber(topRevenue)) * 100))} max={100} variant="accent" />
                    </div>
                  </li>
                ))}
              </ol>
              {report.products.length > SHOWN_PRODUCTS && (
                <div className="border-t px-4 py-3 sm:px-5">
                  <Button variant="secondary" label={showAllProducts ? 'Thu gọn' : `Xem cả ${report.products.length} sản phẩm`} onClick={() => setShowAllProducts(!showAllProducts)} />
                </div>
              )}
            </Panel>

            <Panel title={`Số từng ${groupWord}`} titleId="periods-title" flush>
              <div className="day-toggle border-t">
                <Collapsible isOpen={showPeriods} onOpenChange={setShowPeriods} chevronPosition="start" trigger={<span className="block font-semibold text-secondary">Xem số liệu ({periodsSold.length} {groupWord} có bán)</span>}>
                  <ul className="divide-y border-t">
                    {periodsSold.map((p) => (
                      <li key={p.start} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-4 py-3 sm:px-5">
                        <p className="font-semibold text-primary">{periodLabel(p.start, report.group)}</p>
                        <p className="num text-right font-semibold">{formatVnd(p.revenue)}</p>
                        <p className="num text-sm text-secondary">{p.unitsSold} cái</p>
                        <p className={cn('num text-right text-sm', isNegative(p.grossProfit) ? 'text-shortage' : 'text-secondary')}>Lãi {formatVnd(p.grossProfit)}</p>
                      </li>
                    ))}
                  </ul>
                </Collapsible>
              </div>
            </Panel>
          </>
        )}
      </div>
    </div>
  )
}
