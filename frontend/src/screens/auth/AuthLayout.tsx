import { useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import { CircleAlert, Eye, EyeOff } from 'lucide-react'
import { Brand } from '@/components/brand'
import { FieldError } from '@/components/fields'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Showcase, ShowcaseStrip } from './Showcase'

/**
 * The sign-in frame: the form on the left, the product on the right (an example forecast that plays once). Phones and
 * tablets get the brand and a one-line version of the example above the form, so the fields stay near the top.
 */
export function AuthLayout({
  title,
  description,
  children,
  footer,
  aside,
  steps = false,
}: {
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** Top-right of the form column (e.g. sign-out on "create shop"). */
  aside?: ReactNode
  /** Show the three first steps in the product panel (sign-up and shop creation). */
  steps?: boolean
}) {
  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[minmax(26rem,32rem)_minmax(0,1fr)]">
      <div className="flex min-h-svh flex-col px-5 py-6 sm:px-10 sm:py-8">
        <div className="flex items-center justify-between gap-4">
          <a href="/" className="rounded-md">
            <Brand />
          </a>
          {aside}
        </div>
        <main className="mx-auto grid w-full max-w-[24rem] flex-1 content-center gap-6 py-8 lg:py-12">
          <div className="lg:hidden">
            <ShowcaseStrip />
          </div>
          <div>
            <h1 id="screen-title" tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none sm:text-[1.75rem]">
              {title}
            </h1>
            {description && <p className="mt-2 text-[0.9375rem] leading-relaxed text-secondary-foreground">{description}</p>}
          </div>
          <div>{children}</div>
          {footer && <p className="border-t pt-5 text-sm text-muted-foreground">{footer}</p>}
        </main>
      </div>
      <aside
        aria-label="FinPilot làm gì"
        className="relative hidden overflow-hidden border-l bg-glass bg-[radial-gradient(ellipse_at_70%_20%,rgb(76_201_224/0.10),transparent_60%),linear-gradient(to_right,rgb(255_255_255/0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.025)_1px,transparent_1px)] bg-[length:auto,40px_40px,40px_40px] lg:block"
      >
        <Showcase steps={steps} />
      </aside>
    </div>
  )
}

/** Errors that belong to no single field (wrong password, network…). */
export function FormAlert({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null
  return (
    <Alert variant="danger" role="alert" className="mb-5">
      <CircleAlert aria-hidden="true" />
      <AlertDescription className="text-foreground">
        {messages.map((m) => (
          <p key={m}>{m}</p>
        ))}
      </AlertDescription>
    </Alert>
  )
}

/** Password with a show/hide button; the value never leaves component state. */
export function PasswordInput({ id, error, ...props }: Omit<ComponentProps<'input'>, 'type'> & { id: string; error?: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="pr-11"
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
        </button>
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </>
  )
}
