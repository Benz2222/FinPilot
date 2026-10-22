import { createContext, use } from 'react'
import type { ApiError } from '@/lib/api'
import type { ShopData } from '@/lib/shop'
import type { ShopRepository } from '@/lib/store/repository'
import type { ForecastRequest, ForecastResponse } from '@/lib/types'

export interface Forecast {
  request: ForecastRequest
  result: ForecastResponse
}

export interface ShopContextValue {
  data: ShopData | null
  loadError: string | null
  /** Last failed write, shown until the next successful one. */
  saveError: string | null
  repository: ShopRepository
  /** Runs a repository write and adopts the shop it returns. Rethrows non-storage errors to the caller. */
  write: (action: (repo: ShopRepository) => Promise<ShopData>) => Promise<boolean>
  today: string
  baseline: ForecastRequest | null
  baselineFingerprint: string
  forecast: Forecast | null
  forecastError: ApiError | null
  forecastLoading: boolean
  retryForecast: () => void
}

export const ShopContext = createContext<ShopContextValue | null>(null)

export function useShop(): ShopContextValue {
  const value = use(ShopContext)
  if (!value) throw new Error('useShop must be used inside <ShopProvider>')
  return value
}
