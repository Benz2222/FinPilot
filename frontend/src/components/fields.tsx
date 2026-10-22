import type { ComponentProps, ReactNode } from 'react'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Direction } from '@/lib/types'

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="mt-1 text-xs font-medium text-destructive">
      {message}
    </p>
  )
}

export function TextField({
  id,
  error,
  className,
  ...props
}: ComponentProps<'input'> & { id: string; error?: string }) {
  return (
    <>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          'h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 text-base text-ink shadow-[inset_0_1px_0_rgb(16_27_51/0.05)] outline-none placeholder:text-ink-3/80 focus-visible:border-magenta aria-invalid:border-destructive aria-invalid:bg-destructive/5',
          className,
        )}
        {...props}
      />
      <FieldError id={`${id}-error`} message={error} />
    </>
  )
}

/** Thu / Chi as a two-option radio group (keyboard: arrows move, space selects). */
export function DirectionToggle({
  name,
  value,
  onChange,
  error,
  legend,
}: {
  name: string
  value: Direction | ''
  onChange: (d: Direction) => void
  error?: string
  legend: ReactNode
}) {
  const options: { value: Direction; label: string; icon: ReactNode; on: string }[] = [
    { value: 'Out', label: 'Chi ra', icon: <ArrowUpRight aria-hidden="true" className="size-4" />, on: 'peer-checked:bg-ink peer-checked:text-paper peer-checked:border-ink' },
    { value: 'In', label: 'Thu về', icon: <ArrowDownLeft aria-hidden="true" className="size-4" />, on: 'peer-checked:bg-jade peer-checked:text-white peer-checked:border-jade' },
  ]
  return (
    <fieldset aria-describedby={error ? `${name}-error` : undefined}>
      <legend className="sr-only">{legend}</legend>
      <div className="inline-flex rounded-lg border border-input bg-card p-0.5">
        {options.map((o) => (
          <label key={o.value} className="relative">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              aria-invalid={error ? true : undefined}
              className="peer absolute inset-0 opacity-0"
            />
            <span
              className={`flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-transparent px-3 text-sm font-semibold text-ink-2 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-magenta ${o.on}`}
            >
              {o.icon}
              {o.label}
            </span>
          </label>
        ))}
      </div>
      <FieldError id={`${name}-error`} message={error} />
    </fieldset>
  )
}
