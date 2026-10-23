import { useState, useSyncExternalStore } from 'react'
import type { FormEvent } from 'react'
import { LoaderCircle, LogOut, MailCheck } from 'lucide-react'
import { Field, TextField } from '@/components/fields'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { getSession, signOut, subscribeSession } from '@/lib/session'
import { AuthLayout, FormAlert } from '@/screens/auth/AuthLayout'
import { SPAM_HINT } from '@/screens/auth/messages'
import { useShop } from './use-shop'

/** Signed in, but the account has no shop yet: ask for its name, then open the app. */
export function CreateShopScreen({ email }: { email: string }) {
  const { createShop } = useShop()
  const session = useSyncExternalStore(subscribeSession, getSession)
  const confirmationSent = session.status === 'signed-in' && session.confirmationSent === true
  const [name, setName] = useState('')
  const [error, setError] = useState<string>()
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const input = e.currentTarget.querySelector<HTMLInputElement>('input')
    if (!name.trim()) {
      setError('Nhập tên shop')
      input?.focus()
      return
    }
    setError(undefined)
    setFormError(null)
    setBusy(true)
    try {
      await createShop(name.trim())
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Chưa tạo được shop. Vui lòng thử lại.')
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Tạo shop của bạn"
      description="Mỗi tài khoản quản lý một shop. Số dư, lịch thu–chi và kịch bản đều lưu theo shop này."
      steps
      aside={
        <Button variant="ghost" size="sm" onClick={() => void signOut().catch(() => {})}>
          <LogOut aria-hidden="true" />
          Đăng xuất
        </Button>
      }
      footer={
        <>
          Đăng nhập với <span className="font-medium break-all text-secondary-foreground">{email}</span>
        </>
      }
    >
      {confirmationSent && (
        <Alert variant="success" role="status" className="mb-5">
          <MailCheck aria-hidden="true" />
          <AlertDescription className="text-foreground">
            Đã gửi email xác nhận tới <strong className="font-medium break-all">{email}</strong>. Hãy xác nhận để sau này có thể lấy lại mật khẩu. {SPAM_HINT}
          </AlertDescription>
        </Alert>
      )}
      <FormAlert messages={formError ? [formError] : []} />
      <form onSubmit={submit} noValidate className="grid gap-4">
        <Field id="shop-name" label="Tên shop">
          <TextField id="shop-name" value={name} maxLength={200} autoComplete="organization" placeholder="VD: Tiệm áo Thu Hà" onChange={(e) => setName(e.target.value)} error={error} />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy && <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" />}
          Tạo shop
        </Button>
      </form>
    </AuthLayout>
  )
}
