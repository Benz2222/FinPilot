import { useState } from 'react'
import type { FormEvent } from 'react'
import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { resetPassword } from '@/lib/session'
import { AuthLayout, FormAlert, PasswordInput } from './AuthLayout'
import { PASSWORD_HINT, authProblems } from './messages'

/** `/reset-password?email=..&code=..`, opened from the email. */
export function ResetPasswordScreen() {
  const [params] = useState(() => new URLSearchParams(window.location.search))
  const email = params.get('email') ?? ''
  const code = params.get('code') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const login = (
    <a href="/#dang-nhap" className="font-medium text-primary hover:underline">
      Quay lại đăng nhập
    </a>
  )

  if (!email || !code) {
    return (
      <AuthLayout title="Đặt mật khẩu mới" footer={login}>
        <Alert variant="danger">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Liên kết không đầy đủ</AlertTitle>
          <AlertDescription>Mở lại liên kết trong email, hoặc yêu cầu một liên kết mới.</AlertDescription>
        </Alert>
        <a href="/#quen-mat-khau" className={`${buttonVariants({ variant: 'outline' })} mt-5 w-full`}>
          Yêu cầu liên kết mới
        </a>
      </AuthLayout>
    )
  }

  if (done) {
    return (
      <AuthLayout title="Đã đổi mật khẩu">
        <Alert variant="success" role="status">
          <CircleCheck aria-hidden="true" />
          <AlertDescription className="text-foreground">Mật khẩu mới đã được lưu. Đăng nhập bằng mật khẩu mới để tiếp tục.</AlertDescription>
        </Alert>
        <a href="/#dang-nhap" className={`${buttonVariants({ size: 'lg' })} mt-5 w-full`}>
          Đăng nhập
        </a>
      </AuthLayout>
    )
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const next: typeof errors = {}
    if (!password) next.password = 'Nhập mật khẩu mới'
    else if (confirm !== password) next.confirm = 'Hai mật khẩu chưa giống nhau'
    setErrors(next)
    setFormErrors([])
    if (Object.keys(next).length > 0) {
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setBusy(true)
    try {
      await resetPassword(email, code, password)
      setDone(true)
    } catch (err) {
      const problems = authProblems(err)
      setErrors({ password: problems.find((p) => p.field === 'password')?.message })
      setFormErrors(problems.filter((p) => p.field !== 'password').map((p) => p.message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Đặt mật khẩu mới" description="Chọn mật khẩu mới cho tài khoản của bạn." footer={login}>
      <FormAlert messages={formErrors} />
      <form onSubmit={submit} noValidate className="grid gap-4">
        <div>
          <label htmlFor="reset-email" className="mb-1.5 block text-sm font-medium text-secondary-foreground">
            Email
          </label>
          <Input id="reset-email" value={email} readOnly disabled autoComplete="username" />
        </div>
        <div>
          <label htmlFor="reset-password" className="mb-1.5 block text-sm font-medium text-secondary-foreground">
            Mật khẩu mới
          </label>
          <PasswordInput id="reset-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
          {!errors.password && (
            <p className="mt-1.5 text-[0.8125rem] text-muted-foreground">{PASSWORD_HINT}</p>
          )}
        </div>
        <div>
          <label htmlFor="reset-confirm" className="mb-1.5 block text-sm font-medium text-secondary-foreground">
            Nhập lại mật khẩu mới
          </label>
          <PasswordInput id="reset-confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy && <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" />}
          Đặt lại mật khẩu
        </Button>
      </form>
    </AuthLayout>
  )
}
