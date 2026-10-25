import { useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import { ArrowDownLeft, ArrowUpRight, CircleX, Eye, EyeOff } from 'lucide-react'
import { Icon } from '@astryxdesign/core/Icon'
import { IconButton } from '@astryxdesign/core/IconButton'
import { TextInput } from '@astryxdesign/core/TextInput'
import { cn } from '@/lib/utils'
import type { Direction } from '@/lib/types'

/*
 * Form fields. Plain text goes through Astryx TextInput; money, dates and selects are native controls drawn with
 * `.fp-input` to match it. Every field takes an `id`, shows its own error and marks itself `aria-invalid`, so a form
 * can focus its first invalid field.
 */

/** A field's error, drawn like the Astryx TextInput status message so every field fails the same way. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="mt-2 flex items-start gap-1.5 rounded-[var(--radius-element)] bg-error-muted px-2 py-2 text-sm text-shortage">
      <CircleX aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  )
}

export function FieldLabel({ className, ...props }: ComponentProps<'label'>) {
  return <label className={cn('mb-1.5 block text-[length:var(--text-label-size)] font-medium text-secondary', className)} {...props} />
}

/** Label, any control and its error, wired by id (the control sets `aria-describedby` to `${id}-error`). */
export function Field({ id, label, error, hint, children, className }: { id: string; label: ReactNode; error?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {hint && !error && <p className="mt-1.5 text-sm text-secondary">{hint}</p>}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  )
}

type TextFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  description?: string
  isOptional?: boolean
  type?: 'text' | 'email'
  placeholder?: string
  autoComplete?: string
  inputMode?: ComponentProps<'input'>['inputMode']
  maxLength?: number
  isDisabled?: boolean
  isLabelHidden?: boolean
  hasAutoFocus?: boolean
}

/** One line of text: Astryx TextInput at the large size, with its label and error. */
export function TextField({ id, label, value, onChange, error, description, isOptional, type = 'text', placeholder, autoComplete, inputMode, maxLength, isDisabled, isLabelHidden, hasAutoFocus }: TextFieldProps) {
  return (
    <TextInput
      id={id}
      size="lg"
      type={type}
      label={label}
      isLabelHidden={isLabelHidden}
      description={description}
      isOptional={isOptional}
      value={value}
      onChange={(v) => onChange(v)}
      status={error ? { type: 'error', message: error } : undefined}
      statusVariant="detached"
      placeholder={placeholder}
      autoComplete={autoComplete}
      isDisabled={isDisabled}
      hasAutoFocus={hasAutoFocus}
      {...({ inputMode, maxLength } as object)}
    />
  )
}

/** Password input with a show/hide button, no label (for a label row with its own link). The value never leaves component state. */
export function PasswordInput({ id, value, onChange, error, autoComplete }: { id: string; value: string; onChange: (value: string) => void; error?: string; autoComplete: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="fp-input pr-12"
      />
      <span className="absolute inset-y-0 right-1 flex items-center">
        <IconButton
          variant="ghost"
          label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={visible}
          icon={<Icon icon={visible ? EyeOff : Eye} />}
          onClick={() => setVisible((v) => !v)}
        />
      </span>
    </div>
  )
}

/** Labelled password field with its error and an optional hint. */
export function PasswordField({ id, label, hint, error, ...input }: { id: string; label: string; value: string; onChange: (value: string) => void; error?: string; autoComplete: string; hint?: string }) {
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <PasswordInput id={id} error={error} {...input} />
    </Field>
  )
}

/** Native date picker drawn as an Astryx input. */
export function DateInput({ invalid, describedBy, className, ...props }: Omit<ComponentProps<'input'>, 'type'> & { invalid?: boolean; describedBy?: string }) {
  return (
    <input
      type="date"
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? describedBy : undefined}
      className={cn('fp-input num', className)}
      {...props}
    />
  )
}

/** Native select drawn as an Astryx input. */
export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn('fp-input', className)} {...props} />
}

/** A quick pick that fills a field (name suggestions, date shortcuts). */
export function Chip({ pressed, className, ...props }: ComponentProps<'button'> & { pressed: boolean }) {
  return <button type="button" aria-pressed={pressed} className={cn('fp-chip', className)} {...props} />
}

/** Chi ra / Thu về as a two-option radio group (keyboard: arrows move, space selects). */
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
  const options: { value: Direction; label: string; icon: ReactNode }[] = [
    { value: 'Out', label: 'Chi ra', icon: <ArrowUpRight aria-hidden="true" className="size-4" /> },
    { value: 'In', label: 'Thu về', icon: <ArrowDownLeft aria-hidden="true" className="size-4" /> },
  ]
  return (
    <fieldset aria-describedby={error ? `${name}-error` : undefined}>
      <legend className="sr-only">{legend}</legend>
      <div className="fp-toggle">
        {options.map((o) => (
          <label key={o.value}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} aria-invalid={error ? true : undefined} />
            <span>
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
