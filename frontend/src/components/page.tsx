import type { ReactNode } from 'react'
import { RotateCw } from 'lucide-react'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { EmptyState as AstryxEmptyState } from '@astryxdesign/core/EmptyState'
import { Icon } from '@astryxdesign/core/Icon'
import { Skeleton as AstryxSkeleton } from '@astryxdesign/core/Skeleton'
import { Spinner } from '@astryxdesign/core/Spinner'
import { cn } from '@/lib/utils'

/** Screen title (focused on navigation) and the screen's main actions. No description line. */
export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      {/* tabIndex lets navigation move focus here. */}
      <h1 id="screen-title" tabIndex={-1} className="page-title min-w-0 outline-none">
        {title}
      </h1>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

/**
 * A card (Astryx Card in the theme's ink frame) with an optional title row. `flush` drops the body padding for
 * lists and tables that run edge to edge; the title row keeps its own.
 */
export function Panel({
  title,
  titleId,
  action,
  flush = false,
  as: As = 'section',
  className,
  bodyClassName,
  children,
}: {
  title?: ReactNode
  titleId?: string
  action?: ReactNode
  flush?: boolean
  as?: 'section' | 'div'
  className?: string
  bodyClassName?: string
  children: ReactNode
}) {
  return (
    <Card padding={0} className={cn('min-w-0 overflow-hidden', className)}>
      <As aria-labelledby={title && titleId ? titleId : undefined}>
        {title && (
          <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 pt-4 sm:px-5">
            <h2 id={titleId} className="section-title min-w-0">
              {title}
            </h2>
            {action}
          </div>
        )}
        <div className={cn(!flush && 'p-4 sm:p-5', flush && title && 'pt-3', bodyClassName)}>{children}</div>
      </As>
    </Card>
  )
}

/** Nothing here yet: one line and the one action that fills it. On its own card, or `bare` inside one. */
export function EmptyState({ icon, title, action, bare = false, className }: { icon?: ReactNode; title: string; action?: ReactNode; bare?: boolean; className?: string }) {
  const body = <AstryxEmptyState icon={icon} title={title} actions={action} />
  if (bare) return body
  return (
    <Card padding={0} className={cn('px-4 py-8', className)}>
      {body}
    </Card>
  )
}

/** A failed load: what went wrong and a retry. */
export function ErrorState({ title, description, onRetry, retryLabel = 'Thử lại' }: { title: string; description?: ReactNode; onRetry?: () => void; retryLabel?: string }) {
  return (
    <Banner
      status="error"
      title={title}
      description={description}
      endContent={onRetry && <Button size="sm" label={retryLabel} icon={<Icon icon={RotateCw} />} onClick={onRetry} />}
    />
  )
}

export function Loading({ children = 'Đang tải…', className }: { children?: ReactNode; className?: string }) {
  return (
    <p role="status" className={cn('flex items-center justify-center gap-2 py-16 text-sm text-secondary', className)}>
      <span aria-hidden="true" className="inline-flex">
        <Spinner size="md" />
      </span>
      {children}
    </p>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={className}>
      <AstryxSkeleton radius={2} />
    </div>
  )
}
