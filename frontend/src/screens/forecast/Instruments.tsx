import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { ForecastDay } from '@/lib/types'

export type Signal = 'ok' | 'caution' | 'shortage' | 'idle'

const LED: Record<Signal, string> = {
  ok: 'bg-ok shadow-[0_0_8px_var(--ok)]',
  caution: 'bg-caution shadow-[0_0_8px_var(--caution)]',
  shortage: 'bg-shortage shadow-[0_0_8px_var(--shortage)]',
  idle: 'bg-muted-foreground/50',
}

/** Status light. Decorative: the state is always also said in text. */
export function Led({ signal, className }: { signal: Signal; className?: string }) {
  return <span aria-hidden="true" className={cn('inline-block size-1.5 shrink-0 rounded-full', LED[signal], className)} />
}

/**
 * One readout of the instrument cluster: placard label, a monospaced figure sized to its cell (so long amounts never
 * overflow a phone column), one line of context and a small gauge underneath.
 */
export function Readout({
  label,
  value,
  sub,
  signal,
  gauge,
  numeric = true,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  signal: Signal
  gauge?: ReactNode
  /** Figures are monospaced readouts; a word ("Không có") stays in the text face. */
  numeric?: boolean
}) {
  return (
    <div className="@container flex min-w-0 flex-col bg-card p-4 sm:p-5">
      <dt className="placard flex items-center gap-2 text-muted-foreground">
        <Led signal={signal} />
        {label}
      </dt>
      <dd
        className={cn(
          numeric && 'num',
          'mt-3 text-[clamp(1rem,10cqi,1.875rem)] leading-none font-medium tracking-tight whitespace-nowrap',
          signal === 'shortage' && 'text-shortage',
        )}
      >
        {value}
      </dd>
      {sub && <dd className="mt-2 text-xs text-muted-foreground">{sub}</dd>}
      {gauge && (
        <dd aria-hidden="true" className="mt-auto pt-4">
          {gauge}
        </dd>
      )}
    </div>
  )
}

/** Where a value sits between the period's lowest and highest balance, with zero marked and the part below it in red. */
export function ScaleGauge({ min, max, value }: { min: number; max: number; value: number }) {
  const lo = Math.min(0, min)
  const span = max - lo || 1
  const at = (v: number) => `${((v - lo) / span) * 100}%`
  const negative = value < 0
  return (
    <div className="relative h-3">
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
      {lo < 0 && <div className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-l-full bg-shortage/35" style={{ width: at(0) }} />}
      {lo < 0 && <div className="absolute inset-y-0 w-px bg-foreground/60" style={{ left: at(0) }} />}
      <div
        className={cn('absolute inset-y-[-2px] w-0.5 -translate-x-1/2 rounded-full', negative ? 'bg-shortage shadow-[0_0_6px_var(--shortage)]' : 'bg-primary')}
        style={{ left: at(value) }}
      />
    </div>
  )
}

/** The 56 days as lights, a week per group: red below zero, amber where money comes in and goes out the same day. */
export function DayStrip({ days }: { days: ForecastDay[] }) {
  return (
    <div className="flex h-3 gap-[2px]">
      {days.map((d, i) => (
        <span
          key={d.date}
          className={cn(
            'min-w-0 flex-1 rounded-[1px]',
            d.closing.startsWith('-') ? 'bg-shortage' : d.hasIntradayTimingRisk ? 'bg-caution' : 'bg-ok/35',
            i % 7 === 6 && i < days.length - 1 && 'mr-[3px]',
          )}
        />
      ))}
    </div>
  )
}

/** Each day's shortfall hanging below a zero line, deepest = full height: how deep and how long the hole is. */
export function DepthTrace({ days, deepest }: { days: ForecastDay[]; deepest: string }) {
  const max = Math.max(1, Number(deepest))
  return (
    <div className="flex h-4 items-start gap-[2px] border-t border-foreground/50">
      {days.map((d) => {
        const short = d.closing.startsWith('-') ? Number(d.closing.slice(1)) : 0
        return <span key={d.date} className="min-w-0 flex-1 rounded-b-[1px] bg-shortage" style={{ height: `${(short / max) * 100}%` }} />
      })}
    </div>
  )
}

/** A bar either side of a centre mark: how far the end of the period lands above or below where it started. */
export function DeltaGauge({ ratio }: { ratio: number }) {
  const width = `${Math.min(1, Math.abs(ratio)) * 50}%`
  return (
    <div className="relative h-3">
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/60" />
      <div
        className={cn('absolute top-1/2 h-1 -translate-y-1/2', ratio < 0 ? 'right-1/2 rounded-l-full bg-shortage' : 'left-1/2 rounded-r-full bg-primary')}
        style={{ width }}
      />
    </div>
  )
}
