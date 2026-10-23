import { useState, useSyncExternalStore } from 'react'
import type { FormEvent } from 'react'
import { LoaderCircle, LogOut, MailCheck, Store } from 'lucide-react'
import { Brand } from '@/components/brand'
import { Field, TextField } from '@/components/fields'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { getSession, signOut, subscribeSession } from '@/lib/session'
import { FormAlert } from '@/screens/auth/AuthLayout'
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
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center justify-between gap-4 border-b bg-card px-4 py-3 sm:px-6">
        <Brand />
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="hidden truncate text-muted-foreground sm:inline">Đăng nhập với {email}</span>
          <Button variant="ghost" size="sm" onClick={() => void signOut().catch(() => {})}>
            <LogOut aria-hidden="true" />
            Đăng xuất
          </Button>
        </div>
      </header>
      <main className="grid flex-1 place-items-start justify-center px-4 py-10 sm:place-items-center sm:py-16">
        <div className="w-full max-w-[26rem] rounded-xl border bg-card p-6 shadow-[0_1px_3px_rgb(16_24_40/0.08)] sm:p-8">
          <div className="mb-4 grid size-10 place-items-center rounded-lg bg-primary-soft text-primary">
            <Store aria-hidden="true" className="size-5" />
          </div>
          <h1 id="screen-title" tabIndex={-1} className="text-xl font-semibold tracking-tight outline-none">
            Tạo shop của bạn
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Mỗi tài khoản quản lý một shop. Số dư, lịch thu–chi và kịch bản đều lưu theo shop này.
          </p>
          {confirmationSent && (
            <Alert variant="success" role="status" className="mt-5">
              <MailCheck aria-hidden="true" />
              <AlertDescription className="text-foreground">
                Đã gửi email xác nhận tới <strong className="font-medium break-all">{email}</strong>. Hãy xác nhận để sau này có thể lấy lại mật khẩu.
              </AlertDescription>
            </Alert>
          )}
          <div className="mt-6">
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
          </div>
        </div>
      </main>
    </div>
  )
}
