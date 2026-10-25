import { useEffect, useRef, useState } from 'react'
import { CircleCheck, TriangleAlert } from 'lucide-react'
import { Card } from '@astryxdesign/core/Card'
import { Slider } from '@astryxdesign/core/Slider'
import { BalanceChart } from '@/components/charts/BalanceChart'
import { StatGrid, StatTile } from '@/components/readout'
import type { IsoDate } from '@/lib/types'
import { cn } from '@/lib/utils'
import { HORIZON, RESTOCK_MAX, VERDICT, dayLabel, fmtM, fmtVnd, shortDate, toForecast, verdictSentence } from './model'
import type { Flight } from './model'
import { sound } from './sound'

export interface Scenario {
  restock: number
  split: boolean
}

function inDays(n: number): string {
  return n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`
}


/**
 * The English verdict panel of the landing page: the app's verdict look (coral when the line goes below zero, lime
 * when it does not, a badge and one sentence) for the example shop.
 */
export function LandingVerdict({ flight, today }: { flight: Flight; today: IsoDate }) {
  const { alarm, rest } = verdictSentence(flight, today)
  return (
    <div className={cn('verdict grid gap-3 p-4 sm:p-5', flight.short ? 'bg-hero-short' : 'bg-hero-ok')}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <span
          className={cn(
            'num inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-sm font-bold',
            flight.short ? 'bg-shortage text-on-error' : 'bg-ok text-on-success',
          )}
        >
          {flight.short ? <TriangleAlert aria-hidden="true" className="size-4" /> : <CircleCheck aria-hidden="true" className="size-4" />}
          {flight.short ? `${VERDICT.short} · ${inDays(flight.firstShort)}` : `${VERDICT.clear} · ${HORIZON}/${HORIZON} days`}
        </span>
        <p className="num text-xs font-medium">
          {shortDate(today, 0)} → {shortDate(today, HORIZON - 1)}
        </p>
      </div>
      <p className="verdict-text">
        {alarm && <mark className="verdict-mark">{alarm}</mark>}
        {rest}
      </p>
    </div>
  )
}

const MARKS = [0, 50, 100, 150].map((m) => ({ value: m * 1e6, label: m === 0 ? '₫0' : `₫${m}M` }))

/**
 * "Flight plan · try it": the example shop's next 56 days. The restock slider and the pay-supplier toggle redraw the
 * chart, the verdict and the lowest point at once; a short summary follows for screen readers once the visitor
 * settles.
 */
export function FlightPlan({ flight, today, onChange, className }: { flight: Flight; today: IsoDate; onChange: (s: Scenario) => void; className?: string }) {
  const { result, events } = toForecast(flight, today)
  const lastTick = useRef(Math.round(flight.restock / 10e6))
  const [summary, setSummary] = useState('')
  const sentence = verdictSentence(flight, today)
  const spoken = `${flight.short ? VERDICT.short : VERDICT.clear}. ${sentence.alarm}${sentence.rest}`
  useEffect(() => {
    const t = setTimeout(() => setSummary(spoken), 400)
    return () => clearTimeout(t)
  }, [spoken])

  function setRestock(v: number) {
    const m = Math.round(v / 10e6)
    if (m !== lastTick.current) {
      lastTick.current = m
      sound.tick()
    }
    onChange({ restock: v, split: flight.split })
  }

  return (
    <Card padding={0} elevation="high" className={cn('min-w-0 overflow-hidden', className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b-2 border-[var(--color-border-emphasized)] px-4 py-3 sm:px-5">
        <p className="grid gap-0.5">
          <span className="eyebrow">Flight plan · try it</span>
          <strong className="font-display text-lg leading-tight">
            <span lang="vi">Tiệm Gốm Mây</span> · handmade ceramics
          </strong>
        </p>
        <span className="fp-tag">Fictional demo shop</span>
      </div>

      <div className="grid gap-4 p-3 sm:p-4">
        <LandingVerdict flight={flight} today={today} />

        <div className="fp-hero-chart px-1" aria-hidden="true">
          <BalanceChart result={result} events={events} interactive={false} height={156} shortLabel={flight.short ? `SHORT FROM ${shortDate(today, flight.firstShort).toUpperCase()}` : undefined} />
          <p className="num mt-1 flex justify-between text-xs text-secondary">
            <span>Today</span>
            <span>{shortDate(today, 28)}</span>
            <span>{shortDate(today, HORIZON - 1)}</span>
          </p>
        </div>

        <div className="grid gap-6 px-1">
          <div className="grid gap-1 pb-3">
            <p className="grid items-baseline gap-x-3 sm:flex sm:justify-between" aria-hidden="true">
              <span className="text-[length:var(--text-label-size)] font-medium text-secondary">Restock order, paid today</span>
              <span className="figure num text-2xl">{fmtVnd(flight.restock)}</span>
            </p>
            <Slider
              label="Restock order, paid today"
              isLabelHidden
              value={flight.restock}
              min={0}
              max={RESTOCK_MAX}
              step={1_000_000}
              onChange={(v: number) => setRestock(v)}
              formatValue={(v) => `${fmtVnd(v)}, ${flight.split ? 'split 50/50' : 'paid upfront'}`}
              valueDisplay="none"
              marks={MARKS}
            />
          </div>
          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 text-[length:var(--text-label-size)] font-medium text-secondary">Pay supplier</legend>
            <div className="fp-toggle">
              {[
                { split: false, label: 'Upfront' },
                { split: true, label: '50/50 split' },
              ].map((o) => (
                <label key={o.label}>
                  <input type="radio" name="pay" value={o.label} checked={flight.split === o.split} onChange={() => onChange({ restock: flight.restock, split: o.split })} />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <StatGrid className="sm:grid-cols-3">
          <StatTile label="Lowest point" value={fmtM(flight.min)} negative={flight.min < 0} />
          <StatTile label="On" value={dayLabel(today, flight.minDay)} numeric={false} />
          <StatTile label="Verdict" value={flight.short ? VERDICT.short : VERDICT.clear} numeric={false} negative={flight.short} />
        </StatGrid>
        <p className="sr-only" aria-live="polite">
          {summary}
        </p>
      </div>
    </Card>
  )
}
