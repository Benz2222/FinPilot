import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowRight, Plane } from 'lucide-react'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { cn } from '@/lib/utils'
import { FARES } from './copy'
import { useInView, useReducedMotion } from './motion'
import { sound } from './sound'

type Billing = 'month' | 'year'


const grouped = new Intl.NumberFormat('en-US')

/** A price that counts to its new value when the billing period changes (at once with reduced motion). */
function Price({ value, reduce }: { value: number; reduce: boolean }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    if (reduce || from.current === value) {
      from.current = value
      setShown(value)
      return
    }
    const start = performance.now()
    const a = from.current
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 550)
      const e = 1 - (1 - t) ** 3
      const v = Math.round((a + (value - a) * e) / 1000) * 1000
      from.current = v
      setShown(v)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, reduce])
  return <span className="figure num text-[2.75rem]">{grouped.format(shown)}</span>
}

/** One plan as a boarding card: class letter, flight level, price, what it includes and a sign-up button. */
export function FareCard({ fare, billing, active, reduce, onActive }: { fare: (typeof FARES)[number]; billing: Billing; active: boolean; reduce: boolean; onActive?: () => void }) {
  const hi = 'badge' in fare
  return (
    <article
      aria-labelledby={`fare-${fare.name}`}
      onPointerEnter={onActive}
      onFocus={onActive}
      className={cn('fp-fare', hi && 'fp-fare-hi', active && 'fp-fare-active')}
    >
      {hi && <span className="fp-fare-badge">{fare.badge}</span>}
      <p className="flex items-center justify-between gap-3 border-b-2 border-dashed border-current/30 pb-3">
        <span aria-hidden="true" className="fp-fare-cls">
          {fare.cls}
        </span>
        <span className="font-mono text-xs font-bold tracking-[0.12em] uppercase">{fare.level}</span>
      </p>
      <h3 id={`fare-${fare.name}`} className="font-display text-3xl font-extrabold tracking-tight">
        {fare.name}
      </h3>
      <p className="-mt-2 opacity-80">{fare.for}</p>
      <p className="flex items-baseline gap-1">
        <span className="text-xl font-bold">₫</span>
        <Price value={fare.price[billing]} reduce={reduce} />
        <span className="text-sm opacity-80">/ month</span>
      </p>
      <p className="-mt-3 text-sm opacity-80">{fare.bill[billing]}</p>
      <ul className="grid gap-2 border-t-2 border-dashed border-current/30 pt-4">
        {fare.list.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span aria-hidden="true" className="fp-fare-tick" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <span className="mt-auto pt-2">
        <Button href="#dang-ky" variant={hi ? 'primary' : 'secondary'} size="lg" width="100%" label={fare.cta} endContent={<Icon icon={ArrowRight} />} />
      </span>
    </article>
  )
}

/**
 * Pricing as a climb: the billing toggle recounts the prices, and from lg a dashed flight path climbs over the three
 * cards with a plane that flies to whichever card is hovered or focused (Pilot when none is).
 */
export function Fares() {
  const reduce = useReducedMotion()
  const [billing, setBilling] = useState<Billing>('month')
  const [hover, setHover] = useState<number | null>(null)
  const active = hover ?? 1
  const wrap = useRef<HTMLDivElement>(null)
  const flying = useInView(wrap, { threshold: 0.3 })
  const [points, setPoints] = useState<{ x: number; y: number }[]>([])
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 })

  // Waypoints sit above the middle of each card, a step higher each fare; measured so the path follows the real layout.
  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const measure = () => {
      // The grid cells, not the cards: a cell's reveal transform would make it the card's offsetParent.
      const cards = [...el.querySelectorAll<HTMLElement>(':scope > [data-reveal]')]
      setSize({ width: el.clientWidth, height: el.clientHeight })
      setPoints(cards.map((c, i) => ({ x: c.offsetLeft + c.offsetWidth / 2, y: c.offsetTop - 16 - i * 20 })))
    }
    measure()
    const ro = new ResizeObserver(measure)
    // The border box: the padding above the cards changes at lg without the content box changing.
    ro.observe(el, { box: 'border-box' })
    return () => ro.disconnect()
  }, [])

  const all = points.length ? [{ x: 0, y: points[0].y + 12 }, ...points, { x: width, y: points[points.length - 1].y - 24 }] : []
  const d = all.reduce((acc, p, i) => {
    if (i === 0) return `M${p.x} ${p.y}`
    const q = all[i - 1]
    const mx = (q.x + p.x) / 2
    return `${acc} C${mx} ${q.y} ${mx} ${p.y} ${p.x} ${p.y}`
  }, '')
  const plane = flying && points[active] ? points[active] : all[0]

  function pickBilling(b: Billing) {
    sound.tick()
    setBilling(b)
  }

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3" data-reveal="" data-d="1">
        <fieldset>
          <legend className="sr-only">Billing period</legend>
          <div className="fp-toggle min-w-[17rem]">
            {(['month', 'year'] as const).map((b) => (
              <label key={b}>
                <input type="radio" name="billing" value={b} checked={billing === b} onChange={() => pickBilling(b)} />
                <span>
                  {b === 'month' ? 'Monthly' : 'Yearly'}
                  {b === 'year' && <b className="rounded-full bg-[var(--fp-hero-ok)] px-1.5 text-xs text-[var(--fp-hero-ink)]">−20%</b>}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <span className="fp-tag">Indicative launch pricing · not on sale yet</span>
      </div>

      <div ref={wrap} onPointerLeave={() => setHover(null)} className="relative grid gap-5 md:grid-cols-3 lg:gap-6 lg:pt-16">
        {d && (
          <svg aria-hidden="true" className="fp-climb pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible lg:block" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <path d={d} className="fp-climb-path" />
            {points.map((p, i) => (
              <g key={i} className={cn('fp-climb-wp', i <= active && flying && 'fp-climb-wp-on')}>
                <circle cx={p.x} cy={p.y} r={6} />
                <text x={p.x + 12} y={p.y - 10}>
                  {FARES[i].level.split(' ')[0]}
                </text>
              </g>
            ))}
          </svg>
        )}
        {plane && (
          <span aria-hidden="true" className="fp-climb-plane hidden lg:grid" style={{ transform: `translate(${plane.x}px, ${plane.y}px)` }}>
            <Plane className="size-5" />
          </span>
        )}
        {FARES.map((f, i) => (
          <div key={f.name} className="grid" data-reveal="" data-d={String(i + 1)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
            <FareCard fare={f} billing={billing} active={i === active} reduce={reduce} onActive={() => setHover(i)} />
          </div>
        ))}
      </div>

      <p className="text-center font-mono text-xs tracking-[0.06em] text-secondary">Prices in VND, VAT included. No card needed for Glider. Nothing on this page charges or sends anything.</p>
    </div>
  )
}
