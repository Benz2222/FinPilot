import { useMemo, useState } from 'react'
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react'
import { ArrowDownLeft, ArrowUpRight, TriangleAlert } from 'lucide-react'
import { useElementWidth } from '@/hooks/use-element-width'
import { formatDate, formatDayMonth, formatWeekday } from '@/lib/date'
import { formatCompactVnd, formatVnd, isNegative, isZero, toPlotNumber } from '@/lib/money'
import type { CashEvent, ForecastResponse } from '@/lib/types'
import { cn } from '@/lib/utils'
import { INTRADAY_RISK_NOTE } from '@/screens/forecast/copy'
import { niceTicks } from './scale'

/*
 * Closing balance per day as a step line: each day is a flat step from its start to the next day. Above zero the
 * line is ink over a cyan wash; below zero, and only there, it is red over a red wash. The zero line is the
 * heaviest rule. One day is always selected (first short day, else the lowest); hover, drag, tap or the arrow keys
 * move it, and the readout above the plot shows that day's figures.
 */

const NARROW = 520 // px: below this the plot is shorter and dates are labelled every 14 days
const MARGIN = { top: 26, right: 10, bottom: 26 }

interface BalanceChartProps {
  result: ForecastResponse
  /** Events sent with the request, to name what happens on the selected day. */
  events: CashEvent[]
  /** Picture only: no readout, legend or interaction (auth showcase). */
  interactive?: boolean
  className?: string
}

