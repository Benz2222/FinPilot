import { useEffect, useState } from 'react'
import { ShieldCheck, Sigma } from 'lucide-react'
import { Led } from '@/components/readout'
import { cn } from '@/lib/utils'

/*
 * The canonical case, as an instrument that plays once: 50 tr on hand, 30 tr of stock bought today, 25 tr of wages and
 * rent on day 7, 35 tr from the marketplace on day 14. The line dips below zero on day 7 and the lamp lights; then the
 * purchase is split (20 tr now, 10 tr on day 15) and the second line stays above zero. Every figure is an example.
 */
const DAYS = 28
const BASE = [{ from: 0, value: 20 }, { from: 7, value: -5 }, { from: 14, value: 30 }]
const SPLIT = [{ from: 0, value: 30 }, { from: 7, value: 5 }, { from: 14, value: 40 }, { from: 15, value: 30 }]
const LO = -14
const HI = 52
const W = 560
const H = 196

// Timeline (ms): the current plan draws, a pause, then the split draws over it.
const DRAW = 500
const DRAW_LEN = 2400
const SPLIT_AT = DRAW + DRAW_LEN + 1000
const SPLIT_LEN = 2000
const END = SPLIT_AT + SPLIT_LEN + 400

const x = (day: number) => (day / DAYS) * W
const y = (tr: number) => H - ((tr - LO) / (HI - LO)) * H

function stepPath(steps: { from: number; value: number }[]) {
  let d = `M0 ${y(50)} L0 ${y(steps[0].value)}`
  steps.forEach((s, i) => {
    const to = steps[i + 1]?.from ?? DAYS
    d += ` L${x(to)} ${y(s.value)}`
    if (steps[i + 1]) d += ` L${x(to)} ${y(steps[i + 1].value)}`
  })
  return d
}

const clamp = (v: number) => Math.min(1, Math.max(0, v))
const ease = (v: number) => 1 - (1 - clamp(v)) ** 3

/** The lowest balance so far (in triệu) as the line is drawn, ticking from one value to the next. */
function lowest(steps: { from: number; value: number }[], start: number, len: number, t: number) {
  let shown = 50
  for (const s of steps) {
    const at = start + (s.from / DAYS) * len
    if (t < at) break
    if (s.value < shown) shown = shown + (s.value - shown) * ease((t - at) / 450)
  }
  return shown
}

