import type { ReactNode } from 'react'
import { Card } from '@astryxdesign/core/Card'
import { cn } from '@/lib/utils'

/**
 * One key figure on a white tile: label, the figure in the heading face and at most one short fact under it. On a
 * phone the tile is a row (label left, figure right); from `sm` up it stacks. `negative` paints the figure red;
 * nothing else does. Put several in a `StatGrid`.
 */
export function StatTile({
  label,
  value,
  sub,
  negative = false,
  numeric = true,
  action,
  className,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  negative?: boolean
  /** Figures use tabular digits; a word ("Không có") does not need them. */
  numeric?: boolean
  /** A small control under the figure. */
  action?: ReactNode
  className?: string
}) {
  return (
    <Card
      padding={0}
      className={cn(
        '@container grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-4 py-3 sm:grid-cols-1 sm:content-start sm:items-start sm:px-5 sm:py-4',
        className,
      )}
    >
      <dt className="text-sm font-medium text-secondary">{label}</dt>
      <dd
        className={cn(
          'figure row-span-2 text-right text-xl whitespace-nowrap sm:row-span-1 sm:mt-1 sm:text-left sm:text-[clamp(1.25rem,10cqi,2rem)]',
          numeric && 'num',
          negative && 'text-shortage',
        )}
      >
        {value}
      </dd>
      {sub && <dd className="num text-sm text-secondary">{sub}</dd>}
      {action && <dd className="col-span-full mt-2">{action}</dd>}
    </Card>
  )
}

/** Key figures: stacked on a phone, side by side from `sm`. */
export function StatGrid({ className, children }: { className?: string; children: ReactNode }) {
  return <dl className={cn('grid gap-2 sm:gap-3', className)}>{children}</dl>
}
