import { useEffect, useState } from 'react'
import { ShopProvider } from '@/app/shop-context'
import { AppShell } from '@/app/AppShell'
import { readRoute } from '@/app/routes'
import type { Route } from '@/app/routes'

export default function App() {
  const [route, setRoute] = useState<Route>(readRoute)

  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute())
      window.scrollTo({ top: 0 })
      // Move focus to the new screen's heading so screen readers announce it.
      requestAnimationFrame(() => document.getElementById('screen-title')?.focus({ preventScroll: true }))
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return (
    <ShopProvider>
      <AppShell route={route} />
    </ShopProvider>
  )
}
