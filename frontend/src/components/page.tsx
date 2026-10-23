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
        {description && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

/** Something that is not there yet: what will appear, and the one action that makes it appear. */
export function EmptyState({ icon, title, children, action, className }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('grid justify-items-center gap-2 rounded-lg border border-dashed border-input/70 bg-glass px-6 py-10 text-center', className)}>
      {icon && <div className="mb-1 grid size-11 place-items-center rounded-md border border-primary/30 bg-primary-soft text-primary [&_svg]:size-5">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {children && <div className="max-w-md text-sm leading-relaxed text-secondary-foreground">{children}</div>}
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
