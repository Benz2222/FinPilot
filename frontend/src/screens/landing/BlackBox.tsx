import { useEffect, useRef, useState } from 'react'
import { Play } from 'lucide-react'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Icon } from '@astryxdesign/core/Icon'
import { cn } from '@/lib/utils'
import { useCopy } from './copy'
import { useInView, useReducedMotion } from './motion'
import { sound } from './sound'

/*
 * The case file: one month of a fictional pottery shop, played back from its "cash flight recorder" on two channels:
 * as it happened (payroll bounces) and with FinPilot (one split payment and payroll clears).
 */

const OPEN = 96_400_000
type Kind = 'open' | 'say' | 'fp' | 'in' | 'out' | 'fail' | 'ok'
/** day of the month (from 0), time, amount, kind (default: in/out by sign). The words are in the copy, line for line. */
type Line = [number, string, number, Kind?]
type Channel = 'a' | 'b'

const TAPES: Record<Channel, Line[]> = {
  a: [
    [0, '08:00', 0, 'open'],
    [1, '09:12', 0, 'say'],
    [1, '09:14', 0, 'say'],
    [1, '09:14', -72e6],
    [4, '06:30', 16.5e6],
    [8, '10:00', -7.5e6],
    [14, '08:00', -28e6],
    [18, '06:30', 17.9e6],
    [21, '16:20', 12.4e6],
    [25, '17:00', 0, 'say'],
    [25, '17:00', -48.5e6, 'fail'],
    [26, '09:30', 0, 'say'],
  ],
  b: [
    [0, '08:00', 0, 'open'],
    [1, '09:12', 0, 'say'],
    [1, '09:13', 0, 'fp'],
    [1, '09:13', 0, 'fp'],
    [1, '09:16', 0, 'say'],
    [1, '09:16', -36e6],
    [4, '06:30', 16.5e6],
    [8, '10:00', -7.5e6],
    [14, '08:00', -28e6],
    [18, '06:30', 17.9e6],
    [21, '16:20', 12.4e6],
    [25, '17:00', -48.5e6, 'ok'],
    [29, '06:30', 19.6e6],
    [32, '09:00', -36e6],
  ],
}

interface TapeRow {
  day: number
  hhmm: string
  amount: number
  kind: Kind
  /** Balance after this line, or null for words. A rejected payment shows what it would have left. */
  balance: number | null
}

function rowsOf(ch: Channel): TapeRow[] {
  let balance = OPEN
  return TAPES[ch].map(([day, hhmm, amount, k]) => {
    const kind = k ?? (amount < 0 ? 'out' : 'in')
    const after = balance + amount
    const money = amount !== 0 || kind === 'open'
    if (kind !== 'fail') balance = after
    return { day, hhmm, amount, kind, balance: money ? after : null }
  })
}

/* Seven-segment readout: a sign cell, three integer digits and one decimal, in millions. */
const SEGS: Record<string, string> = { '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg', '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', ' ': '' }
const hs = (y: number) => `5,${y} 9,${y - 4} 29,${y - 4} 33,${y} 29,${y + 4} 9,${y + 4}`
const vs = (x: number, a: number, b: number) => `${x},${a} ${x + 4},${a + 4} ${x + 4},${b - 4} ${x},${b} ${x - 4},${b - 4} ${x - 4},${a + 4}`
const GEO: Record<string, string> = { a: hs(4), g: hs(33), d: hs(62), f: vs(3, 5, 32), b: vs(35, 5, 32), e: vs(3, 34, 61), c: vs(35, 34, 61) }

export function SevenSegment({ value }: { value: number }) {
  const m = Math.round(value / 1e5) / 10
  const [int, dec] = Math.abs(m).toFixed(1).split('.')
  const str = (m < 0 ? '-' : ' ') + int.slice(-3).padStart(3, ' ') + dec
  return (
    <svg viewBox="0 0 250 68" aria-hidden="true" className="fp-seg7">
      <g transform="translate(10 0) skewX(-7)">
        {[...str].map((ch, i) => (
          <g key={i} transform={`translate(${i * 46 + (i === 4 ? 12 : 0)} 0)`}>
            {Object.entries(GEO).map(([s, points]) => (
              <polygon key={s} points={points} data-on={SEGS[ch].includes(s) || undefined} />
            ))}
          </g>
        ))}
        <circle cx={4 * 46} cy={62} r={4.5} data-on />
      </g>
    </svg>
  )
}

