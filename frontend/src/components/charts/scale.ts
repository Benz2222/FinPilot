/** Round a rough tick step up to 1, 2 or 5 × 10^k so an axis lands on clean numbers. */
export function niceStep(rough: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const fraction = rough / magnitude
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return Math.max(1, nice * magnitude)
}

/** About four clean ticks covering [min, max], always including 0. An all-zero range still gets a visible axis. */
export function niceTicks(min: number, max: number): { ticks: number[]; lo: number; hi: number } {
  const top = max === min ? min + 1_000_000 : max
  const step = niceStep((top - min) / 4)
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(top / step) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v))
  return { ticks, lo, hi }
}
