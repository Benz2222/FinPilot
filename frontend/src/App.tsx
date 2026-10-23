import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { ShopProvider } from '@/app/shop-context'
import { AppShell } from '@/app/AppShell'
import { readAuthView, readRoute } from '@/app/routes'
import type { AuthView, Route } from '@/app/routes'
import { AuthScreen } from '@/screens/auth/AuthScreen'
import { ResetPasswordScreen } from '@/screens/auth/ResetPasswordScreen'
import { Loading } from '@/components/page'
import { Button } from '@/components/ui/button'
import { checkSession, getSession, subscribeSession } from '@/lib/session'

/** First check of the cookie session; a network failure offers a retry instead of a login form. */
function useSessionCheck() {
  const [failed, setFailed] = useState(false)
  const check = useCallback(() => {
    checkSession().catch(() => setFailed(true))
  }, [])
  useEffect(check, [check])
  const retry = () => {
    setFailed(false)
    check()
  }
  return { failed, retry }
}

export default function App() {
  const session = useSyncExternalStore(subscribeSession, getSession)
  const { failed, retry } = useSessionCheck()
  const [route, setRoute] = useState<Route>(readRoute)
  const [authView, setAuthView] = useState<AuthView>(readAuthView)

  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute())
      setAuthView(readAuthView())
      window.scrollTo({ top: 0 })
      // Move focus to the new screen's heading so screen readers announce it.
      requestAnimationFrame(() => document.getElementById('screen-title')?.focus({ preventScroll: true }))
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // The reset link from the email works whether or not someone is signed in on this browser.
  if (window.location.pathname === '/reset-password') return <ResetPasswordScreen />

  if (session.status === 'checking') {
    return failed ? (
      <div className="grid min-h-svh place-content-center justify-items-center gap-3 p-6 text-center">
        <p className="font-semibold">Không kết nối được máy chủ</p>
        <p className="text-sm text-muted-foreground">Kiểm tra kết nối mạng rồi thử lại.</p>
        <Button variant="outline" onClick={retry}>
          Thử lại
        </Button>
      </div>
    ) : (
      <Loading className="min-h-svh">Đang mở FinPilot…</Loading>
    )
  }

  if (session.status === 'anonymous') return <AuthScreen view={authView} expired={session.expired === true} />

  return (
    <ShopProvider key={session.email}>
      <AppShell route={route} email={session.email} />
    </ShopProvider>
  )
}
