import type { ComponentProps, ReactNode } from 'react'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Direction } from '@/lib/types'

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="mt-1.5 text-[0.8125rem] text-destructive">
      {message}
    </p>
  )
}

export function FieldLabel({ className, ...props }: ComponentProps<'label'>) {
  return <label className={cn('mb-1.5 block text-sm font-medium text-secondary-foreground', className)} {...props} />
}

/** Label, control and its error message, wired by id. */
export function Field({ id, label, error, hint, children, className }: { id: string; label: ReactNode; error?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {hint && !error && <p className="mt-1.5 text-[0.8125rem] text-muted-foreground">{hint}</p>}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  )
}

/** Text input that marks itself invalid and points at its error message. */
export function TextField({ id, error, ...props }: ComponentProps<'input'> & { id: string; error?: string }) {
  return (
    <>
      <Input id={id} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} {...props} />
      <FieldError id={`${id}-error`} message={error} />
    </>
  )
}

/** Native date input styled like the other controls. */
export function DateInput({ invalid, describedBy, className, ...props }: Omit<ComponentProps<'input'>, 'type'> & { invalid?: boolean; describedBy?: string }) {
  return (
    <Input
      type="date"
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? describedBy : undefined}
      className={cn('num', className)}
      {...props}
    />
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
    { value: 'Out', label: 'Chi ra', icon: <ArrowUpRight aria-hidden="true" className="size-4" />, on: 'peer-checked:bg-card peer-checked:text-foreground peer-checked:shadow-sm peer-checked:ring-1 peer-checked:ring-border' },
    { value: 'In', label: 'Thu về', icon: <ArrowDownLeft aria-hidden="true" className="size-4" />, on: 'peer-checked:bg-card peer-checked:text-ok peer-checked:shadow-sm peer-checked:ring-1 peer-checked:ring-border' },
  ]
  return (
    <fieldset aria-describedby={error ? `${name}-error` : undefined}>
      <legend className="sr-only">{legend}</legend>
      <div className="inline-flex rounded-lg bg-muted p-1">
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
              className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-ring ${o.on}`}
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
