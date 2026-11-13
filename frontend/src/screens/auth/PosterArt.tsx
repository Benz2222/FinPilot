import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/*
 * The sign-in poster is one drawing and no sentences: a month of cash as a skyline. The ink ground is the balance,
 * its notch under the dotted zero line is the shortage, and a giant ₫ coin rises behind it like a sun.
 * `progress` (0–1, how much of the form is filled) lifts the ground out of the notch and brings the coin up, so the
 * picture answers the visitor as she types.
 *
 * It is drawn in real pixels for the page it covers, so the line weights stay the same on a phone and on a desktop:
 * on a narrow page the story sits at the top, above the form; on a wide one it keeps to the left of it.
 */

const INK = 'var(--fp-brand-ink)'
const SKY = 'var(--fp-brand)'
const SHORT = 'var(--fp-hero-short)'
const OK = 'var(--fp-hero-ok)'
const PAPER = 'var(--color-background-surface)'
const HEADING = 'var(--font-family-heading)'

/** Where each step starts (fraction of the story's width) and how high the balance stands there, in units above zero. */
const STEPS = [0, 0.1, 0.19, 0.27, 0.37, 0.45, 0.52, 0.63, 0.7, 0.78, 0.86, 0.94]
const SHORT_LEVELS = [3.2, 2.6, 3.3, 1.8, -1.0, -0.4, -2.4, -1.6, 1.0, 2.0, 3.0, 4.4]
const OK_LEVELS = [3.2, 2.6, 3.3, 1.8, 0.7, 1.2, 0.5, 1.0, 1.9, 2.6, 3.4, 4.6]
/** The steps the small coins sit on, and the wedge count of the sunburst. */
const COIN_STEPS = [9, 10]
const RAYS = 14

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const ease = (v: number) => v * v * (3 - 2 * v)

function useBox(ref: React.RefObject<HTMLDivElement | null>) {
  const [box, setBox] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setBox((old) => (old.w === width && old.h === height ? old : { w: width, h: height }))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return box
}

