import { useEffect, useRef, useState } from 'react'
import { Play } from 'lucide-react'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Icon } from '@astryxdesign/core/Icon'
import { cn } from '@/lib/utils'
import { fmtM } from './model'
import { useInView, useReducedMotion } from './motion'
import { sound } from './sound'

/*
 * The case file: one month of a fictional pottery shop, played back from its "cash flight recorder" on two channels:
 * as it happened (payroll bounces) and with FinPilot (one split payment and payroll clears).
 */

const OPEN = 96_400_000
type Kind = 'open' | 'say' | 'fp' | 'in' | 'out' | 'fail' | 'ok'
/** time, day of the month (from 0), source, text, amount, kind (default: in/out by sign) */
type Line = [string, number, string, string, number, Kind?]
type Channel = 'a' | 'b'

const TAPES: Record<Channel, Line[]> = {
  a: [
    ['01 SEP 08:00', 0, 'Ledger', 'Opening balance', 0, 'open'],
    ['02 SEP 09:12', 1, 'Supplier', '“Pay the full ₫72M today and we take 2% off.”', 0, 'say'],
    ['02 SEP 09:14', 1, 'Owner', '“Deal. Send all of it.”', 0, 'say'],
    ['02 SEP 09:14', 1, 'Bank', 'Restock order, paid in full', -72e6],
    ['05 SEP 06:30', 4, 'Shopee', 'Marketplace payout', 16.5e6],
    ['09 SEP 10:00', 8, 'Ads', 'Ads & shipping', -7.5e6],
    ['15 SEP 08:00', 14, 'Landlord', 'Workshop rent', -28e6],
    ['19 SEP 06:30', 18, 'Shopee', 'Marketplace payout', 17.9e6],
    ['22 SEP 16:20', 21, 'COD', 'Cash on delivery, new glaze line', 12.4e6],
    ['26 SEP 17:00', 25, 'Owner', '“Run payroll.”', 0, 'say'],
    ['26 SEP 17:00', 25, 'Bank', 'Payroll for 9 staff', -48.5e6, 'fail'],
    ['27 SEP 09:30', 26, 'Owner', '“Borrow ₫15M at 4% a month. Pay everyone tomorrow.”', 0, 'say'],
  ],
  b: [
    ['01 SEP 08:00', 0, 'Ledger', 'Opening balance', 0, 'open'],
    ['02 SEP 09:12', 1, 'Supplier', '“Pay the full ₫72M today and we take 2% off.”', 0, 'say'],
    ['02 SEP 09:13', 1, 'FinPilot', 'Plotted paid in full: payroll on 26 Sep comes up ₫12.8M short.', 0, 'fp'],
    ['02 SEP 09:13', 1, 'FinPilot', 'Plotted 36 + 36, second half on 3 Oct: payroll clears, lowest point ₫6.8M.', 0, 'fp'],
    ['02 SEP 09:16', 1, 'Owner', '“Half now, half on the 3rd. We can live without the 2%.”', 0, 'say'],
    ['02 SEP 09:16', 1, 'Bank', 'Restock order, first half', -36e6],
    ['05 SEP 06:30', 4, 'Shopee', 'Marketplace payout', 16.5e6],
    ['09 SEP 10:00', 8, 'Ads', 'Ads & shipping', -7.5e6],
    ['15 SEP 08:00', 14, 'Landlord', 'Workshop rent', -28e6],
    ['19 SEP 06:30', 18, 'Shopee', 'Marketplace payout', 17.9e6],
    ['22 SEP 16:20', 21, 'COD', 'Cash on delivery, new glaze line', 12.4e6],
    ['26 SEP 17:00', 25, 'Bank', 'Payroll for 9 staff', -48.5e6, 'ok'],
    ['30 SEP 06:30', 29, 'Shopee', 'Marketplace payout', 19.6e6],
    ['03 OCT 09:00', 32, 'Bank', 'Restock order, second half', -36e6],
  ],
}
const END: Record<Channel, { stamp: string; sub: string; label: string; text: string }> = {
  a: {
    stamp: 'Payroll bounced',
    sub: 'Probable cause found',
    label: 'Probable cause',
    text: 'The whole ₫72M left 24 days before payroll, and nothing showed what the rest of the month looked like. Now play channel B.',
  },
  b: {
    stamp: 'Payroll cleared',
    sub: 'No loan · nobody paid late',
    label: 'Outcome',
    text: 'Same month, same sales. FinPilot saw the gap 24 days early, and one split payment kept every salary on time.',
  },
}
const CHANNEL_NAME: Record<Channel, string> = { a: 'As it happened', b: 'With FinPilot' }

interface TapeRow {
  line: Line
  kind: Kind
  /** Balance after this line, or null for words. A rejected payment shows what it would have left. */
  balance: number | null
}

