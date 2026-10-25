import { cn } from '@/lib/utils'

/** FinPilot mark: a balance line stepping down and recovering, on the accent square. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className={cn('size-8 shrink-0', className)}>
      <rect width="32" height="32" rx="8" fill="var(--fp-brand)" />
      <path d="M7 12h5l4 8h3l3-6h3" fill="none" stroke="var(--fp-brand-ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 23h18" stroke="var(--fp-brand-ink)" strokeOpacity=".45" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <BrandMark />
      <span className="font-display text-lg font-bold tracking-tight">FinPilot</span>
    </span>
  )
}