export function BalanceChart({ result, events, interactive = true, className }: BalanceChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const { days } = result
  const n = days.length
  const values = useMemo(() => days.map((d) => toPlotNumber(d.closing)), [days])
  const lowestIndex = Math.max(0, days.findIndex((d) => d.date === result.lowestBalanceDate))
  const firstIndex = result.firstShortageDate ? days.findIndex((d) => d.date === result.firstShortageDate) : -1
  const defaultIndex = firstIndex >= 0 ? firstIndex : lowestIndex
  const hasShortage = values.some((v) => v < 0)
  const hasRisk = days.some((d) => d.hasIntradayTimingRisk)

  // The pick belongs to one result; a new forecast falls back to its own default day.
  const [pick, setPick] = useState<{ result: ForecastResponse; index: number } | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const selected = hover ?? (pick?.result === result ? pick.index : defaultIndex)

  const narrow = width > 0 && width < NARROW
  const height = interactive ? (narrow ? 232 : 300) : 168
  const { ticks, lo, hi } = useMemo(() => niceTicks(Math.min(0, ...values), Math.max(0, ...values)), [values])
  const left = interactive ? (narrow ? 42 : 50) : 8
  const plotW = Math.max(0, width - left - MARGIN.right)
  const plotH = height - MARGIN.top - MARGIN.bottom
  const bw = plotW / n
  const x = (i: number) => left + i * bw
  const y = (v: number) => MARGIN.top + ((hi - v) / (hi - lo)) * plotH
  const y0 = y(0)

  const paths = (() => {
    if (plotW <= 0) return null
    let line = `M${x(0)} ${y(values[0])}`
    let wash = `M${x(0)} ${y0}`
    for (let i = 0; i < n; i += 1) {
      line += ` H${x(i + 1)}` + (i + 1 < n ? ` V${y(values[i + 1])}` : '')
      wash += ` V${y(Math.max(values[i], 0))} H${x(i + 1)}`
    }
    wash += ` V${y0} Z`
    // Each run of short days: the red stroke from the zero line down and back, and its red wash.
    let red = ''
    let redWash = ''
    for (let i = 0; i < n; i += 1) {
      if (values[i] >= 0 || (i > 0 && values[i - 1] < 0)) continue
      let run = ` M${x(i)} ${y0}`
      let j = i
      for (; j < n && values[j] < 0; j += 1) run += ` V${y(values[j])} H${x(j + 1)}`
      run += ` V${y0}`
      red += run
      redWash += run + ' Z'
    }
    return { line, wash, red, redWash }
  })()

  const eventsById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events])
  const dateStep = narrow ? 14 : 7

  function indexAt(event: PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect()
    return Math.min(n - 1, Math.max(0, Math.floor((event.clientX - box.left - left) / bw)))
  }
  function choose(index: number) {
    setPick({ result, index })
    setHover(null)
  }
  function onKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowDown: -1, ArrowUp: 1, PageDown: -7, PageUp: 7 }
    let next: number | null = null
    if (event.key in step) next = selected + step[event.key]
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = n - 1
    if (next === null) return
    event.preventDefault()
    choose(Math.min(n - 1, Math.max(0, next)))
  }

  const day = days[selected]
  const lowestNeg = values[lowestIndex] < 0
  const shortLabelEnd = firstIndex >= 0 && x(firstIndex) > width - 120

  return (
    <div className={cn('min-w-0', className)}>
      {interactive && (
        <>
          <p className="sr-only">
            Biểu đồ số dư cuối ngày trong {n} ngày, từ {formatDate(days[0].date)} đến {formatDate(days[n - 1].date)}. Số dư thấp nhất{' '}
            {formatVnd(result.lowestBalance)} vào ngày {formatDate(result.lowestBalanceDate)}. Xem bảng chi tiết từng ngày bên dưới để đọc đủ số liệu.
          </p>
          <DayReadout day={day} index={selected} eventsById={eventsById} />
        </>
      )}

      <div ref={ref} style={{ height }} className="relative w-full">
        {paths && (
          <svg
            width={width}
            height={height}
            className={cn('block touch-pan-y select-none', interactive && 'cursor-crosshair')}
            {...(interactive
              ? {
                  role: 'slider',
                  tabIndex: 0,
                  'aria-label': 'Số dư cuối ngày',
                  'aria-valuemin': 0,
                  'aria-valuemax': n - 1,
                  'aria-valuenow': selected,
                  'aria-valuetext': `${formatWeekday(day.date)} ${formatDayMonth(day.date)}: ${formatVnd(day.closing)}`,
                  onPointerMove: (e: PointerEvent<SVGSVGElement>) => (e.pointerType === 'mouse' ? setHover(indexAt(e)) : choose(indexAt(e))),
                  onPointerDown: (e: PointerEvent<SVGSVGElement>) => choose(indexAt(e)),
                  onPointerLeave: () => setHover(null),
                  onKeyDown,
                }
              : { 'aria-hidden': true })}
          >
            {/* Grid and value axis. */}
            {ticks.map((t) => (
              <g key={t}>
                {t !== 0 && <line x1={left} x2={width - MARGIN.right} y1={y(t)} y2={y(t)} stroke="var(--fp-chart-grid)" strokeWidth={1} />}
                {interactive && (
                  <text x={left - 6} y={y(t) + 4} textAnchor="end" className={cn('chart-text', t === 0 && 'font-bold')}>
                    {t === 0 ? '0' : formatCompactVnd(t)}
                  </text>
                )}
              </g>
            ))}

            {/* Selected day's band, behind the data. */}
            {interactive && <rect x={x(selected)} y={MARGIN.top} width={Math.max(bw, 1)} height={plotH} fill="var(--fp-chart-line)" fillOpacity={0.06} />}

            <path d={paths.wash} fill="var(--fp-chart-area)" fillOpacity={0.22} />
            {paths.redWash && <path d={paths.redWash} fill="var(--color-error)" fillOpacity={0.16} />}
            <line x1={left} x2={width - MARGIN.right} y1={y0} y2={y0} stroke="var(--fp-chart-line)" strokeWidth={1.5} />
            <path d={paths.line} fill="none" stroke="var(--fp-chart-line)" strokeWidth={2} strokeLinejoin="round" />
            {paths.red && <path d={paths.red} fill="none" stroke="var(--color-error)" strokeWidth={2.5} strokeLinejoin="round" />}

            {/* First short day: where the red begins. */}
            {firstIndex >= 0 && (
              <g>
                <line x1={x(firstIndex)} x2={x(firstIndex)} y1={MARGIN.top - 6} y2={MARGIN.top + plotH} stroke="var(--color-error)" strokeWidth={1.5} strokeDasharray="4 3" />
                <text
                  x={x(firstIndex) + (shortLabelEnd ? -5 : 5)}
                  y={MARGIN.top - 10}
                  textAnchor={shortLabelEnd ? 'end' : 'start'}
                  className="chart-label"
                  fill="var(--color-error)"
                >
                  THIẾU TỪ {formatDayMonth(result.firstShortageDate!)}
                </text>
              </g>
            )}

            {/* Days with money in and out together. */}
            {days.map((d, i) =>
              d.hasIntradayTimingRisk ? <Diamond key={d.date} cx={x(i) + bw / 2} cy={y(values[i])} r={interactive ? 6 : 4} /> : null,
            )}

            {/* Lowest day: a filled dot. */}
            <circle
              cx={x(lowestIndex) + bw / 2}
              cy={y(values[lowestIndex])}
              r={interactive ? 5.5 : 4}
              fill={lowestNeg ? 'var(--color-error)' : 'var(--fp-chart-line)'}
              stroke="var(--color-background-surface)"
              strokeWidth={2}
            />

            {/* Selected day: a hollow dot on the line and a rule through the plot. */}
            {interactive && (
              <g pointerEvents="none">
                <line
                  x1={x(selected) + bw / 2}
                  x2={x(selected) + bw / 2}
                  y1={MARGIN.top}
                  y2={MARGIN.top + plotH}
                  stroke="var(--fp-chart-line)"
                  strokeWidth={1}
                  strokeOpacity={0.55}
                />
                <circle
                  cx={x(selected) + bw / 2}
                  cy={y(values[selected])}
                  r={6}
                  fill="var(--color-background-surface)"
                  stroke={values[selected] < 0 ? 'var(--color-error)' : 'var(--fp-chart-line)'}
                  strokeWidth={2.5}
                />
              </g>
            )}

            {/* Dates. */}
            {interactive &&
              days.map((d, i) =>
                i % dateStep === 0 ? (
                  <text key={d.date} x={x(i) + bw / 2} y={height - 8} textAnchor={i === 0 ? 'start' : 'middle'} className="chart-text">
                    {formatDayMonth(d.date)}
                  </text>
                ) : null,
              )}
          </svg>
        )}
      </div>

      {interactive && (
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-secondary">
          <LegendItem mark={<path d="M1 8h14" stroke="var(--fp-chart-line)" strokeWidth="2" strokeLinecap="round" />}>Số dư cuối ngày</LegendItem>
          {hasShortage && (
            <LegendItem mark={<path d="M1 8h14" stroke="var(--color-error)" strokeWidth="2.5" strokeLinecap="round" />}>Số dư âm (thiếu tiền)</LegendItem>
          )}
          <LegendItem
            mark={<circle cx="8" cy="8" r="5" fill={lowestNeg ? 'var(--color-error)' : 'var(--fp-chart-line)'} stroke="var(--color-background-surface)" strokeWidth="2" />}
          >
            Ngày thấp nhất
          </LegendItem>
          {hasRisk && <LegendItem mark={<Diamond cx={8} cy={8} r={6} />}>Thu và chi cùng ngày</LegendItem>}
        </ul>
      )}
    </div>
  )
}

