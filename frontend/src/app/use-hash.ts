import { useMemo, useSyncExternalStore } from 'react'

function subscribe(listener: () => void) {
  window.addEventListener('hashchange', listener)
  return () => window.removeEventListener('hashchange', listener)
}

/** The `?…` part of the address hash as parameters, re-read whenever the hash changes (back button, links). */
export function useHashParams(): URLSearchParams {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return useMemo(() => new URLSearchParams(hash.split('?')[1] ?? ''), [hash])
}
