import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type Signal = 'ok' | 'caution' | 'shortage' | 'info' | 'idle'

const LED: Record<Signal, string> = {
  ok: 'bg-ok shadow-[0_0_8px_var(--ok)]',
  caution: 'bg-caution shadow-[0_0_8px_var(--caution)]',
  shortage: 'bg-shortage shadow-[0_0_8px_var(--shortage)]',
  info: 'bg-primary shadow-[0_0_8px_var(--primary)]',
  idle: 'bg-muted-foreground/50',
}

/** Status light. Decorative: the state is always also said in text. */
export function Led({ signal, className }: { signal: Signal; className?: string }) {
  return <span aria-hidden="true" className={cn('inline-block size-1.5 shrink-0 rounded-full', LED[signal], className)} />
}

/**
 * One readout of an instrument cluster: placard label, a monospaced figure sized to its cell (so long amounts never
 * overflow a phone column), one line of context and an optional gauge underneath. Put several in a `ReadoutPanel`.
 */
export function Readout({
  label,
  value,
  sub,
  signal,
  gauge,
  action,
  numeric = true,
  valueClassName,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  signal: Signal
  gauge?: ReactNode
  /** A small control beside the label (e.g. "Cập nhật"). */
  action?: ReactNode
  /** Figures are monospaced readouts; a word ("Không có") stays in the text face. */
  numeric?: boolean
  valueClassName?: string
}) {
  return (
    <div className="@container flex min-w-0 flex-col bg-card p-4 sm:p-5">
      <div className="flex min-h-5 items-center justify-between gap-2">
        <dt className="placard flex items-center gap-2 text-muted-foreground">
          <Led signal={signal} />
          {label}
        </dt>
        {action}
      </div>
      <dd
        className={cn(
          numeric && 'num',
          'mt-3 text-[clamp(1rem,10cqi,1.875rem)] leading-none font-medium tracking-tight whitespace-nowrap',
          signal === 'shortage' && 'text-shortage',
          valueClassName,
        )}
      >
        {value}
      </dd>
      {sub && <dd className="mt-2 text-xs leading-relaxed text-muted-foreground">{sub}</dd>}
      {gauge && (
        <dd aria-hidden="true" className="mt-auto pt-4">
          {gauge}
        </dd>
      )}
    </div>
  )
}

/** Readouts side by side in one panel, hairlines between them. */
export function ReadoutPanel({ className, children }: { className?: string; children: ReactNode }) {
  return <dl className={cn('grid gap-px overflow-hidden rounded-lg border bg-border', className)}>{children}</dl>
}
