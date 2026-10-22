import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError, previewForecast } from '@/lib/api'
import { todayIso } from '@/lib/date'
import { baselineRequest, fingerprint } from '@/lib/shop'
import type { ShopData } from '@/lib/shop'
import { createLocalRepository } from '@/lib/store/local'
import { StoreError } from '@/lib/store/repository'
import type { ShopRepository } from '@/lib/store/repository'
import type { ForecastRequest, ForecastResponse } from '@/lib/types'
import { ShopContext } from './use-shop'
import type { Forecast, ShopContextValue } from './use-shop'

export function ShopProvider({ children, repository }: { children: ReactNode; repository?: ShopRepository }) {
  const repo = useMemo(() => repository ?? createLocalRepository(), [repository])
  const [data, setData] = useState<ShopData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  // Last settled engine call; loading and staleness are derived from it during render.
  const [settled, setSettled] = useState<{
    request: ForecastRequest
    attempt: number
    result: ForecastResponse | null
    error: ApiError | null
  } | null>(null)
  const [lastGood, setLastGood] = useState<Forecast | null>(null)
  const [attempt, setAttempt] = useState(0)
  const today = todayIso()

  useEffect(() => {
    repo.load().then(setData, (e: unknown) => setLoadError(e instanceof Error ? e.message : String(e)))
  }, [repo])

  const write = useCallback(
    async (action: (r: ShopRepository) => Promise<ShopData>) => {
      try {
        setData(await action(repo))
        setSaveError(null)
        return true
      } catch (e) {
        if (e instanceof StoreError) {
          setSaveError(e.message)
          return false
        }
        throw e
      }
    },
    [repo],
  )

  const baseline = useMemo(() => (data ? baselineRequest(data) : null), [data])
  const baselineFingerprint = useMemo(() => fingerprint(baseline), [baseline])
  // Every change to the real data recomputes the forecast (debounced, latest request wins).
  useEffect(() => {
    if (!baseline) return
    const c = new AbortController()
    const timer = window.setTimeout(() => {
      previewForecast(baseline, c.signal).then(
        (result) => {
          if (c.signal.aborted) return
          setSettled({ request: baseline, attempt, result, error: null })
          setLastGood({ request: baseline, result })
        },
        (e: unknown) => {
          if (c.signal.aborted) return
          setSettled({ request: baseline, attempt, result: null, error: e instanceof ApiError ? e : new ApiError(0, 'Unexpected error') })
        },
      )
    }, 200)
    return () => {
      window.clearTimeout(timer)
      c.abort()
    }
  }, [baseline, attempt])

  const current = settled !== null && settled.request === baseline && settled.attempt === attempt
  const value: ShopContextValue = {
    data,
    loadError,
    saveError,
    repository: repo,
    write,
    today,
    baseline,
    baselineFingerprint,
    forecast: baseline ? lastGood : null,
    forecastError: current ? settled.error : null,
    forecastLoading: baseline !== null && !current,
    retryForecast: () => setAttempt((n) => n + 1),
  }
  return <ShopContext value={value}>{children}</ShopContext>
}
