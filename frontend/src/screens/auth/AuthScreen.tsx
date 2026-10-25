import { useState } from 'react'
import type { FormEvent } from 'react'
import { CircleCheck, Info, LoaderCircle, MailCheck } from 'lucide-react'
import type { AuthView } from '@/app/routes'
import { Field, TextField } from '@/components/fields'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { forgotPassword, register, signIn } from '@/lib/session'
import { AuthLayout, FormAlert, PasswordInput } from './AuthLayout'
import { EMAIL, PASSWORD_HINT, SPAM_HINT, authProblems } from './messages'
import type { AuthProblem } from './messages'

type Errors = Partial<Record<'email' | 'password' | 'confirm', string>>

function split(problems: AuthProblem[]): { fields: Errors; form: string[] } {
  const fields: Errors = {}
  const form: string[] = []
  for (const p of problems) {
    if (p.field && !fields[p.field]) fields[p.field] = p.message
    else form.push(p.message)
  }
  return { fields, form }
}

function focusFirstInvalid(form: HTMLFormElement) {
  requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
}

/** Signed in: leave the auth hash so the app opens on its first screen. */
function enterApp() {
  if (/^#(dang-nhap|dang-ky|quen-mat-khau)$/.test(window.location.hash)) window.history.replaceState(null, '', '#lich')
}

function SubmitButton({ busy, children }: { busy: boolean; children: string }) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={busy}>
      {busy && <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" />}
      {children}
    </Button>
  )
}

function LoginForm({ expired, notice }: { expired: boolean; notice: string | null }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const next: Errors = {}
    if (!EMAIL.test(email.trim())) next.email = 'Nhập email hợp lệ'
    if (!password) next.password = 'Nhập mật khẩu'
    setErrors(next)
    setFormErrors([])
    if (Object.keys(next).length > 0) return focusFirstInvalid(form)
    setBusy(true)
    try {
      enterApp()
      await signIn({ email: email.trim(), password })
    } catch (err) {
      const { fields, form: messages } = split(authProblems(err))
      setErrors(fields)
      setFormErrors(messages)
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Đăng nhập"
      description="Theo dõi lịch thu–chi và biết trước ngày shop thiếu tiền."
      footer={
        <>
          Chưa có tài khoản?{' '}
          <a href="#dang-ky" className="font-medium text-primary hover:underline">
            Đăng ký
          </a>
        </>
      }
    >
      {expired && (
        <Alert variant="warning" className="mb-5">
          <Info aria-hidden="true" />
          <AlertDescription className="text-foreground">Phiên đăng nhập đã hết. Vui lòng đăng nhập lại để tiếp tục.</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert variant="success" className="mb-5">
          <CircleCheck aria-hidden="true" />
          <AlertDescription className="text-foreground">{notice}</AlertDescription>
        </Alert>
      )}
      <FormAlert messages={formErrors} />
      <form onSubmit={submit} noValidate className="grid gap-4">
        <Field id="login-email" label="Email">
          <TextField id="login-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        </Field>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <label htmlFor="login-password" className="text-sm font-medium text-secondary-foreground">
              Mật khẩu
            </label>
            <a href="#quen-mat-khau" className="text-sm font-medium text-primary hover:underline">
              Quên mật khẩu?
            </a>
          </div>
          <PasswordInput id="login-password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        </div>
        <SubmitButton busy={busy}>Đăng nhập</SubmitButton>
      </form>
    </AuthLayout>
  )
}

