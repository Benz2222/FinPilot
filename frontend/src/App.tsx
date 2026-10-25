import { Suspense, lazy, useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { ShopProvider } from '@/app/shop-context'
import { AppShell } from '@/app/AppShell'
import { isLandingHash, readAuthView, readRoute } from '@/app/routes'
import type { AuthView, Route } from '@/app/routes'
import { AuthScreen } from '@/screens/auth/AuthScreen'
import { Loading } from '@/components/page'
import { Button } from '@astryxdesign/core/Button'
import { checkSession, getSession, hadSession, subscribeSession } from '@/lib/session'

// The design-system reference loads on its own so customers never download it.
const ConfirmEmailScreen = lazy(() => import('@/screens/auth/ConfirmEmailScreen').then((m) => ({ default: m.ConfirmEmailScreen })))
const ResetPasswordScreen = lazy(() => import('@/screens/auth/ResetPasswordScreen').then((m) => ({ default: m.ResetPasswordScreen })))
// The landing page loads on its own: signed-in visitors never fetch it, and it brings no app screen with it.
const LandingScreen = lazy(() => import('@/screens/landing/LandingScreen').then((m) => ({ default: m.LandingScreen })))
const DesignSystemScreen = lazy(() => import('@/screens/design-system/DesignSystemScreen').then((m) => ({ default: m.DesignSystemScreen })))

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
  const [landing, setLanding] = useState(isLandingHash)
  // A device that was never signed in sees the signed-out pages at once instead of waiting on the first check.
  const [returning] = useState(hadSession)

  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute())
      setAuthView(readAuthView())
      setLanding(isLandingHash())
      window.scrollTo({ top: 0 })
      // Move focus to the new screen's heading so screen readers announce it.
      requestAnimationFrame(() => document.getElementById('screen-title')?.focus({ preventScroll: true }))
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // The links from the emails work whether or not someone is signed in on this browser.
  if (window.location.pathname === '/reset-password')
    return (
      <Suspense fallback={<Loading className="min-h-svh" />}>
        <ResetPasswordScreen />
      </Suspense>
    )
  if (window.location.pathname === '/confirm-email')
    return (
      <Suspense fallback={<Loading className="min-h-svh" />}>
        <ConfirmEmailScreen session={session} />
      </Suspense>
    )
  if (window.location.pathname === '/design-system')
    return (
      <Suspense fallback={<Loading className="min-h-svh" />}>
        <DesignSystemScreen />
      </Suspense>
    )

  if (session.status === 'checking' && returning) {
    return failed ? (
      <div className="grid min-h-svh place-content-center justify-items-center gap-3 p-6 text-center">
        <p className="font-semibold">Không kết nối được máy chủ</p>
        <p className="text-sm text-secondary">Kiểm tra kết nối mạng rồi thử lại.</p>
        <Button variant="secondary" label="Thử lại" onClick={retry} />
      </div>
    ) : (
      <Loading className="min-h-svh">Đang mở FinPilot…</Loading>
    )
  }

  if (session.status !== 'signed-in') {
    if (landing)
      return (
        <Suspense fallback={<Loading className="min-h-svh" />}>
          <LandingScreen />
        </Suspense>
      )
    return <AuthScreen view={authView} expired={session.status === 'anonymous' && session.expired === true} />
  }

  return (
    <ShopProvider key={session.email}>
      <AppShell route={route} email={session.email} />
    </ShopProvider>
  )
}
