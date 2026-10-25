import { Badge } from '@astryxdesign/core/Badge'
import { formatDayMonth } from '@/lib/date'
import { inDays } from '@/lib/explain'
import { absMoney, formatMoneyWords, isNegative, isZero, subtractMoney, toPlotNumber } from '@/lib/money'
import type { ScenarioOutcome } from '@/lib/shop'
import { cn } from '@/lib/utils'

/*
 * "Hiện tại" against each scenario, one row each, so the options read down one column. Each row says when money first
 * runs short and how low it gets ("thiếu 12 triệu" or "còn 6 triệu"), each with a picture on a scale shared by every
 * row: the short days as red spans on the period's track, and the lowest balance as a bar from zero (red only below
 * zero). Wider containers add the closing balance and each figure's difference from "Hiện tại". States facts; ranks
 * nothing.
 */

export interface CompareRow {
  key: string
  name: string
  outcome: ScenarioOutcome | null
  stale?: boolean
}

const GRID = 'grid-cols-2 @2xl:grid-cols-[minmax(8rem,1.2fr)_minmax(9rem,1.3fr)_minmax(9rem,1.3fr)_minmax(7rem,1fr)]'

export function ScenarioCompare({ rows, today, label = 'So sánh các kịch bản' }: { rows: CompareRow[]; today: string; label?: string }) {
  const base = rows[0]?.outcome ?? null
  const lows = rows.flatMap((r) => (r.outcome ? [toPlotNumber(r.outcome.lowestBalance)] : []))
  const min = Math.min(0, ...lows)
  const max = Math.max(0, ...lows)
  const span = max - min || 1
  const zero = ((0 - min) / span) * 100

  return (
    <div role="group" aria-label={label} className="@container min-w-0">
      <div aria-hidden="true" className={cn('grid gap-x-4 border-b px-4 pb-2 text-sm font-medium text-secondary @2xl:gap-x-5 @2xl:px-5', GRID)}>
        <span className="hidden @2xl:block" />
        <span>Thiếu từ</span>
        <span>Thấp nhất</span>
        <span className="hidden text-right @2xl:block">Cuối kỳ</span>
      </div>
      <ul className="divide-y">
        {rows.map((row, i) => {
          const o = row.outcome
          return (
            <li key={row.key} className={cn('grid gap-x-4 gap-y-2 px-4 py-3 @2xl:items-center @2xl:gap-x-5 @2xl:px-5 @2xl:py-4', GRID, i === 0 && 'bg-muted')}>
              <div className="col-span-full flex min-w-0 flex-wrap items-center gap-2 @2xl:col-span-1">
                <span className="font-semibold break-words">{row.name}</span>
                {row.stale && <Badge variant="warning" label="Cần tính lại" />}
              </div>
              {o ? (
                <dl className="col-span-full grid grid-cols-subgrid gap-y-2 @2xl:contents">
                  <Metric label="Thiếu từ">
                    {o.firstShortageDate ? (
                      <span className="num">
                        <span className="font-semibold whitespace-nowrap text-shortage">{formatDayMonth(o.firstShortageDate)}</span>{' '}
                        <span className="text-sm whitespace-nowrap text-secondary">{inDays(o.firstShortageDate, today)}</span>
                      </span>
                    ) : (
                      <span className="font-semibold text-ok">Không thiếu</span>
                    )}
                    <ShortTrack closings={o.closings} />
                  </Metric>
                  <Metric label="Thấp nhất">
                    <span className={cn('num font-semibold', isNegative(o.lowestBalance) && 'text-shortage')}>
                      {isNegative(o.lowestBalance) ? 'thiếu' : 'còn'} <span className="whitespace-nowrap">{formatMoneyWords(absMoney(o.lowestBalance))}</span>
                    </span>
                    <LowBar value={toPlotNumber(o.lowestBalance)} min={min} span={span} zero={zero} />
                    {i > 0 && base && <Delta value={o.lowestBalance} base={base.lowestBalance} className="hidden @2xl:block" />}
                  </Metric>
                  <Metric label="Cuối kỳ" className="hidden @2xl:grid @2xl:justify-items-end @2xl:text-right">
                    <span className={cn('num font-semibold whitespace-nowrap', isNegative(o.endingBalance) && 'text-shortage')}>{formatMoneyWords(o.endingBalance)}</span>
                    {i > 0 && base && <Delta value={o.endingBalance} base={base.endingBalance} />}
                  </Metric>
                </dl>
              ) : (
                <p className="col-span-full text-sm text-secondary @2xl:col-span-3">Đang tính…</p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Metric({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('grid min-w-0 content-start gap-1.5', className)}>
      <dt className="sr-only">{label}</dt>
      <dd className="grid min-w-0 gap-1.5">{children}</dd>
    </div>
  )
}

/** Lowest balance as a bar from the shared zero; red only below zero. */
function LowBar({ value, min, span, zero }: { value: number; min: number; span: number; zero: number }) {
  const at = ((value - min) / span) * 100
  const from = Math.min(at, zero)
  const width = Math.max(Math.abs(at - zero), 0.8)
  return (
    <span aria-hidden="true" className="relative block h-3 rounded-full border border-border bg-surface">
      <span className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-[var(--fp-chart-line)]" style={{ left: `${zero}%` }} />
      <span className={cn('absolute inset-y-0 rounded-full', value < 0 ? 'bg-shortage' : 'bg-brand')} style={{ left: `${from}%`, width: `${width}%` }} />
    </span>
  )
}

/** The period as a track; red spans are the days that close below zero. */
function ShortTrack({ closings }: { closings: string[] }) {
  const n = closings.length || 1
  const runs: [number, number][] = []
  closings.forEach((c, i) => {
    if (!isNegative(c)) return
    const last = runs[runs.length - 1]
    if (last && last[1] === i) last[1] = i + 1
    else runs.push([i, i + 1])
  })
  return (
    <span aria-hidden="true" className="relative block h-3 overflow-hidden rounded-full border border-border bg-surface">
      {runs.map(([a, b]) => (
        <span key={a} className="absolute inset-y-0 rounded-full bg-shortage" style={{ left: `${(a / n) * 100}%`, width: `${((b - a) / n) * 100}%` }} />
      ))}
    </span>
  )
}

/** Difference from "Hiện tại" for the same figure. */
export function Delta({ value, base, className }: { value: string; base: string; className?: string }) {
  const d = subtractMoney(value, base)
  if (isZero(d)) return <span className={cn('text-xs text-secondary', className)}>như hiện tại</span>
  const up = !isNegative(d)
  return (
    <span className={cn('text-xs font-medium', up ? 'text-ok' : 'text-shortage', className)}>
      {up ? '▲ ' : '▼ '}
      {formatMoneyWords(d.replace(/^-/, ''))} so với hiện tại
    </span>
  )
}
