import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@astryxdesign/core/Button'
import type { AuthView } from '@/app/routes'
import { FieldError, FieldLabel, PasswordField, PasswordInput, TextField } from '@/components/fields'
import { forgotPassword, register, signIn } from '@/lib/session'
import { AuthLayout, AuthLink, FormAlert, Notice } from './AuthLayout'
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

function SubmitButton({ busy, label }: { busy: boolean; label: string }) {
  return <Button type="submit" variant="primary" size="lg" label={label} isLoading={busy} className="w-full" />
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
      footer={
        <>
          Chưa có tài khoản? <AuthLink href="#dang-ky">Đăng ký</AuthLink>
        </>
      }
    >
      {expired && <Notice status="warning" title="Phiên đăng nhập đã hết. Vui lòng đăng nhập lại để tiếp tục." />}
      {notice && <Notice status="success" title={notice} />}
      <FormAlert messages={formErrors} />
      <form onSubmit={submit} noValidate className="grid gap-4">
        <TextField id="login-email" label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={setEmail} error={errors.email} />
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <FieldLabel htmlFor="login-password">Mật khẩu</FieldLabel>
            <a href="#quen-mat-khau" className="mb-1.5 text-sm font-semibold text-accent underline-offset-4 hover:underline">
              Quên mật khẩu?
            </a>
          </div>
          <PasswordInput id="login-password" autoComplete="current-password" value={password} onChange={setPassword} error={errors.password} />
          <FieldError id="login-password-error" message={errors.password} />
        </div>
        <SubmitButton busy={busy} label="Đăng nhập" />
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
      footer={
        <>
          Đã có tài khoản? <AuthLink href="#dang-nhap">Đăng nhập</AuthLink>
        </>
      }
    >
      <FormAlert messages={formErrors} />
      <form onSubmit={submit} noValidate className="grid gap-4">
        <TextField id="register-email" label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={setEmail} error={errors.email} />
        <PasswordField id="register-password" label="Mật khẩu" autoComplete="new-password" value={password} onChange={setPassword} error={errors.password} hint={PASSWORD_HINT} />
        <PasswordField id="register-confirm" label="Nhập lại mật khẩu" autoComplete="new-password" value={confirm} onChange={setConfirm} error={errors.confirm} />
        <SubmitButton busy={busy} label="Tạo tài khoản" />
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

  const back = <AuthLink href="#dang-nhap">Quay lại đăng nhập</AuthLink>

  if (sentTo) {
    return (
      <AuthLayout
        title="Kiểm tra email"
        footer={
          <span className="flex flex-wrap justify-between gap-x-4 gap-y-2">
            {back}
            <span>
              Chưa có tài khoản? <AuthLink href="#dang-ky">Đăng ký</AuthLink>
            </span>
          </span>
        }
      >
        <Notice
          status="success"
          title={
            <>
              Nếu <span className="break-all">{sentTo}</span> đã có tài khoản và đã xác nhận, FinPilot sẽ gửi liên kết đặt lại mật khẩu trong vài phút.
            </>
          }
        >
          {SPAM_HINT}
        </Notice>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Quên mật khẩu" footer={back}>
      <FormAlert messages={formErrors} />
      <form onSubmit={submit} noValidate className="grid gap-4">
        <TextField id="forgot-email" label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={setEmail} error={error} />
        <SubmitButton busy={busy} label="Gửi liên kết đặt lại" />
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
