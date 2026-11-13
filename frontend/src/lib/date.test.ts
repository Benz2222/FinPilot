import { describe, expect, test } from 'vitest'
import { endOfMonth, startOfMonth, startOfWeek } from './date'

describe('report ranges', () => {
  test('a week starts on Monday, also when the day is Sunday', () => {
    expect(startOfWeek('2026-11-14')).toBe('2026-11-09') // Saturday
    expect(startOfWeek('2026-11-15')).toBe('2026-11-09') // Sunday
    expect(startOfWeek('2026-11-09')).toBe('2026-11-09')
  })

  test('months cross the year and leap days correctly', () => {
    expect(startOfMonth('2027-01-20', -1)).toBe('2026-12-01')
    expect(startOfMonth('2026-02-20', -2)).toBe('2025-12-01')
    expect(endOfMonth('2028-02-10')).toBe('2028-02-29')
    expect(endOfMonth('2026-12-05')).toBe('2026-12-31')
  })
})
