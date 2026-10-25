import { Badge } from '@astryxdesign/core/Badge'
import { formatDayMonth } from '@/lib/date'
import { inDays } from '@/lib/explain'
import { formatMoneyWords, formatVnd, isNegative, isZero, subtractMoney, toPlotNumber } from '@/lib/money'
import type { ScenarioOutcome } from '@/lib/shop'
import { cn } from '@/lib/utils'

/*
 * "Hiện tại" against each scenario, one row each. Two figures get a picture on a scale shared by every row:
 * the lowest balance as a bar from zero (red only when it is below zero) and the days short of money as red spans
 * on the period's track. The other two are plain figures. States facts; ranks nothing.
 */

export interface CompareRow {
  key: string
  name: string
  outcome: ScenarioOutcome | null
  stale?: boolean
}

const COLUMNS = ['Số dư thấp nhất', 'Ngày đầu thiếu', 'Thiếu lớn nhất', 'Số dư ngày 56']
const GRID = '@2xl:grid-cols-[minmax(8rem,1.1fr)_minmax(9rem,1.4fr)_minmax(9rem,1.4fr)_minmax(6.5rem,1fr)_minmax(6.5rem,1fr)]'

export function ScenarioCompare({ rows, today, label = 'So sánh các kịch bản' }: { rows: CompareRow[]; today: string; label?: string }) {
  const base = rows[0]?.outcome ?? null
  const lows = rows.flatMap((r) => (r.outcome ? [toPlotNumber(r.outcome.lowestBalance)] : []))
  const min = Math.min(0, ...lows)
  const max = Math.max(0, ...lows)
  const span = max - min || 1
  const zero = ((0 - min) / span) * 100

  return (
    <div role="group" aria-label={label} className="@container min-w-0">
      <div aria-hidden="true" className={cn('hidden gap-x-5 border-b px-5 pb-2 text-sm font-medium text-secondary @2xl:grid', GRID)}>
        <span />
        {COLUMNS.map((c) => (
          <span key={c} className={c === COLUMNS[2] || c === COLUMNS[3] ? 'text-right' : undefined}>
            {c}
          </span>
        ))}
      </div>
      <ul className="divide-y">
        {rows.map((row, i) => {
          const o = row.outcome
          return (
            <li key={row.key} className={cn('grid gap-x-5 gap-y-3 px-4 py-4 @2xl:items-center @2xl:px-5', GRID, i === 0 && 'bg-muted')}>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="font-semibold break-words">{row.name}</span>
                {row.stale && <Badge variant="warning" label="Cần tính lại" />}
              </div>
              {o ? (
                <dl className="col-span-full grid grid-cols-2 gap-x-4 gap-y-3 @2xl:contents">
                    <Metric label={COLUMNS[0]}>
                      <span className={cn('num font-semibold whitespace-nowrap', isNegative(o.lowestBalance) && 'text-shortage')}>{formatVnd(o.lowestBalance)}</span>
                      <LowBar value={toPlotNumber(o.lowestBalance)} min={min} span={span} zero={zero} />
                      {i > 0 && base && <Delta value={o.lowestBalance} base={base.lowestBalance} />}
                    </Metric>
                    <Metric label={COLUMNS[1]}>
                      {o.firstShortageDate ? (
                        <span className="num font-semibold whitespace-nowrap text-shortage">
                          {formatDayMonth(o.firstShortageDate)} <span className="font-normal text-secondary">· {inDays(o.firstShortageDate, today)}</span>
                        </span>
                      ) : (
                        <span className="text-secondary">Không có</span>
                      )}
                      <ShortTrack closings={o.closings} />
                    </Metric>
                    <Metric label={COLUMNS[2]} end>
                      <span className={cn('num font-semibold whitespace-nowrap', !isZero(o.maxShortage) && 'text-shortage')}>{formatVnd(o.maxShortage)}</span>
                    </Metric>
                    <Metric label={COLUMNS[3]} end>
                      <span className={cn('num font-semibold whitespace-nowrap', isNegative(o.endingBalance) && 'text-shortage')}>{formatVnd(o.endingBalance)}</span>
                      {i > 0 && base && <Delta value={o.endingBalance} base={base.endingBalance} />}
                    </Metric>
                </dl>
              ) : (
                <p className="col-span-full text-sm text-secondary @2xl:col-span-4">Đang tính…</p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Metric({ label, end = false, children }: { label: string; end?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn('grid min-w-0 content-start gap-1.5', end && '@2xl:justify-items-end @2xl:text-right')}>
      <dt className="text-xs font-medium text-secondary @2xl:sr-only">{label}</dt>
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
export function Delta({ value, base }: { value: string; base: string }) {
  const d = subtractMoney(value, base)
  if (isZero(d)) return <span className="text-xs text-secondary">như hiện tại</span>
  const up = !isNegative(d)
  return (
    <span className={cn('text-xs font-medium', up ? 'text-ok' : 'text-shortage')}>
      {up ? '▲ ' : '▼ '}
      {formatMoneyWords(d.replace(/^-/, ''))} so với hiện tại
    </span>
  )
}
