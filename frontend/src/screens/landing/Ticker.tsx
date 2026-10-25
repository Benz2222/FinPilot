import { Fragment, useState } from 'react'
import type { IsoDate } from '@/lib/types'
import { HORIZON, OPENING, PAYROLL, RENT, VERDICT, fmtM } from './model'
import type { Flight } from './model'

/**
 * The forecast as a weather report (METAR) running along an ink strip, rewritten as the hero changes. Two copies
 * scroll as one loop; the second is hidden from assistive tech, and with reduced motion the strip stands still.
 */
export function Ticker({ flight, today }: { flight: Flight; today: IsoDate }) {
  const [hour] = useState(() => new Date().getHours())
  const stamp = `${today.slice(8, 10)}${String(hour).padStart(2, '0')}00L`
  const items: [string | null, string, string?][] = [
    ['CASH', fmtM(OPENING)],
    ['RESTOCK', `${fmtM(flight.restock)} ${flight.split ? 'SPLIT 50/50' : 'UPFRONT'}`],
    ['PAYROLL', `D+12 ${fmtM(PAYROLL)}`],
    ['RENT', `D+19 ${fmtM(RENT)}`],
    ['LOW', `${fmtM(flight.min)} D+${flight.minDay}`],
    ['VIS', `${HORIZON}D`],
    [null, (flight.short ? VERDICT.short : VERDICT.clear).toUpperCase(), flight.short ? 'fp-ticker-bad' : 'fp-ticker-ok'],
    [null, 'FICTIONAL DEMO SHOP'],
  ]
  const line = (
    <>
      <b className="text-[var(--fp-brand)]">METAR FNPL</b> {stamp}
      {items.map(([k, v, cls], i) => (
        <Fragment key={i}>
          <span className="fp-ticker-sep" aria-hidden="true" />
          {k && <span className="text-[var(--fp-brand)]">{k} </span>}
          <span className={cls}>{v}</span>
        </Fragment>
      ))}
      <span className="fp-ticker-sep" aria-hidden="true" />
    </>
  )
  return (
    <section aria-label="Forecast summary ticker" className="fp-ink fp-ticker border-y-2 border-[var(--color-border-emphasized)]">
      <div className="fp-ticker-track">
        <p>{line}</p>
        <p aria-hidden="true">{line}</p>
      </div>
    </section>
  )
}
