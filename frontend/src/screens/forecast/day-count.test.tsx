import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import { expect, it } from 'vitest'
import { BalanceChart } from '@/components/charts/BalanceChart'
import { ScenarioCompare } from '@/components/charts/ScenarioCompare'
import { addDays, formatDayMonth } from '@/lib/date'
import { explainShortage, inDays } from '@/lib/explain'
import { DS_TODAY, outcomeOf, sampleForecast, shortEvents } from '@/screens/design-system/fixtures'
import { DayList } from './DayTable'
import { Verdict } from './Verdict'

/** The day count printed right after `date` ("25/10 (sau 4 ngày)", "25/10/2026 · sau 4 ngày"…). */
function countAfter(ui: ReactElement, date: string): string | undefined {
  const text = renderToStaticMarkup(ui).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  const at = text.indexOf(formatDayMonth(date))
  return /sau \d+ ngày|hôm nay|ngày mai|\d+ ngày trước|[Nn]gày \d+/.exec(text.slice(at, at + 24))?.[0]
}

it('gives a date the same day count in the verdict, the chart, the day list and the comparison', () => {
  // As in the app: the balance counts up to the end of today, so the forecast starts tomorrow.
  const today = addDays(DS_TODAY, -1)
  const result = sampleForecast('25000000', shortEvents)
  const first = result.firstShortageDate!
  const story = explainShortage(result, shortEvents, today)
  const expected = inDays(first, today)

  expect(countAfter(<Verdict result={result} story={story} today={today} splitTarget={null} hasActions={false} />, first)).toBe(expected)
  expect(countAfter(<BalanceChart result={result} events={shortEvents} today={today} />, first)).toBe(expected)
  expect(countAfter(<DayList result={result} events={shortEvents} today={today} />, first)).toBe(expected)
  expect(countAfter(<ScenarioCompare rows={[{ key: 'base', name: 'Hiện tại', outcome: outcomeOf(result) }]} today={today} />, first)).toBe(expected)
})
