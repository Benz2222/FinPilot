import type { ReactNode } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import { Card } from '@astryxdesign/core/Card'
import { Brand } from '@/components/brand'

/** The sign-in frame: brand on top, then the title, form and footer link in one card on the dotted page. */
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
  return (
    <div className="flex min-h-svh flex-col bg-[radial-gradient(circle_at_1px_1px,var(--color-border)_1px,transparent_0)] bg-[length:22px_22px] px-4 py-5 sm:px-10 sm:py-8">
      <div className="flex items-center justify-between gap-4">
        <a href="/" className="rounded-md">
          <Brand />
        </a>
        {aside}
      </div>
      <main className="mx-auto flex w-full max-w-[28rem] flex-1 flex-col pt-8 pb-8 sm:justify-center sm:pt-6">
        <Card elevation="high" className="grid gap-6">
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
