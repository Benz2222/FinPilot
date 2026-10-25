import { useEffect, useRef, useState } from 'react'
import { Plane } from 'lucide-react'
import type { IsoDate } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { Copy } from './copy'
import { useCopy } from './copy'
import { SECOND_HALF_DAY } from './model'
import type { Flight, FlowName } from './model'
import { useInView, useReducedMotion } from './motion'
import { sound } from './sound'

const CH = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-/&+'
/** Tiles per column: due, obligation, amount, balance after, status. */
const WIDTHS = [6, 13, 6, 7, 5] as const
const ROWS: ({ restock: 1 | 2 } | { day: number; name: FlowName })[] = [
  { restock: 1 },
  { day: 6, name: 'clay' },
  { day: 12, name: 'payroll' },
  { day: 19, name: 'rent' },
  { restock: 2 },
  { day: 33, name: 'packaging' },
  { day: 42, name: 'payroll' },
  { day: 49, name: 'rent' },
]

type Status = 'clear' | 'short' | 'none'
interface Row {
  status: Status
  /** What the tiles spell. */
  tiles: [string, string, string, string, string]
  /** The same row as a sentence for screen readers. */
  said: string
}

function rowOf(spec: (typeof ROWS)[number], f: Flight, today: IsoDate, t: Copy): Row {
  const b = t.board
  const empty: Row = { status: 'none', tiles: ['', '', '', '', ''], said: b.empty }
  let day: number
  let name: FlowName
  let amount: number
  if ('restock' in spec) {
    if (f.restock === 0) return spec.restock === 1 ? { status: 'none', tiles: [b.due(today, 0), b.noRestock.label, '-', '', '-'], said: b.noRestock.said } : empty
    if (spec.restock === 2 && !f.split) return empty
    day = spec.restock === 1 ? 0 : SECOND_HALF_DAY
    name = f.split ? (spec.restock === 1 ? 'restock1' : 'restock2') : 'restock'
    const half = Math.round(f.restock / 2)
    amount = f.split ? (spec.restock === 1 ? half : f.restock - half) : f.restock
  } else {
    day = spec.day
    name = spec.name
    amount = -f.byDay[day].find((e) => e.name === spec.name)!.amount
  }
  const balance = f.balances[day]
  const status = balance < 0 ? 'short' : 'clear'
  const label = t.names[name]
  return {
    status,
    tiles: [b.due(today, day), label.toUpperCase(), b.amount(amount), b.amount(balance), b.status[status]],
    said: b.said(today, day, label, amount, balance, status === 'short'),
  }
}

/**
 * One cell of the split-flap board: `width` tiles. When its text changes each tile flips through a few random
 * characters before it lands, left to right, after `delay` ms. With `animate` off the text simply changes.
 */
export function Flaps({ text, width, alignEnd = false, delay = 0, animate, className }: { text: string; width: number; alignEnd?: boolean; delay?: number; animate: boolean; className?: string }) {
  const target = alignEnd ? text.padStart(width) : text.padEnd(width)
  const [shown, setShown] = useState(target)
  // What the tiles show right now; written only by the animation, read when the next one starts.
  const tiles = useRef(target)

  useEffect(() => {
    if (!animate) {
      tiles.current = target
      return
    }
    const from = tiles.current
    const left = [...target].map((ch, i) => (from[i] === ch ? 0 : 2 + Math.floor(Math.random() * 5)))
    const start = performance.now() + delay
    let current = from
    const id = setInterval(() => {
      const now = performance.now()
      let busy = false
      current = [...target]
        .map((ch, i) => {
          if (left[i] === 0 || now < start + i * 16) return left[i] === 0 ? ch : current[i]
          busy = true
          left[i] -= 1
          sound.flap()
          return left[i] === 0 ? ch : CH[Math.floor(Math.random() * CH.length)]
        })
        .join('')
      tiles.current = current
      setShown(current)
      if (!busy && left.every((n) => n === 0)) clearInterval(id)
    }, 62)
    return () => clearInterval(id)
  }, [target, animate, delay])

  return (
    <span aria-hidden="true" className={cn('fp-flaps', className)}>
      {[...(animate ? shown : target)].map((ch, i) => (
        // A new key per character restarts the tile's flip.
        <span key={`${i}${ch}`} className="fp-flap">
          {ch}
        </span>
      ))}
    </span>
  )
}

/** The obligations of the next 56 days on a departures board, re-flapping whenever the hero's scenario changes. */
export function DeparturesBoard({ flight, today, onAdjust }: { flight: Flight; today: IsoDate; onAdjust: () => void }) {
  const t = useCopy()
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { threshold: 0.25 })
  const reduce = useReducedMotion()
  const [clock, setClock] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 15_000)
    return () => clearInterval(id)
  }, [])
  const rows = ROWS.map((r) => rowOf(r, flight, today, t))

  return (
    <div ref={ref} className="fp-ink fp-board grid gap-0 overflow-hidden rounded-[var(--radius-container)] border-2 border-[var(--color-border-emphasized)] shadow-[var(--shadow-high)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--fp-ink-line)] px-4 py-3 sm:px-5">
        <h3 className="flex items-center gap-2 font-mono text-xs font-bold tracking-[0.12em] sm:text-sm">
          <Plane aria-hidden="true" className="size-4 text-[var(--fp-brand)]" />
          {t.board.heading}
        </h3>
        <span className="num font-mono text-xs tracking-[0.12em] fp-ink-dim">
          {t.board.local}{' '}
          <b className="text-[var(--fp-hero-ok)]">
            {String(clock.getHours()).padStart(2, '0')}:{String(clock.getMinutes()).padStart(2, '0')}
          </b>
        </span>
      </div>

      <div aria-hidden="true" className="fp-board-row fp-board-head hidden lg:grid">
        <span />
        <span>{t.board.columns[0]}</span>
        <span>{t.board.columns[1]}</span>
        <span className="text-right">{t.board.columns[2]}</span>
        <span className="text-right">{t.board.columns[3]}</span>
        <span>{t.board.columns[4]}</span>
      </div>
      <ol aria-label={t.board.list} className="divide-y divide-[var(--fp-ink-line)]">
        {rows.map((row, ri) => (
          <li key={ri} className="fp-board-row" data-status={row.status}>
            <span className="fp-led" aria-hidden="true" />
            {row.tiles.map((t, ci) => (
              <Flaps
                key={ci}
                text={seen ? t : ''}
                width={WIDTHS[ci]}
                alignEnd={ci === 2 || ci === 3}
                delay={ri * 55 + ci * 64}
                animate={seen && !reduce}
                className={ci === 4 ? 'fp-flaps-status' : undefined}
              />
            ))}
            <span className="sr-only">{row.said}</span>
          </li>
        ))}
      </ol>
      <p className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-[var(--fp-ink-line)] px-4 py-3 text-sm fp-ink-dim sm:px-5">
        <span>{t.board.note}</span>
        <button type="button" onClick={onAdjust} className="font-semibold text-[var(--fp-brand)] underline underline-offset-4">
          {t.board.adjust}
        </button>
      </p>
    </div>
  )
}
