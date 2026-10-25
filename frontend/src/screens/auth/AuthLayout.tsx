import type { ReactNode } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import { Brand } from '@/components/brand'
import { Showcase } from './Showcase'

/**
 * The sign-in frame: brand, title, the form and a footer link, in one column that stays near the top on a phone.
 * From `lg` a product picture sits on the right.
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
  /** Top-right of the form column (e.g. sign-out on "create shop"). */
  aside?: ReactNode
}) {
  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[minmax(26rem,34rem)_minmax(0,1fr)]">
      <div className="flex min-h-svh flex-col bg-surface px-5 py-5 sm:px-10 sm:py-8 lg:border-r-2 lg:border-[var(--color-border-emphasized)]">
        <div className="flex items-center justify-between gap-4">
          <a href="/" className="rounded-md">
            <Brand />
          </a>
          {aside}
        </div>
        <main className="mx-auto grid w-full max-w-[24rem] flex-1 content-start gap-6 pt-10 pb-8 sm:content-center sm:pt-8 lg:py-12">
          <h1 id="screen-title" tabIndex={-1} className="page-title outline-none">
            {title}
          </h1>
          <div className="grid gap-5">{children}</div>
          {footer && <div className="border-t pt-5 text-sm text-secondary">{footer}</div>}
        </main>
      </div>
      <div aria-hidden="true" className="hidden overflow-hidden lg:block">
        <Showcase />
      </div>
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
