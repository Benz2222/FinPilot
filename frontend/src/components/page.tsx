import type { ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Screen title (focused on navigation), one-line purpose and the screen's main actions. */
export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <p className="placard mb-2 text-primary">{eyebrow}</p>}
        <h1 id="screen-title" tabIndex={-1} className="text-xl font-semibold tracking-tight outline-none sm:text-2xl">
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

/** A metric in a card: small label, large tabular figure, one line of context. */
export function Stat({ label, value, sub, tone, className }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'danger' | 'ok'; className?: string }) {
  return (
    <div className={cn('min-w-0 rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgb(16_24_40/0.05)]', tone === 'danger' && 'border-shortage-line', className)}>
      <dt className="text-[0.8125rem] font-medium text-muted-foreground">{label}</dt>
      <dd className={cn('num mt-1.5 text-xl font-semibold tracking-tight whitespace-nowrap sm:text-2xl', tone === 'danger' && 'text-shortage', tone === 'ok' && 'text-ok')}>
        {value}
      </dd>
      {sub && <dd className="mt-1 text-[0.8125rem] text-muted-foreground">{sub}</dd>}
    </div>
  )
}

/** Something that is not there yet: what will appear, and the one action that makes it appear. */
export function EmptyState({ icon, title, children, action, className }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('grid justify-items-center gap-2 rounded-xl border border-dashed bg-card px-6 py-10 text-center', className)}>
      {icon && <div className="mb-1 grid size-10 place-items-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {children && <div className="max-w-md text-sm text-muted-foreground">{children}</div>}
      {action && <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  )
}

export function Loading({ children = 'Đang tải…', className }: { children?: ReactNode; className?: string }) {
  return (
    <p role="status" className={cn('flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground', className)}>
      <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />
      {children}
    </p>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('rounded-md bg-muted motion-safe:animate-pulse', className)} />
}
