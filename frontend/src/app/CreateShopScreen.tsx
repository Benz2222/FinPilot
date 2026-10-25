import { useState, useSyncExternalStore } from 'react'
import type { FormEvent } from 'react'
import { LogOut } from 'lucide-react'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { TextField } from '@/components/fields'
import { getSession, signOut, subscribeSession } from '@/lib/session'
import { AuthLayout, FormAlert, Notice } from '@/screens/auth/AuthLayout'
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
      aside={<Button variant="ghost" size="sm" label="Đăng xuất" icon={<Icon icon={LogOut} />} onClick={() => void signOut().catch(() => {})} />}
      footer={
        <>
          Đăng nhập với <span className="font-semibold break-all text-primary">{email}</span>
        </>
      }
    >
      {confirmationSent && (
        <Notice
          status="success"
          title={
            <>
              Đã gửi email xác nhận tới <span className="break-all">{email}</span>. Hãy xác nhận để sau này có thể lấy lại mật khẩu.
            </>
          }
        >
          {SPAM_HINT}
        </Notice>
      )}
      <FormAlert messages={formError ? [formError] : []} />
      <form onSubmit={submit} noValidate className="grid gap-4">
        <TextField id="shop-name" label="Tên shop" value={name} maxLength={200} autoComplete="organization" placeholder="VD: Tiệm áo Thu Hà" onChange={setName} error={error} />
        <Button type="submit" variant="primary" size="lg" label="Tạo shop" isLoading={busy} className="w-full" />
      </form>
    </AuthLayout>
  )
}
