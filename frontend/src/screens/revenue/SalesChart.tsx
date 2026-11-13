import { useMemo, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { niceTicks } from '@/components/charts/scale'
import { useElementWidth } from '@/hooks/use-element-width'
import { formatDayMonth, formatMonthYear } from '@/lib/date'
import type { ReportFigures, ReportGroup } from '@/lib/inventory/types'
import { formatCompactVnd, formatVnd, isNegative, toPlotNumber } from '@/lib/money'
import { cn } from '@/lib/utils'

export type Period = ReportFigures & { start: string }

const MARGIN = { top: 10, right: 6, bottom: 24 }

/**
 * What she sold and what she made in each day, week or month: a wide bar for the sales and a narrower ink bar
 * inside it for the profit. One period is always picked (tap, hover or arrow keys) and its figures are read out above.
 */
export function SalesChart({ periods, group, label, labelOf }: { periods: Period[]; group: ReportGroup; label: string; labelOf: (start: string) => string }) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const n = periods.length
  const revenue = useMemo(() => periods.map((p) => toPlotNumber(p.revenue)), [periods])
  const profit = useMemo(() => periods.map((p) => toPlotNumber(p.grossProfit)), [periods])
  const lastSold = periods.reduce((found, p, i) => (p.unitsSold > 0 ? i : found), n - 1)
  const [pick, setPick] = useState<{ periods: Period[]; index: number } | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const selected = hover ?? (pick?.periods === periods ? pick.index : lastSold)

  const narrow = width > 0 && width < 520
  const height = narrow ? 200 : 260
  const left = narrow ? 40 : 48
  const { ticks, lo, hi } = useMemo(() => niceTicks(Math.min(0, ...profit), Math.max(0, ...revenue)), [profit, revenue])
  const plotW = Math.max(0, width - left - MARGIN.right)
  const plotH = height - MARGIN.top - MARGIN.bottom
  const bw = n > 0 ? plotW / n : 0
  const barW = Math.max(2, Math.min(bw * 0.72, 56))
  const x = (i: number) => left + i * bw + (bw - barW) / 2
  const y = (v: number) => MARGIN.top + ((hi - v) / (hi - lo)) * plotH
  const y0 = y(0)
  const labelStep = Math.max(1, Math.ceil(52 / Math.max(bw, 1)))

  const p = periods[selected]

  function indexAt(event: PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect()
    return Math.min(n - 1, Math.max(0, Math.floor((event.clientX - box.left - left) / bw)))
  }
  function choose(index: number) {
    setPick({ periods, index })
    setHover(null)
  }
  function onKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowDown: -1, ArrowUp: 1 }
    let next: number | null = null
    if (event.key in step) next = selected + step[event.key]
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = n - 1
    if (next === null) return
    event.preventDefault()
    choose(Math.min(n - 1, Math.max(0, next)))
  }

  return (
    <div className="min-w-0">
      <div aria-live="polite" className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-bold">{labelOf(p.start)}</p>
        <p className="num text-sm text-secondary">
          Bán <b className="text-primary">{formatVnd(p.revenue)}</b> · Lãi <b className={isNegative(p.grossProfit) ? 'text-shortage' : 'text-primary'}>{formatVnd(p.grossProfit)}</b>
        </p>
      </div>
      <ul aria-hidden="true" className="mt-2 flex gap-4 text-sm text-secondary">
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-brand" />
          Bán được
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-[var(--color-text-primary)]" />
          Lãi
        </li>
      </ul>
      <div ref={ref} style={{ height }} className="relative mt-2 w-full">
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="slider"
            tabIndex={0}
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={n - 1}
            aria-valuenow={selected}
            aria-valuetext={`${labelOf(p.start)}: bán ${formatVnd(p.revenue)}, lãi ${formatVnd(p.grossProfit)}`}
            className="block cursor-crosshair touch-pan-y select-none"
            onPointerMove={(e) => e.pointerType === 'mouse' && setHover(indexAt(e))}
            onPointerLeave={() => setHover(null)}
            onPointerDown={(e) => choose(indexAt(e))}
            onKeyDown={onKeyDown}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={left} x2={width - MARGIN.right} y1={y(t)} y2={y(t)} className={t === 0 ? 'stroke-[var(--color-border-emphasized)]' : 'stroke-[var(--color-border)]'} strokeWidth={t === 0 ? 2 : 1} />
                <text x={left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" className="chart-text">
                  {formatCompactVnd(t)}
                </text>
              </g>
            ))}
            <rect x={left + selected * bw} y={MARGIN.top} width={bw} height={plotH} className="fill-[var(--color-accent-muted)]" />
            {periods.map((period, i) => (
              <g key={period.start}>
                {revenue[i] > 0 && <rect x={x(i)} y={y(revenue[i])} width={barW} height={Math.max(1, y0 - y(revenue[i]))} rx={2} className="fill-brand stroke-[var(--color-border-emphasized)]" strokeWidth={1} />}
                {profit[i] !== 0 && (
                  <rect
                    x={x(i) + barW * 0.25}
                    y={profit[i] > 0 ? y(profit[i]) : y0}
                    width={barW * 0.5}
                    height={Math.max(1, Math.abs(y(profit[i]) - y0))}
                    className={profit[i] > 0 ? 'fill-[var(--color-text-primary)]' : 'fill-[var(--color-error)]'}
                  />
                )}
                {i % labelStep === 0 && (
                  <text x={left + i * bw + bw / 2} y={height - 6} textAnchor="middle" className={cn('chart-text', i === selected && 'font-bold')}>
                    {group === 'month' ? formatMonthYear(period.start).replace(/\/20/, '/') : formatDayMonth(period.start)}
                  </text>
                )}
              </g>
            ))}
          </svg>
        )}
      </div>
    </div>
  )
}
