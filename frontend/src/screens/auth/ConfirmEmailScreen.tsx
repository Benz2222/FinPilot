import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { CircleAlert, LoaderCircle, MailCheck, WifiOff } from 'lucide-react'
import { Field, TextField } from '@/components/fields'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { confirmEmail, resendConfirmationEmail } from '@/lib/session'
import type { Session } from '@/lib/session'
import { AuthLayout, FormAlert } from './AuthLayout'
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
      <Alert variant="success" role="status">
        <MailCheck aria-hidden="true" />
        <AlertDescription className="text-foreground">
          <p>
            Nếu <strong className="font-medium break-all">{sentTo}</strong> đã có tài khoản và chưa xác nhận, FinPilot sẽ gửi liên kết mới trong vài phút.{' '}
            {SPAM_HINT}
          </p>
          {offerSignUp && (
            <p className="mt-2">
              Chưa có tài khoản?{' '}
              <a href="/#dang-ky" className="font-medium text-primary hover:underline">
                Đăng ký
              </a>
            </p>
          )}
        </AlertDescription>
      </Alert>
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
      <Field id="confirm-email" label="Email đã đăng ký">
        <TextField id="confirm-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
      </Field>
      <Button type="submit" size="lg" variant="outline" className="w-full" disabled={busy}>
        {busy && <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" />}
        Gửi lại email xác nhận
      </Button>
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
      <a href="/#dang-nhap" className={`${buttonVariants({ size: 'lg' })} w-full`}>
        Đăng nhập
      </a>
    ) : (
      <a href="/" className={`${buttonVariants({ size: 'lg' })} w-full`}>
        Mở FinPilot
      </a>
    )
  const back = signedIn ? (
    <a href="/" className="font-medium text-primary hover:underline">
      Về FinPilot
    </a>
  ) : (
    <a href="/#dang-nhap" className="font-medium text-primary hover:underline">
      Quay lại đăng nhập
    </a>
  )

  if (!complete) {
    return (
      <AuthLayout title="Xác nhận email" footer={back}>
        <Alert variant="danger" className="mb-5">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Liên kết không đầy đủ</AlertTitle>
          <AlertDescription>Mở lại liên kết trong email, hoặc nhận một liên kết mới bên dưới.</AlertDescription>
        </Alert>
        <ResendForm key={sessionEmail} initialEmail={sessionEmail} offerSignUp={!signedIn} />
      </AuthLayout>
    )
  }

  if (state === 'checking') {
    return (
      <AuthLayout title="Đang xác nhận email…">
        <p role="status" className="flex items-center gap-2.5 text-sm text-secondary-foreground">
          <LoaderCircle aria-hidden="true" className="size-4 text-primary motion-safe:animate-spin" />
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
        <Alert variant="warning" className="mb-5">
          <WifiOff aria-hidden="true" />
          <AlertTitle>Không kết nối được máy chủ</AlertTitle>
          <AlertDescription className="text-foreground">Liên kết vẫn dùng được. Kiểm tra mạng rồi thử lại.</AlertDescription>
        </Alert>
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            setState('checking')
            setAttempt((n) => n + 1)
          }}
        >
          Thử lại
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Liên kết không còn dùng được" description="Nhập email đã đăng ký để nhận liên kết mới." footer={back}>
      <ResendForm key={sessionEmail} initialEmail={sessionEmail} offerSignUp={!signedIn} />
    </AuthLayout>
  )
}