function vnd(tr: number) {
  const n = Math.round(tr * 1_000_000)
  return `${n < 0 ? '−' : ''}${new Intl.NumberFormat('vi-VN').format(Math.abs(n))} ₫`
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** Milliseconds into the timeline. Plays once per mount; with reduced motion it starts on the last frame. */
function usePlayOnce() {
  const [t, setT] = useState(() => (reducedMotion() ? END : 0))
  useEffect(() => {
    if (reducedMotion()) return
    let frame = 0
    const began = performance.now()
    const tick = (now: number) => {
      const next = Math.min(END, now - began)
      setT(next)
      if (next < END) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])
  return t
}

/** The example forecast, drawn like the app's own instrument panel. Decorative: the same story is told in `ShowcaseSummary`. */
function DemoInstrument({ compact = false }: { compact?: boolean }) {
  const t = usePlayOnce()
  const day = ((t - DRAW) / DRAW_LEN) * DAYS
  const baseShown = clamp((t - DRAW) / DRAW_LEN)
  const splitShown = clamp((t - SPLIT_AT) / SPLIT_LEN)
  const short = day >= 7
  const resolved = t >= SPLIT_AT + SPLIT_LEN
  const splitStarted = t >= SPLIT_AT
  const baseLow = lowest(BASE, DRAW, DRAW_LEN, t)
  const splitLow = lowest(SPLIT, SPLIT_AT, SPLIT_LEN, t)
  const headDay = splitStarted ? splitShown * DAYS : baseShown * DAYS
  const headSteps = splitStarted ? SPLIT : BASE
  const headValue = [...headSteps].reverse().find((s) => s.from <= headDay)?.value ?? 50
  const lamp = resolved
    ? { signal: 'ok' as const, text: 'Chia đợt · đủ tiền', cls: 'border-ok-line bg-ok-soft text-ok' }
    : short
      ? { signal: 'shortage' as const, text: 'Thiếu tiền · sau 7 ngày', cls: 'border-shortage bg-shortage-soft text-shortage' }
      : { signal: 'idle' as const, text: 'Đang tính 56 ngày', cls: 'border-border bg-muted text-muted-foreground' }

  if (compact) {
    return (
      <div aria-hidden="true" className="flex items-center gap-3 rounded-lg border bg-glass px-3 py-2.5">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-10 w-24 shrink-0">
          <rect x="0" y={y(0)} width={W} height={H - y(0)} className="fill-shortage/10" />
          <line x1="0" x2={W} y1={y(0)} y2={y(0)} className="stroke-muted-foreground" strokeWidth="3" />
          <path d={stepPath(BASE)} fill="none" className="stroke-primary" strokeWidth="10" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - baseShown} />
        </svg>
        <div className="min-w-0">
          <p className="placard text-muted-foreground">Ví dụ · shop mẫu</p>
          <p className={cn('mt-1 flex items-center gap-1.5 text-sm font-semibold transition-colors', short ? 'text-shortage' : 'text-muted-foreground')}>
            <Led signal={short ? 'shortage' : 'idle'} />
            {short ? 'Thiếu 5 triệu sau 7 ngày' : 'Đang tính 56 ngày…'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div aria-hidden="true" className="overflow-hidden rounded-lg border border-input/50 bg-card shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9),0_0_0_1px_rgb(76_201_224/0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-glass px-5 py-3.5">
        <p className="placard text-muted-foreground">
          Ví dụ · shop mẫu · <span className="text-secondary-foreground">50 tr đầu kỳ</span>
        </p>
        <p
          className={cn(
            'placard flex items-center gap-2 rounded-md border px-2.5 py-1.5 font-semibold transition-colors duration-500',
            lamp.cls,
            short && !resolved && 'motion-safe:animate-[lamp_2.4s_ease-in-out_1]',
          )}
        >
          <Led signal={lamp.signal} />
          {lamp.text}
        </p>
      </div>

      <div className="px-5 pt-5">
        <svg viewBox={`-8 -8 ${W + 16} ${H + 16}`} className="block h-auto w-full overflow-visible">
          <defs>
            <pattern id="demo-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" className="stroke-shortage/25" strokeWidth="2" />
            </pattern>
            <clipPath id="demo-base">
              <rect x="-8" y="-8" width={baseShown * W + 8} height={H + 16} />
            </clipPath>
            <clipPath id="demo-split">
              <rect x="-8" y="-8" width={splitShown * W + 8} height={H + 16} />
            </clipPath>
          </defs>
          {[0, 20, 40].map((v) => (
            <line key={v} x1="0" x2={W} y1={y(v)} y2={y(v)} className={v === 0 ? 'stroke-foreground/55' : 'stroke-border'} strokeWidth="1" strokeDasharray={v === 0 ? undefined : '3 5'} />
          ))}
          <rect x="0" y={y(0)} width={W} height={H - y(0)} fill="url(#demo-hatch)" />
          <text x="6" y={H - 6} className="chart-placard fill-shortage text-[11px]">
            VÙNG THIẾU TIỀN
          </text>
          {[7, 14].map((d) => (
            <line key={d} x1={x(d)} x2={x(d)} y1="0" y2={H} className="stroke-border" strokeWidth="1" />
          ))}

          <g clipPath="url(#demo-base)" className="transition-opacity duration-500" opacity={splitStarted ? 0.45 : 1}>
            <path d={`${stepPath(BASE)} L${W} ${y(0)} L0 ${y(0)} Z`} className="fill-primary/8" />
            <path d={stepPath(BASE)} fill="none" className="stroke-primary" strokeWidth="2" strokeLinejoin="round" />
            <path d={`M${x(7)} ${y(-5)} L${x(14)} ${y(-5)}`} className="stroke-shortage" strokeWidth="2.5" />
          </g>
          {short && <circle cx={x(7)} cy={y(-5)} r="5" className="fill-card stroke-shortage" strokeWidth="2" />}

          <g clipPath="url(#demo-split)">
            <path d={stepPath(SPLIT)} fill="none" className="stroke-ok" strokeWidth="2.5" strokeLinejoin="round" />
          </g>

          {t > DRAW && t < END - 400 && (
            <circle cx={x(headDay)} cy={y(headValue)} r="4" className={splitStarted ? 'fill-ok' : 'fill-primary'} style={{ filter: 'drop-shadow(0 0 6px currentColor)' }} />
          )}
        </svg>
        <div className="num relative mt-1 h-5 text-[0.6875rem] text-muted-foreground">
          {[
            [0, 'Hôm nay'],
            [7, 'Ngày 7'],
            [14, 'Ngày 14'],
            [21, 'Ngày 21'],
          ].map(([d, label]) => (
            <span key={d} className="absolute whitespace-nowrap" style={{ left: `${(Number(d) / DAYS) * 100}%` }}>
              {label}
            </span>
          ))}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-px border-t bg-border">
        <div className="bg-card px-5 py-4">
          <dt className="placard flex items-center gap-2 text-muted-foreground">
            <span className="h-0.5 w-3 rounded-full bg-primary" /> Kế hoạch hiện tại
          </dt>
          <dd className={cn('num mt-2.5 text-xl font-medium tracking-tight whitespace-nowrap', baseLow < 0 && 'text-shortage')}>{vnd(baseLow)}</dd>
          <dd className="mt-1.5 text-xs text-muted-foreground">{short ? 'Thấp nhất · thiếu từ ngày 7' : 'Số dư thấp nhất'}</dd>
        </div>
        <div className={cn('bg-card px-5 py-4 transition-opacity duration-500', splitStarted ? 'opacity-100' : 'opacity-40')}>
          <dt className="placard flex items-center gap-2 text-muted-foreground">
            <span className="h-0.5 w-3 rounded-full bg-ok" /> Chia đợt nhập hàng
          </dt>
          <dd className="num mt-2.5 text-xl font-medium tracking-tight whitespace-nowrap">{splitStarted ? vnd(splitLow) : '—'}</dd>
          <dd className="mt-1.5 text-xs text-muted-foreground">20 tr hôm nay · 10 tr ngày 15</dd>
        </div>
      </dl>
    </div>
  )
}

/** What the instrument shows, for screen readers (the animation itself is hidden from them). */
function ShowcaseSummary() {
  return (
    <p className="sr-only">
      Ví dụ: shop có 50 triệu, nhập hàng 30 triệu hôm nay, trả lương và tiền thuê 25 triệu sau 7 ngày, tiền sàn 35 triệu về sau 14 ngày. FinPilot báo
      trước thiếu 5 triệu từ ngày thứ 7. Chia đợt nhập hàng (20 triệu hôm nay, 10 triệu ngày 15) thì không ngày nào thiếu.
    </p>
  )
}

const STEPS = ['Nhập số tiền đang có hôm nay', 'Ghi các khoản sắp chi, sắp thu', 'Xem 56 ngày tới: ngày nào thiếu, thiếu bao nhiêu']

/** The product side of the sign-in frame: the promise, the example instrument and the honest small print. */
export function Showcase({ steps = false }: { steps?: boolean }) {
  return (
    <div className="relative flex h-full flex-col justify-center gap-8 px-10 py-12 xl:px-16">
      <div className="max-w-xl">
        <p className="placard text-primary">Buồng lái dòng tiền · 56 ngày</p>
        <h2 className="mt-3 text-[2rem] leading-tight font-semibold tracking-tight text-foreground xl:text-[2.375rem]">
          Biết trước ngày nào shop thiếu tiền, thiếu bao nhiêu.
        </h2>
        <p className="mt-3 text-lg text-secondary-foreground">Thử phương án nhập hàng trước khi chi tiền thật.</p>
      </div>

      <div className="max-w-xl">
        <DemoInstrument />
        <ShowcaseSummary />
      </div>

      {steps ? (
        <ol className="grid max-w-xl gap-3 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s} className="flex gap-3 text-sm text-secondary-foreground">
              <span className="num grid size-6 shrink-0 place-items-center rounded-full border border-primary/40 text-xs text-primary">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      ) : (
        <ul className="grid max-w-xl gap-3 text-sm text-secondary-foreground sm:grid-cols-2">
          <li className="flex gap-3">
            <Sigma aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            Không phải dự báo AI: chỉ cộng trừ từ số dư hiện có và các khoản bạn ghi.
          </li>
          <li className="flex gap-3">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            Dữ liệu lưu theo tài khoản, mỗi shop tách riêng.
          </li>
        </ul>
      )}
    </div>
  )
}

/** Phones and tablets: the same example as one slim line above the form. */
export function ShowcaseStrip() {
  return (
    <div>
      <DemoInstrument compact />
      <ShowcaseSummary />
    </div>
  )
}
