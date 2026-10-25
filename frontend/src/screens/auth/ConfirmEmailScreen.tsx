import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Spinner } from '@astryxdesign/core/Spinner'
import { TextField } from '@/components/fields'
import { ApiError } from '@/lib/api'
import { confirmEmail, resendConfirmationEmail } from '@/lib/session'
import type { Session } from '@/lib/session'
import { AuthLayout, AuthLink, FormAlert, Notice } from './AuthLayout'
import { EMAIL, SPAM_HINT, authProblems } from './messages'

type State = 'checking' | 'confirmed' | 'invalid' | 'offline'

/** Asks for a fresh confirmation link: the way out of a broken or expired one. */
function ResendForm({ initialEmail, offerSignUp }: { initialEmail: string; offerSignUp: boolean }) {
  const [email, setEmail] = useState(initialEmail)
  const [error, setError] = useState<string>()
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  if (sentTo) {
    return (
      <Notice
        status="success"
        title={
          <>
            Nếu <span className="break-all">{sentTo}</span> đã có tài khoản và chưa xác nhận, FinPilot sẽ gửi liên kết mới trong vài phút.
          </>
        }
      >
        {SPAM_HINT}
        {offerSignUp && (
          <span className="mt-2 block">
            Chưa có tài khoản? <AuthLink href="/#dang-ky">Đăng ký</AuthLink>
          </span>
        )}
      </Notice>
    )
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setFormErrors([])
    if (!EMAIL.test(email.trim())) {
      setError('Nhập email hợp lệ')
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setError(undefined)
    setBusy(true)
    try {
      await resendConfirmationEmail(email.trim())
      setSentTo(email.trim())
    } catch (err) {
      setFormErrors(authProblems(err).map((p) => p.message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <FormAlert messages={formErrors} />
      <TextField id="confirm-email" label="Email đã đăng ký" type="email" autoComplete="email" inputMode="email" value={email} onChange={setEmail} error={error} />
      <Button type="submit" variant="primary" size="lg" label="Gửi lại email xác nhận" isLoading={busy} className="w-full" />
    </form>
  )
}

/** `/confirm-email?userId=..&code=..[&changedEmail=..]`, opened from the confirmation mail. Works signed in or not. */
export function ConfirmEmailScreen({ session }: { session: Session }) {
  const [query] = useState(() => window.location.search)
  const [complete] = useState(() => {
    const params = new URLSearchParams(query)
    return Boolean(params.get('userId') && params.get('code'))
  })
  const [state, setState] = useState<State>('checking')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!complete) return
    let current = true
    confirmEmail(query).then(
      () => current && setState('confirmed'),
      (e: unknown) => current && setState(e instanceof ApiError && e.status === 0 ? 'offline' : 'invalid'),
    )
    return () => {
      current = false
    }
  }, [complete, query, attempt])

  const signedIn = session.status === 'signed-in'
  const sessionEmail = session.status === 'signed-in' ? session.email : ''
  // Signed in (or not known yet): the app itself. Signed out: the login form.
  const next =
    session.status === 'anonymous' ? (
      <Button variant="primary" size="lg" label="Đăng nhập" href="/#dang-nhap" className="w-full" />
    ) : (
      <Button variant="primary" size="lg" label="Mở FinPilot" href="/" className="w-full" />
    )
  const back = signedIn ? <AuthLink href="/">Về FinPilot</AuthLink> : <AuthLink href="/#dang-nhap">Quay lại đăng nhập</AuthLink>

  if (!complete) {
    return (
      <AuthLayout title="Xác nhận email" footer={back}>
        <Notice status="error" title="Liên kết không đầy đủ">
          Mở lại liên kết trong email, hoặc nhận một liên kết mới bên dưới.
        </Notice>
        <ResendForm key={sessionEmail} initialEmail={sessionEmail} offerSignUp={!signedIn} />
      </AuthLayout>
    )
  }

  if (state === 'checking') {
    return (
      <AuthLayout title="Đang xác nhận email…">
        <p role="status" className="flex items-center gap-2.5 text-sm text-secondary">
          <span aria-hidden="true" className="inline-flex">
            <Spinner size="sm" />
          </span>
          Đang kiểm tra liên kết
        </p>
      </AuthLayout>
    )
  }

  if (state === 'confirmed') {
    return (
      <AuthLayout title="Đã xác nhận email">
        {next}
      </AuthLayout>
    )
  }

  if (state === 'offline') {
    return (
      <AuthLayout title="Chưa xác nhận được email" footer={back}>
        <Notice status="warning" title="Không kết nối được máy chủ">
          Liên kết vẫn dùng được. Kiểm tra mạng rồi thử lại.
        </Notice>
        <Button
          variant="primary"
          size="lg"
          label="Thử lại"
          className="w-full"
          onClick={() => {
            setState('checking')
            setAttempt((n) => n + 1)
          }}
        />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Liên kết không còn dùng được" footer={back}>
      <ResendForm key={sessionEmail} initialEmail={sessionEmail} offerSignUp={!signedIn} />
    </AuthLayout>
  )
}