/** Follows `target` smoothly; starts below it so the coin rises as the page opens. Jumps when motion is unwanted. */
function useGlide(target: number, still: boolean) {
  const [value, setValue] = useState(still ? target : target - 0.7)
  const current = useRef(value)
  useEffect(() => {
    if (still) return
    let frame = 0
    const step = () => {
      const gap = target - current.current
      current.current = Math.abs(gap) < 0.002 ? target : current.current + gap * 0.07
      setValue(current.current)
      if (current.current !== target) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, still])
  return still ? target : value
}

const POP = '[transform-box:fill-box] [transform-origin:center] transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none'

function Stamp({ x, y, u, fill, shown, tilt, children }: { x: number; y: number; u: number; fill: string; shown: boolean; tilt: number; children: string }) {
  const height = Math.max(24, u * 1.25)
  const width = height * (children.length * 0.52 + 1.1)
  return (
    <g className={POP} style={{ opacity: shown ? 1 : 0, transform: `scale(${shown ? 1 : 0.5}) rotate(${tilt}deg)` }}>
      <rect x={x - width / 2} y={y - height / 2} width={width} height={height} rx={height / 2} fill={fill} stroke={INK} strokeWidth="3" />
      <text x={x} y={y + height * 0.19} textAnchor="middle" fill={INK} fontFamily={HEADING} fontSize={height * 0.52} fontWeight="800" letterSpacing="1">
        {children}
      </text>
    </g>
  )
}

/** Decorative. Fills whatever box its parent gives it. */
export function PosterArt({ progress, className }: { progress: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { w, h } = useBox(ref)
  const [still] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const glide = useGlide(progress, still)

  const wide = w >= 1024
  const story = wide ? w * clamp((w - 560) / w, 0.42, 0.62) : w
  const u = clamp(Math.min(story / 19.2, wide ? h * 0.06 : 30), 16, 46)
  const zero = wide ? h * 0.64 : u * 10.5
  const filled = ease(clamp(glide, 0, 1))
  const levels = SHORT_LEVELS.map((short, i) => short + (OK_LEVELS[i] - short) * filled)
  const xs = STEPS.map((f) => f * story)
  const ys = levels.map((level) => zero - level * u)

  const line = `M-10 ${ys[0]}` + xs.slice(1).map((x, i) => `H${x}V${ys[i + 1]}`).join('') + `H${w + 10}`
  const ground = `${line}V${h + 10}H-10Z`
  // The coin comes up from behind the right-hand steps and drifts left as it climbs, clear of the small coins.
  const sun = { x: story * (0.84 - 0.22 * clamp(glide, 0, 1)), y: zero - u * (0.9 + 5.6 * glide), r: u * 2.7 }
  const reach = Math.hypot(w, h)
  const deepest = levels.indexOf(Math.min(...levels))
  const pitX = (xs[4] + xs[8]) / 2
  const strata = Math.min(24, Math.ceil((h - zero) / (1.9 * u)))

  return (
    <div ref={ref} aria-hidden="true" className={cn('size-full overflow-hidden', className)} style={{ background: SKY }}>
      {w > 0 && (
        <svg focusable="false" width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block">
          <defs>
            <pattern id="fp-auth-hatch" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="16" fill={SHORT} />
            </pattern>
          </defs>

          {/* Sunburst behind the coin, turning slowly. */}
          <g transform={`translate(${sun.x} ${sun.y})`}>
            <g fill={PAPER} fillOpacity=".14">
              {!still && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="160s" repeatCount="indefinite" />}
              {Array.from({ length: RAYS }, (_, i) => {
                const a = (i * 2 * Math.PI) / RAYS
                const d = Math.PI / RAYS / 2
                return <path key={i} d={`M0 0L${reach * Math.cos(a - d)} ${reach * Math.sin(a - d)}L${reach * Math.cos(a + d)} ${reach * Math.sin(a + d)}Z`} />
              })}
            </g>
            <g transform="rotate(-12)">
              <circle r={sun.r} fill={OK} stroke={INK} strokeWidth="4" />
              <circle r={sun.r * 0.8} fill="none" stroke={INK} strokeWidth="2.5" strokeDasharray="2 9" strokeLinecap="round" />
              <text y={sun.r * 0.4} textAnchor="middle" fill={INK} fontFamily={HEADING} fontSize={sun.r * 1.15} fontWeight="800">
                ₫
              </text>
            </g>
          </g>

          {/* The shortage: hatching wherever the balance stands under zero. */}
          {[SKY, 'url(#fp-auth-hatch)'].map((fill) =>
            levels.map((level, i) => level < 0 && <rect key={fill + i} x={xs[i]} y={zero} width={(xs[i + 1] ?? w) - xs[i]} height={-level * u} fill={fill} />),
          )}

          <path d={ground} fill={INK} />
          {/* Earlier months, as strata in the ground. */}
          <g fill="none" stroke={SKY} strokeWidth="2.5" strokeLinejoin="round">
            {Array.from({ length: strata }, (_, k) => (
              <path key={k} d={line} transform={`translate(0 ${(k + 1) * 1.9 * u})`} strokeOpacity={Math.max(0.07, 0.3 - k * 0.05)} />
            ))}
          </g>
          <path d={line} fill="none" stroke={PAPER} strokeWidth="4" strokeLinejoin="round" />

          {/* Zero, with a tick a day and a longer one a week. */}
          <path d={`M0 ${zero}H${w}`} stroke={PAPER} strokeOpacity=".7" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 9" />
          {Array.from({ length: Math.ceil(w / (u * 0.62)) }, (_, i) => (
            <path key={i} d={`M${i * u * 0.62} ${zero + 6}v${i % 7 === 0 ? u * 0.42 : u * 0.2}`} stroke={PAPER} strokeOpacity=".32" strokeWidth="2" strokeLinecap="round" />
          ))}

          <circle cx={(xs[deepest] + xs[deepest + 1]) / 2} cy={ys[deepest]} r={Math.max(6, u * 0.3)} fill={filled < 0.5 ? SHORT : OK} stroke={INK} strokeWidth="3" />
          <Stamp x={pitX} y={wide ? zero + 3.5 * u : zero - 1.6 * u} u={u} fill={SHORT} shown={glide < 0.5} tilt={-4}>
            THIẾU
          </Stamp>
          <Stamp x={xs[4]} y={zero - 3.1 * u} u={u} fill={PAPER} shown={glide > 0.9} tilt={-6}>
            ĐỦ
          </Stamp>

          {COIN_STEPS.map((step, k) => {
            // A flourish for a finished form: they land once the big coin has drifted past.
            const shown = glide > 0.8 + k * 0.06
            const r = Math.max(9, u * 0.6)
            return (
              <g key={step} className={POP} style={{ opacity: shown ? 1 : 0, transform: `scale(${shown ? 1 : 0.3})`, transitionDelay: `${k * 60}ms` }}>
                <circle cx={xs[step] + r * 1.4} cy={ys[step] - r * 1.9} r={r} fill={OK} stroke={INK} strokeWidth="3" />
                <text x={xs[step] + r * 1.4} y={ys[step] - r * 1.9 + r * 0.4} textAnchor="middle" fill={INK} fontFamily={HEADING} fontSize={r * 1.15} fontWeight="800">
                  ₫
                </text>
              </g>
            )
          })}
        </svg>
      )}
    </div>
  )
}