/** The selected day: date, closing balance, money in and out, and what happens that day. Fixed height while scrubbing. */
function DayReadout({ day, index, eventsById }: { day: ForecastResponse['days'][number]; index: number; eventsById: Map<string, CashEvent> }) {
  const negative = isNegative(day.closing)
  const dayEvents = day.eventIds.map((id) => eventsById.get(id)).filter((e): e is CashEvent => Boolean(e))
  return (
    <div aria-hidden="true" className="mb-2 grid min-h-[5.25rem] content-start gap-1">
      <p className="num text-sm text-secondary">
        {formatWeekday(day.date)}, {formatDate(day.date)} · Ngày {index}
      </p>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={cn('figure num text-[1.75rem] whitespace-nowrap', negative && 'text-shortage')}>{formatVnd(day.closing)}</span>
        {negative && <span className="text-sm font-semibold text-shortage">Thiếu tiền</span>}
        <span className="num flex flex-wrap gap-x-3 text-sm text-secondary">
          {!isZero(day.inflow) && <span className="whitespace-nowrap">Thu +{formatVnd(day.inflow)}</span>}
          {!isZero(day.outflow) && <span className="whitespace-nowrap">Chi −{formatVnd(day.outflow)}</span>}
        </span>
      </div>
      {(dayEvents.length > 0 || day.hasIntradayTimingRisk) && (
        <ul className="flex min-w-0 flex-wrap gap-x-4 gap-y-0.5 text-sm">
          {dayEvents.map((e) => (
            <li key={e.id} className="flex min-w-0 items-center gap-1.5">
              {e.direction === 'In' ? (
                <ArrowDownLeft aria-hidden="true" className="size-4 shrink-0 text-ok" />
              ) : (
                <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-secondary" />
              )}
              <span className="truncate">{e.label}</span>
            </li>
          ))}
          {day.hasIntradayTimingRisk && (
            <li className="flex min-w-0 items-start gap-1.5 font-medium text-caution">
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {INTRADAY_RISK_NOTE}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

function Diamond({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <path
      d={`M${cx} ${cy - r} L${cx + r} ${cy} L${cx} ${cy + r} L${cx - r} ${cy} Z`}
      fill="var(--astryx-theme-neutral-color-status-fill-warning, #ffb020)"
      stroke="var(--color-background-surface)"
      strokeWidth={2}
      strokeLinejoin="round"
    />
  )
}

function LegendItem({ children, mark }: { children: string; mark: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" className="shrink-0">
        {mark}
      </svg>
      {children}
    </li>
  )
}