function RegisterForm({ onRegistered }: { onRegistered: (notice: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const next: Errors = {}
    if (!EMAIL.test(email.trim())) next.email = 'Nhập email hợp lệ'
    if (!password) next.password = 'Đặt mật khẩu'
    if (password && confirm !== password) next.confirm = 'Hai mật khẩu chưa giống nhau'
    setErrors(next)
    setFormErrors([])
    if (Object.keys(next).length > 0) return focusFirstInvalid(form)
    setBusy(true)
    const credentials = { email: email.trim(), password }
    try {
      await register(credentials)
    } catch (err) {
      const { fields, form: messages } = split(authProblems(err))
      setErrors(fields)
      setFormErrors(messages)
      setBusy(false)
      return focusFirstInvalid(form)
    }
    try {
      enterApp()
      await signIn(credentials, { justRegistered: true })
    } catch {
      // The account exists; only the automatic sign-in failed.
      onRegistered(`Đã tạo tài khoản và gửi email xác nhận tới ${credentials.email}. Đăng nhập để tiếp tục. ${SPAM_HINT}`)
    }
  }

  return (
    <AuthLayout
      title="Tạo tài khoản"
      steps
      footer={
        <>
          Đã có tài khoản?{' '}
          <a href="#dang-nhap" className="font-medium text-primary hover:underline">
            Đăng nhập
          </a>
        </>
      }
    >
      <FormAlert messages={formErrors} />
      <form onSubmit={submit} noValidate className="grid gap-4">
        <Field id="register-email" label="Email">
          <TextField id="register-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        </Field>
        <div>
          <label htmlFor="register-password" className="mb-1.5 block text-sm font-medium text-secondary-foreground">
            Mật khẩu
          </label>
          <PasswordInput id="register-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
          {!errors.password && <p className="mt-1.5 text-[0.8125rem] text-muted-foreground">{PASSWORD_HINT}</p>}
        </div>
        <div>
          <label htmlFor="register-confirm" className="mb-1.5 block text-sm font-medium text-secondary-foreground">
            Nhập lại mật khẩu
          </label>
          <PasswordInput id="register-confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
        </div>
        <SubmitButton busy={busy}>Tạo tài khoản</SubmitButton>
      </form>
    </AuthLayout>
  )
}

function ForgotForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setFormErrors([])
    if (!EMAIL.test(email.trim())) {
      setError('Nhập email hợp lệ')
      return focusFirstInvalid(form)
    }
    setError(undefined)
    setBusy(true)
    try {
      await forgotPassword(email.trim())
      setSentTo(email.trim())
    } catch (err) {
      setFormErrors(authProblems(err).map((p) => p.message))
    } finally {
      setBusy(false)
    }
  }

  const back = (
    <a href="#dang-nhap" className="font-medium text-primary hover:underline">
      Quay lại đăng nhập
    </a>
  )

  if (sentTo) {
    return (
      <AuthLayout
        title="Kiểm tra email"
        footer={
          <span className="flex flex-wrap justify-between gap-x-4 gap-y-2">
            {back}
            <span>
              Chưa có tài khoản?{' '}
              <a href="#dang-ky" className="font-medium text-primary hover:underline">
                Đăng ký
              </a>
            </span>
          </span>
        }
      >
        <Alert variant="success" role="status">
          <MailCheck aria-hidden="true" />
          <AlertDescription className="text-foreground">
            Nếu <strong className="font-medium break-all">{sentTo}</strong> đã có tài khoản và đã xác nhận, FinPilot sẽ gửi liên kết đặt lại mật khẩu trong vài
            phút. {SPAM_HINT}
          </AlertDescription>
        </Alert>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Quên mật khẩu" description="Nhập email đã đăng ký. FinPilot sẽ gửi liên kết để bạn đặt mật khẩu mới." footer={back}>
      <FormAlert messages={formErrors} />
      <form onSubmit={submit} noValidate className="grid gap-4">
        <Field id="forgot-email" label="Email">
          <TextField id="forgot-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
        </Field>
        <SubmitButton busy={busy}>Gửi liên kết đặt lại</SubmitButton>
      </form>
    </AuthLayout>
  )
}

/** Login, sign-up and "forgot password", switched by the URL hash. */
export function AuthScreen({ view, expired }: { view: AuthView; expired: boolean }) {
  const [notice, setNotice] = useState<string | null>(null)
  if (view === 'dang-ky') {
    return (
      <RegisterForm
        onRegistered={(message) => {
          setNotice(message)
          window.location.hash = 'dang-nhap'
        }}
      />
    )
  }
  if (view === 'quen-mat-khau') return <ForgotForm />
  return <LoginForm expired={expired} notice={notice} />
}
