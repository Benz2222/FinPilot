import { useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import { CircleAlert, Eye, EyeOff } from 'lucide-react'
import { Brand } from '@/components/brand'
import { FieldError } from '@/components/fields'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'

/** Centered card on the neutral background: brand, title, one form, and the way to the other auth screens. */
export function AuthLayout({ title, description, children, footer }: { title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background px-4 py-8 sm:py-14">
      <main className="mx-auto grid w-full max-w-[25rem] content-start gap-6">
        <a href="/" className="justify-self-center rounded-md">
          <Brand />
        </a>
        <div className="rounded-xl border bg-card p-6 shadow-[0_1px_3px_rgb(16_24_40/0.08)] sm:p-8">
          <h1 id="screen-title" tabIndex={-1} className="text-xl font-semibold tracking-tight outline-none">
            {title}
          </h1>
          {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <p className="text-center text-sm text-muted-foreground">{footer}</p>}
      </main>
      <p className="mx-auto mt-auto max-w-md pt-10 text-center text-xs text-muted-foreground">
        FinPilot tính số dư cuối mỗi ngày từ số dư bạn xác nhận và các khoản bạn nhập. Không phải dự báo AI.
      </p>
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
          className="pr-10"
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-md text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
        </button>
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </>
  )
}
