import type { Money } from './types'

export const CURRENCY_SYMBOL = '₫'

/** Longest amount the UI accepts (digits). Keeps values well inside Number's safe range for plotting. */
export const MAX_MONEY_DIGITS = 15

const WHOLE_NUMBER = /^-?\d+$/
const vndNumber = new Intl.NumberFormat('vi-VN')
const compactNumber = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })
const twoDecimals = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

/** `"50000000"` → `"50.000.000 ₫"`, `"-5000000"` → `"−5.000.000 ₫"` (a true minus). Goes through BigInt, so there is no float rounding. */
export function formatVnd(value: Money): string {
  if (!WHOLE_NUMBER.test(value)) return `${value} ${CURRENCY_SYMBOL}`
  return `${vndNumber.format(BigInt(value)).replace('-', '−')} ${CURRENCY_SYMBOL}`
}

/** `"50000000"` → `"50.000.000"` (digits only, no currency symbol). Used while typing. */
export function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** True for a strictly negative amount (string check, no arithmetic). */
export function isNegative(value: Money): boolean {
  return WHOLE_NUMBER.test(value) && value.startsWith('-') && /[1-9]/.test(value)
}

/** True when the amount is exactly zero. */
export function isZero(value: Money): boolean {
  return WHOLE_NUMBER.test(value) && !/[1-9]/.test(value)
}

/** Plotting only. Do not use for money arithmetic. */
export function toPlotNumber(value: Money): number {
  return Number(value)
}

/** Short axis label for a plotted value: 1,5 tỷ · 20 tr · 500 k. Plotting only. */
export function formatCompactVnd(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '−' : ''
  if (abs >= 1e9) return `${sign}${compactNumber.format(abs / 1e9)} tỷ`
  if (abs >= 1e6) return `${sign}${compactNumber.format(abs / 1e6)} tr`
  if (abs >= 1e3) return `${sign}${compactNumber.format(abs / 1e3)} k`
  return `${sign}${abs}`
}

/** Exact sum of whole-VND strings (BigInt). */
export function addMoney(...values: Money[]): Money {
  return values.reduce((total, v) => total + BigInt(v), 0n).toString()
}

/** Exact `a - b` (BigInt). */
export function subtractMoney(a: Money, b: Money): Money {
  return (BigInt(a) - BigInt(b)).toString()
}

/** -1, 0 or 1, exactly (BigInt). */
export function compareMoney(a: Money, b: Money): number {
  const d = BigInt(a) - BigInt(b)
  return d < 0n ? -1 : d > 0n ? 1 : 0
}

/** Absolute value as a whole-VND string. */
export function absMoney(value: Money): Money {
  return value.startsWith('-') ? value.slice(1) : value
}

/** Plain spoken amount for sentences: `30000000` → `30 triệu`, `1250000000` → `1,25 tỷ`; uneven amounts stay exact. */
export function formatMoneyWords(value: Money): string {
  if (!WHOLE_NUMBER.test(value)) return formatVnd(value)
  const n = BigInt(absMoney(value))
  const sign = isNegative(value) ? '−' : ''
  const exact = (unit: bigint, word: string, decimals: number) => {
    const scaled = n * 10n ** BigInt(decimals)
    if (scaled % unit !== 0n) return null
    const whole = scaled / unit
    const text = decimals === 0 ? vndNumber.format(whole) : (decimals === 1 ? compactNumber : twoDecimals).format(Number(whole) / 10 ** decimals)
    return `${sign}${text} ${word}`
  }
  if (n >= 1_000_000_000n) return exact(1_000_000_000n, 'tỷ', 2) ?? `${sign}${formatVnd(absMoney(value))}`
  if (n >= 1_000_000n) return exact(1_000_000n, 'triệu', 1) ?? `${sign}${formatVnd(absMoney(value))}`
  return `${sign}${formatVnd(absMoney(value))}`
}