/** The recorder's figure eases toward the latest balance instead of jumping (at once with reduced motion). */
function useEased(target: number, reduce: boolean): number {
  const [shown, setShown] = useState(target)
  const shownRef = useRef(target)
  useEffect(() => {
    if (reduce) {
      shownRef.current = target
      return
    }
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const d = target - shownRef.current
      shownRef.current = Math.abs(d) < 5e4 ? target : shownRef.current + d * (1 - Math.exp(-dt * 7))
      setShown(shownRef.current)
      if (shownRef.current !== target) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, reduce])
  return reduce ? target : shown
}

export function BlackBox() {
  const t = useCopy()
  const bb = t.blackBox
  const reduce = useReducedMotion()
  const tapeRef = useRef<HTMLDivElement>(null)
  const seen = useInView(tapeRef, { threshold: 0.35 })
  const [ch, setCh] = useState<Channel>('a')
  const [printedLines, setPrinted] = useState(0)
  const [endedTape, setEnded] = useState(false)
  const [run, setRun] = useState(0)
  const played = useRef(false)
  const rows = rowsOf(ch)

  // Plays once by itself, the first time the tape is on screen.
  useEffect(() => {
    if (seen && !played.current) {
      played.current = true
      setRun((r) => r + 1)
    }
  }, [seen])

  // Prints the tape line by line; with reduced motion it is printed whole at once (below).
  useEffect(() => {
    if (run === 0 || reduce) return
    const all = rowsOf(ch)
    const timers: ReturnType<typeof setTimeout>[] = []
    let at = 250
    all.forEach((row, i) => {
      timers.push(
        setTimeout(() => {
          setPrinted(i + 1)
          if (row.kind === 'fail') sound.alarm()
          else if (row.kind === 'fp') sound.caution()
          else sound.flap()
        }, at),
      )
      at += row.kind === 'fp' ? 1100 : row.kind === 'say' ? 800 : 560
      if (all[i + 1]?.kind === 'fail') at += 700
      if (row.kind === 'fail') at += 600
    })
    timers.push(
      setTimeout(() => {
        setEnded(true)
        if (ch === 'b') sound.chime()
      }, at + 200),
    )
    return () => timers.forEach(clearTimeout)
  }, [run, ch, reduce])

  function play(next: Channel) {
    sound.tick()
    played.current = true
    setCh(next)
    setPrinted(0)
    setEnded(false)
    setRun((r) => r + 1)
  }

  const whole = reduce && run > 0
  const printed = whole ? rows.length : printedLines
  const ended = whole || endedTape
  const current = printed > 0 ? rows[printed - 1] : null
  const lastMoney = rows.slice(0, printed).reduce<number>((b, r) => (r.balance === null ? b : r.balance), OPEN)
  const failed = rows.slice(0, printed).some((r) => r.kind === 'fail')
  const figure = useEased(lastMoney, reduce)
  const end = bb.end[ch]
  const words = bb.tapes[ch]

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-10">
      <div className="grid gap-4" data-reveal="" data-d="1">
        <div className={cn('fp-recorder', failed && !reduce && 'fp-recorder-hit')} key={failed ? 'hit' : 'calm'}>
          <span className="fp-hazard" aria-hidden="true" />
          <p className="flex items-baseline justify-between gap-3 font-display text-xl font-extrabold tracking-tight">
            {bb.recorder}
            <small className="grid text-right font-mono text-[0.625rem] font-bold tracking-[0.14em] uppercase">
              <span>Do not open</span>
              <span lang="vi">Không được mở</span>
            </small>
          </p>
          <div className={cn('fp-lcd', figure < 0 && 'fp-lcd-bad', failed && 'fp-lcd-alarm')} aria-hidden="true">
            <p className="flex justify-between">
              <b>{bb.time(current?.day ?? 0, current?.hhmm ?? rows[0].hhmm)}</b>
              <span>CH {ch.toUpperCase()}</span>
            </p>
            <p className="flex items-end gap-2">
              <SevenSegment value={figure} />
              <span className="pb-1 font-bold">{bb.unit}</span>
            </p>
            <p className="flex justify-between">
              <span>{words[current ? printed - 1 : 0][0]}</span>
              <b>{bb.day((current?.day ?? 0) + 1)}</b>
            </p>
          </div>
          <span className="fp-hazard" aria-hidden="true" />
          <p className="flex justify-between gap-3 font-mono text-[0.6875rem] font-bold tracking-[0.12em] uppercase">
            <span>S/N FP-26-029</span>
            <span>
              <span lang="vi">Tiệm Gốm Mây</span> · {bb.fictional}
            </span>
          </p>
        </div>
        <div role="group" aria-label={bb.channel} className="grid grid-cols-2 gap-2">
          {(['a', 'b'] as const).map((k) => (
            <button key={k} type="button" aria-pressed={ch === k} onClick={() => play(k)} className="fp-channel">
              <span className="font-mono text-xs font-bold tracking-[0.14em]">CH {k.toUpperCase()}</span>
              <b>{bb.channels[k]}</b>
            </button>
          ))}
        </div>
        <Button variant="secondary" label={bb.replay} icon={<Icon icon={Play} />} onClick={() => play(ch)} />
      </div>

      <div ref={tapeRef} className="grid gap-4" data-reveal="" data-d="2">
        <Card padding={0} elevation="high" className="relative overflow-hidden text-[var(--color-text-primary)]">
          <p className="flex flex-wrap justify-between gap-x-3 gap-y-1 border-b-2 border-dashed border-[var(--color-border-emphasized)] px-4 py-3 font-mono text-xs font-bold tracking-[0.1em] uppercase sm:px-5">
            <span>{bb.transcript}</span>
            <b>
              CH {ch.toUpperCase()} · {bb.channels[ch]}
            </b>
          </p>
          <ol className="fp-tape">
            {rows.map((r, i) => (
              <li key={`${ch}${i}`} className="fp-tape-row" data-kind={r.kind} data-state={i < printed ? (i === printed - 1 && !ended ? 'current' : 'on') : 'wait'}>
                <span className="num font-mono text-xs text-secondary">{bb.time(r.day, r.hhmm)}</span>
                <span className="grid min-w-0 gap-0.5">
                  <span className="eyebrow">{words[i][0]}</span>
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className={cn(r.kind === 'say' && 'italic')}>{words[i][1]}</span>
                    {r.amount !== 0 && (
                      <span className="num font-semibold whitespace-nowrap">
                        {r.amount < 0 ? '−' : '+'}
                        {t.vnd(Math.abs(r.amount))}
                      </span>
                    )}
                    {r.kind === 'fail' && <span className="fp-tape-badge bg-shortage text-on-error">{bb.rejected}</span>}
                    {r.kind === 'ok' && <span className="fp-tape-badge bg-ok text-on-success">{bb.sent}</span>}
                  </span>
                </span>
                <span className={cn('num text-right font-mono text-sm font-bold whitespace-nowrap', r.balance !== null && r.balance < 0 && 'text-shortage')}>
                  {r.kind === 'fail' ? bb.short(-(r.balance ?? 0)) : r.balance !== null ? bb.balance(r.balance) : ''}
                </span>
              </li>
            ))}
          </ol>
          <p className={cn('min-h-28 px-4 pt-3 font-mono text-xs tracking-[0.2em] text-secondary uppercase transition-opacity sm:px-5', ended ? 'opacity-100' : 'opacity-0')}>
            {bb.endOfTape}
          </p>
          <div aria-hidden="true" className={cn('fp-stamp', ch === 'b' && 'fp-stamp-ok', ended && 'fp-stamp-on')}>
            <b>{end.stamp}</b>
            <small>{end.sub}</small>
          </div>
        </Card>
        <p aria-live="polite" className="min-h-[4.5rem] text-lg">
          {ended && (
            <>
              <b className="mr-2 font-display">{end.label}</b>
              {end.text}
            </>
          )}
        </p>
      </div>
    </div>
  )
}

