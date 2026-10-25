import type { ShopContextValue } from '@/app/use-shop'
import { addDays } from '@/lib/date'
import { explainShortage } from '@/lib/explain'
import type { Obligation } from '@/lib/shop'
import type { CashEvent } from '@/lib/types'
import { DS_TODAY, outcomeOf, sampleForecast, shortEvents } from '@/screens/design-system/fixtures'

/** The landing page's example shop: the design-system sample with 26 million on hand. Every figure is made up. */
export const SAMPLE_TODAY = DS_TODAY
export const SAMPLE_BALANCE = '26000000'

export const heroEvents = shortEvents
export const heroForecast = sampleForecast(SAMPLE_BALANCE, heroEvents)
export const heroStory = explainShortage(heroForecast, heroEvents, SAMPLE_TODAY)

/** The stock order paid in two halves, the second after the Shopee payout. */
const stock = shortEvents.find((e) => e.id === 'stock')!
const splitEvents: CashEvent[] = [
  ...shortEvents.map((e) => (e.id === stock.id ? { ...e, amount: '14000000' } : e)),
  { ...stock, id: 'stock-2', amount: '14000000', date: addDays(SAMPLE_TODAY, 16) },
]

export const compareRows = [
  { key: 'base', name: 'Hiện tại', outcome: outcomeOf(sampleForecast(SAMPLE_BALANCE, shortEvents, 56)) },
  { key: 'split', name: `Chia đợt “${stock.label}”`, outcome: outcomeOf(sampleForecast(SAMPLE_BALANCE, splitEvents, 56)) },
]

/** Two lines of the schedule, drawn by the real schedule row. */
export const sampleObligations: Obligation[] = shortEvents
  .filter((e) => e.id === 'cod-1' || e.id === 'stock')
  .map((e) => ({ ...e, note: '', status: 'open', payments: [] }))

/** Enough of the shop context for a schedule row to draw; it never writes. */
export const sampleShop = { data: null, today: SAMPLE_TODAY, write: async () => false } as unknown as ShopContextValue
