import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { PasswordField, TextField } from '@/components/fields'
import { resetPassword } from '@/lib/session'
import { AuthLayout, AuthLink, FormAlert, Notice } from './AuthLayout'
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

  const login = <AuthLink href="/#dang-nhap">Quay lại đăng nhập</AuthLink>

  if (!email || !code) {
    return (
      <AuthLayout title="Đặt mật khẩu mới" footer={login}>
        <Notice status="error" title="Liên kết không đầy đủ">
          Mở lại liên kết trong email, hoặc yêu cầu một liên kết mới.
        </Notice>
        <Button size="lg" label="Yêu cầu liên kết mới" href="/#quen-mat-khau" className="w-full" />
      </AuthLayout>
    )
  }

  if (done) {
    return (
      <AuthLayout title="Đã đổi mật khẩu">
        <Button variant="primary" size="lg" label="Đăng nhập" href="/#dang-nhap" className="w-full" />
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
    <AuthLayout title="Đặt mật khẩu mới" footer={login}>
      <FormAlert messages={formErrors} />
      <form onSubmit={submit} noValidate className="grid gap-4">
        <TextField id="reset-email" label="Email" value={email} onChange={() => {}} isDisabled autoComplete="username" />
        <PasswordField id="reset-password" label="Mật khẩu mới" autoComplete="new-password" value={password} onChange={setPassword} error={errors.password} hint={PASSWORD_HINT} />
        <PasswordField id="reset-confirm" label="Nhập lại mật khẩu mới" autoComplete="new-password" value={confirm} onChange={setConfirm} error={errors.confirm} />
        <Button type="submit" variant="primary" size="lg" label="Đặt lại mật khẩu" isLoading={busy} className="w-full" />
      </form>
    </AuthLayout>
  )
}