function rowsOf(ch: Channel): TapeRow[] {
  let balance = OPEN
  return TAPES[ch].map((line) => {
    const kind = line[5] ?? (line[4] < 0 ? 'out' : 'in')
    const after = balance + line[4]
    const money = line[4] !== 0 || kind === 'open'
    if (kind !== 'fail') balance = after
    return { line, kind, balance: money ? after : null }
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
  const end = END[ch]

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-10">
      <div className="grid gap-4" data-reveal="" data-d="1">
        <div className={cn('fp-recorder', failed && !reduce && 'fp-recorder-hit')} key={failed ? 'hit' : 'calm'}>
          <span className="fp-hazard" aria-hidden="true" />
          <p className="flex items-baseline justify-between gap-3 font-display text-xl font-extrabold tracking-tight">
            Cash flight recorder
            <small className="grid text-right font-mono text-[0.625rem] font-bold tracking-[0.14em] uppercase">
              <span>Do not open</span>
              <span lang="vi">Không được mở</span>
            </small>
          </p>
          <div className={cn('fp-lcd', figure < 0 && 'fp-lcd-bad', failed && 'fp-lcd-alarm')} aria-hidden="true">
            <p className="flex justify-between">
              <b>{current?.line[0] ?? TAPES[ch][0][0]}</b>
              <span>CH {ch.toUpperCase()}</span>
            </p>
            <p className="flex items-end gap-2">
              <SevenSegment value={figure} />
              <span className="pb-1 font-bold">₫M</span>
            </p>
            <p className="flex justify-between">
              <span>{current?.line[2] ?? 'Ledger'}</span>
              <b>Day {(current?.line[1] ?? 0) + 1}</b>
            </p>
          </div>
          <span className="fp-hazard" aria-hidden="true" />
          <p className="flex justify-between gap-3 font-mono text-[0.6875rem] font-bold tracking-[0.12em] uppercase">
            <span>S/N FP-26-029</span>
            <span lang="vi">Tiệm Gốm Mây · fictional</span>
          </p>
        </div>
        <div role="group" aria-label="Playback channel" className="grid grid-cols-2 gap-2">
          {(['a', 'b'] as const).map((k) => (
            <button key={k} type="button" aria-pressed={ch === k} onClick={() => play(k)} className="fp-channel">
              <span className="font-mono text-xs font-bold tracking-[0.14em]">CH {k.toUpperCase()}</span>
              <b>{CHANNEL_NAME[k]}</b>
            </button>
          ))}
        </div>
        <Button variant="secondary" label="Replay the tape" icon={<Icon icon={Play} />} onClick={() => play(ch)} />
      </div>

      <div ref={tapeRef} className="grid gap-4" data-reveal="" data-d="2">
        <Card padding={0} elevation="high" className="relative overflow-hidden text-[var(--color-text-primary)]">
          <p className="flex flex-wrap justify-between gap-x-3 gap-y-1 border-b-2 border-dashed border-[var(--color-border-emphasized)] px-4 py-3 font-mono text-xs font-bold tracking-[0.1em] uppercase sm:px-5">
            <span>Cockpit voice + ledger transcript</span>
            <b>
              CH {ch.toUpperCase()} · {CHANNEL_NAME[ch]}
            </b>
          </p>
          <ol className="fp-tape">
            {rows.map((r, i) => (
              <li key={`${ch}${i}`} className="fp-tape-row" data-kind={r.kind} data-state={i < printed ? (i === printed - 1 && !ended ? 'current' : 'on') : 'wait'}>
                <span className="num font-mono text-xs text-secondary">{r.line[0]}</span>
                <span className="grid min-w-0 gap-0.5">
                  <span className="eyebrow">{r.line[2]}</span>
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className={cn(r.kind === 'say' && 'italic')}>{r.line[3]}</span>
                    {r.line[4] !== 0 && (
                      <span className="num font-semibold whitespace-nowrap">
                        {r.line[4] < 0 ? '−' : '+'}₫{new Intl.NumberFormat('en-US').format(Math.abs(r.line[4]))}
                      </span>
                    )}
                    {r.kind === 'fail' && <span className="fp-tape-badge bg-shortage text-on-error">Rejected</span>}
                    {r.kind === 'ok' && <span className="fp-tape-badge bg-ok text-on-success">Sent</span>}
                  </span>
                </span>
                <span className={cn('num text-right font-mono text-sm font-bold whitespace-nowrap', r.balance !== null && r.balance < 0 && 'text-shortage')}>
                  {r.kind === 'fail' ? `Short ${fmtM(-(r.balance ?? 0))}` : r.balance !== null ? fmtM(r.balance) : ''}
                </span>
              </li>
            ))}
          </ol>
          <p className={cn('min-h-28 px-4 pt-3 font-mono text-xs tracking-[0.2em] text-secondary uppercase transition-opacity sm:px-5', ended ? 'opacity-100' : 'opacity-0')}>
            End of tape
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

