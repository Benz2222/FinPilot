import { Fragment, useState } from 'react'
import type { IsoDate } from '@/lib/types'
import { useCopy } from './copy'
import type { Flight } from './model'

/**
 * The forecast as a weather report (METAR) running along an ink strip, rewritten as the hero changes. Two copies
 * scroll as one loop; the second is hidden from assistive tech, and with reduced motion the strip stands still.
 */
export function Ticker({ flight, today }: { flight: Flight; today: IsoDate }) {
  const t = useCopy()
  const [hour] = useState(() => new Date().getHours())
  const tk = t.ticker(flight, today, hour)
  const items: [string | null, string, string?][] = [
    ...tk.items,
    [null, (flight.short ? t.verdict.short : t.verdict.clear).toUpperCase(), flight.short ? 'fp-ticker-bad' : 'fp-ticker-ok'],
    [null, tk.tail],
  ]
  const line = (
    <>
      <b className="text-[var(--fp-brand)]">{tk.head}</b> {tk.stamp}
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
    <section aria-label={tk.label} className="fp-ink fp-ticker border-y-2 border-[var(--color-border-emphasized)]">
      <div className="fp-ticker-track">
        <p>{line}</p>
        <p aria-hidden="true">{line}</p>
      </div>
    </section>
  )
}
