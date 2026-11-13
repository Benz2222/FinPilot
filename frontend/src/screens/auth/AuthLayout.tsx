import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import { Card } from '@astryxdesign/core/Card'
import { Brand } from '@/components/brand'
import { PosterArt } from './PosterArt'

/** How much of the form is filled in, 0–1; a page with nothing to fill counts as done. */
function filledShare(form: HTMLElement | null): number {
  const inputs = [...(form?.querySelectorAll<HTMLInputElement>('input:not([type=hidden]):not([type=checkbox])') ?? [])]
  return inputs.length === 0 ? 1 : inputs.filter((input) => input.value.trim() !== '').length / inputs.length
}

/**
 * The sign-in frame: one poster for the whole page (sky on top on a phone, the full page from `lg`) with the title,
 * form and footer link in one card on it. The poster follows how much of the form is filled.
 */
export function AuthLayout({
  title,
  children,
  footer,
  aside,
}: {
  title: string
  children: ReactNode
  footer?: ReactNode
  /** Top-right of the page (e.g. sign-out on "create shop"). */
  aside?: ReactNode
}) {
  const form = useRef<HTMLElement>(null)
  const [progress, setProgress] = useState(0)
  const measure = () => setProgress(filledShare(form.current))
  // The screens re-render this frame on every keystroke; the late look catches a password manager's autofill.
  useEffect(() => {
    measure()
    const late = setTimeout(measure, 700)
    return () => clearTimeout(late)
  })

  const sticker = 'rounded-full border-2 border-strong bg-surface shadow-[var(--shadow-low)]'
  return (
    <div className="relative isolate flex min-h-svh flex-col bg-brand-ink">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <PosterArt progress={progress} />
      </div>
      <header className="flex items-center justify-between gap-4 px-4 pt-4 sm:px-10 sm:pt-6 lg:px-12 lg:pt-10">
        <a href="/" className={`inline-flex py-1.5 pr-4 pl-1.5 ${sticker}`}>
          <Brand />
        </a>
        {aside && <span className={sticker}>{aside}</span>}
      </header>
      <main
        ref={form}
        onInputCapture={measure}
        onChangeCapture={measure}
        className="flex flex-1 flex-col items-center px-4 pt-52 pb-10 sm:px-10 sm:pt-[21.5rem] lg:items-end lg:justify-center lg:pt-6 lg:pr-[max(3rem,9vw)]"
      >
        <Card elevation="high" className="grid w-full max-w-[28rem] gap-6 shadow-[7px_7px_0_var(--fp-brand)]">
          <h1 id="screen-title" tabIndex={-1} className="page-title outline-none">
            {title}
          </h1>
          <div className="grid gap-5">{children}</div>
          {footer && <div className="border-t pt-5 text-sm text-secondary">{footer}</div>}
        </Card>
      </main>
    </div>
  )
}

/** A message above a form: an error that belongs to no single field, a success, or a warning. */
export function Notice({ status, title, children }: { status: 'error' | 'success' | 'warning' | 'info'; title: ReactNode; children?: ReactNode }) {
  return (
    <div role={status === 'error' ? 'alert' : 'status'}>
      <Banner status={status} title={title} description={children} />
    </div>
  )
}

/** Errors that belong to no single field (wrong password, network…). */
export function FormAlert({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null
  return (
    <Notice status="error" title={messages[0]}>
      {messages.length > 1 && messages.slice(1).map((m) => <span key={m} className="block">{m}</span>)}
    </Notice>
  )
}

/** Links in the auth footer. */
export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="font-semibold text-accent underline-offset-4 hover:underline">
      {children}
    </a>
  )
}
