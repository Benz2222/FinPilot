import { useEffect, useRef } from 'react'
import { Plus } from 'lucide-react'
import { useInView, useReducedMotion } from './motion'
import { sound } from './sound'

let kick = 0

/** "FREQ 121.5 · STANDING BY": a small radio wave that swells when a question opens. Still with reduced motion. */
export function RadioWave() {
  const ref = useRef<SVGPathElement>(null)
  const box = useRef<SVGSVGElement>(null)
  const visible = useInView(box, { once: false, threshold: 0 })
  const reduce = useReducedMotion()
  useEffect(() => {
    if (!visible || reduce) return
    let raf = 0
    let last = performance.now()
    let t = 0
    let amp = 2
    let seenKick = kick
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      t += dt
      if (kick !== seenKick) {
        seenKick = kick
        amp = 10
      }
      amp += (2.2 - amp) * (1 - Math.exp(-dt * 2))
      let d = 'M1 14'
      for (let x = 2; x <= 45; x += 1.5) d += `L${x} ${(14 + Math.sin(x * 0.55 - t * 7) * amp * Math.sin((x / 46) * Math.PI)).toFixed(2)}`
      ref.current?.setAttribute('d', d)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [visible, reduce])
  return (
    <p className="inline-flex items-center gap-3 rounded-full border-2 border-[var(--color-border-emphasized)] bg-card px-3 py-1.5 font-mono text-xs font-bold tracking-[0.12em]">
      <svg ref={box} viewBox="0 0 46 28" aria-hidden="true" className="h-6 w-10 text-[var(--color-success)]">
        <path ref={ref} d="M1 14h44" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      FREQ 121.5 · STANDING BY
    </p>
  )
}

/** One question as a disclosure: its callsign, the question, and the tower's answer. */
export function FaqItem({ n, q, a }: { n: number; q: string; a: string }) {
  return (
    <details
      className="fp-faq"
      onToggle={(e) => {
        if (e.currentTarget.open) {
          kick += 1
          sound.tick()
        }
      }}
    >
      <summary>
        <span className="font-mono text-xs font-bold tracking-[0.12em] text-secondary">FP-0{n}</span>
        <span className="font-display text-lg font-bold">{q}</span>
        <Plus aria-hidden="true" className="fp-faq-icon size-5" />
      </summary>
      <p className="fp-faq-answer">
        <span className="fp-faq-twr" aria-hidden="true">
          TWR
        </span>
        <span>{a}</span>
      </p>
    </details>
  )
}
