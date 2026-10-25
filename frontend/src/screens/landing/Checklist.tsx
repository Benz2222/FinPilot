import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { ProgressBar } from '@astryxdesign/core/ProgressBar'
import { cn } from '@/lib/utils'
import { CHECKS } from './copy'
import { useInView, useReducedMotion } from './motion'
import { sound } from './sound'


/** One line of the pre-flight list: a toggle with its challenge, dotted leader, response and what it means. */
export function CheckItem({ title, response, text, checked, onToggle }: { title: string; response: string; text: string; checked: boolean; onToggle: () => void }) {
  return (
    <button type="button" aria-pressed={checked} onClick={onToggle} className="fp-check">
      <span className="fp-check-box" aria-hidden="true">
        <Check className="size-4" strokeWidth={3.5} />
      </span>
      <span className="grid min-w-0 gap-1">
        <span className="flex items-baseline gap-2 font-display text-lg font-bold">
          <span>{title}</span>
          <span className="fp-leader" aria-hidden="true" />
          <span className="eyebrow fp-check-response">{response}</span>
        </span>
        <span className="text-secondary">{text}</span>
      </span>
    </button>
  )
}

/**
 * How it works, as a pilot's pre-flight list. The four checks tick themselves the first time the list is on screen
 * (all at once with reduced motion) unless the visitor gets there first; each one can be toggled.
 */
export function Checklist({ onCount }: { onCount: (n: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { threshold: 0.45 })
  const reduce = useReducedMotion()
  const [done, setDone] = useState<boolean[]>(() => CHECKS.map(() => false))
  const touched = useRef(false)
  const n = done.filter(Boolean).length

  useEffect(() => onCount(n), [n, onCount])
  useEffect(() => {
    if (n === CHECKS.length) sound.chime()
  }, [n])

  function set(i: number, on: boolean) {
    if (on) sound.check()
    else sound.uncheck()
    setDone((d) => d.map((x, k) => (k === i ? on : x)))
  }

  useEffect(() => {
    if (!seen) return
    const timers = CHECKS.map((_, i) =>
      setTimeout(
        () => {
          if (!touched.current) set(i, true)
        },
        reduce ? 0 : 600 + i * 700,
      ),
    )
    return () => timers.forEach(clearTimeout)
  }, [seen, reduce])

  return (
    <div ref={ref} className="fp-clip">
      <p className="flex justify-between gap-3 border-b-2 border-dashed border-[var(--color-border-emphasized)] px-4 py-3 font-mono text-xs font-bold tracking-[0.12em] uppercase sm:px-5">
        <span>Pre-flight · restock</span>
        <span className="text-secondary">FP-CHK-01</span>
      </p>
      <ol className="divide-y">
        {CHECKS.map((c, i) => (
          <li key={c.title}>
            <CheckItem
              {...c}
              checked={done[i]}
              onToggle={() => {
                touched.current = true
                set(i, !done[i])
              }}
            />
          </li>
        ))}
      </ol>
      <div className={cn('grid gap-2 border-t-2 border-[var(--color-border-emphasized)] px-4 py-3 sm:px-5', n === CHECKS.length && 'bg-ok-soft')}>
        <p className="num text-sm font-bold" aria-live="polite">
          {n === CHECKS.length ? '4 of 4 — cleared for restock' : `${n} of 4 checks`}
        </p>
        <ProgressBar label="Checks done" isLabelHidden value={(n / CHECKS.length) * 100} />
      </div>
    </div>
  )
}
