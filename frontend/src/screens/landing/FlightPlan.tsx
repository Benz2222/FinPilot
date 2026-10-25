import { useEffect, useRef, useState } from 'react'
import { CircleCheck, TriangleAlert } from 'lucide-react'
import { Card } from '@astryxdesign/core/Card'
import { Slider } from '@astryxdesign/core/Slider'
import { BalanceChart } from '@/components/charts/BalanceChart'
import { StatGrid, StatTile } from '@/components/readout'
import type { IsoDate } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useCopy } from './copy'
import { HORIZON, RESTOCK_MAX, toForecast } from './model'
import type { Flight } from './model'
import { sound } from './sound'

export interface Scenario {
  restock: number
  split: boolean
}

/**
 * The verdict panel of the landing page: the app's verdict look (coral when the line goes below zero, lime when it
 * does not, a badge and one sentence) for the example shop.
 */
export function LandingVerdict({ flight, today }: { flight: Flight; today: IsoDate }) {
  const t = useCopy()
  const { alarm, rest } = t.sentence(flight, today)
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
          {flight.short ? `${t.verdict.short} · ${t.inDays(flight.firstShort)}` : `${t.verdict.clear} · ${HORIZON}/${HORIZON} ${t.plan.days}`}
        </span>
        <p className="num text-xs font-medium">
          {t.date(today, 0)} → {t.date(today, HORIZON - 1)}
        </p>
      </div>
      <p className="verdict-text">
        {alarm && <mark className="verdict-mark">{alarm}</mark>}
        {rest}
      </p>
    </div>
  )
}


/**
 * "Flight plan · try it": the example shop's next 56 days. The restock slider and the pay-supplier toggle redraw the
 * chart, the verdict and the lowest point at once; a short summary follows for screen readers once the visitor
 * settles.
 */
export function FlightPlan({ flight, today, onChange, className }: { flight: Flight; today: IsoDate; onChange: (s: Scenario) => void; className?: string }) {
  const t = useCopy()
  const { result, events } = toForecast(flight, today, t.names)
  const lastTick = useRef(Math.round(flight.restock / 10e6))
  const [summary, setSummary] = useState('')
  const sentence = t.sentence(flight, today)
  const verdict = flight.short ? t.verdict.short : t.verdict.clear
  const spoken = `${verdict}. ${sentence.alarm}${sentence.rest}`
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
          <span className="eyebrow">{t.plan.eyebrow}</span>
          <strong className="font-display text-lg leading-tight">
            <span lang="vi">Tiệm Gốm Mây</span> · {t.plan.shop}
          </strong>
        </p>
        <span className="fp-tag">{t.plan.tag}</span>
      </div>

      <div className="grid gap-4 p-3 sm:p-4">
        <LandingVerdict flight={flight} today={today} />

        <div className="fp-hero-chart px-1" aria-hidden="true">
          <BalanceChart result={result} events={events} interactive={false} height={156} shortLabel={flight.short ? t.plan.chartShort(today, flight.firstShort) : undefined} />
          <p className="num mt-1 flex justify-between text-xs text-secondary">
            <span>{t.plan.today}</span>
            <span>{t.date(today, 28)}</span>
            <span>{t.date(today, HORIZON - 1)}</span>
          </p>
        </div>

        <div className="grid gap-6 px-1">
          <div className="grid gap-1 pb-3">
            <p className="grid items-baseline gap-x-3 sm:flex sm:justify-between" aria-hidden="true">
              <span className="text-[length:var(--text-label-size)] font-medium text-secondary">{t.plan.restock}</span>
              <span className="figure num text-2xl">{t.vnd(flight.restock)}</span>
            </p>
            <Slider
              label={t.plan.restock}
              isLabelHidden
              value={flight.restock}
              min={0}
              max={RESTOCK_MAX}
              step={1_000_000}
              onChange={(v: number) => setRestock(v)}
              formatValue={(v) => `${t.vnd(v)}, ${t.plan.paid(flight.split)}`}
              valueDisplay="none"
              marks={[0, 50, 100, 150].map((n) => ({ value: n * 1e6, label: t.plan.mark(n) }))}
            />
          </div>
          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 text-[length:var(--text-label-size)] font-medium text-secondary">{t.plan.pay}</legend>
            <div className="fp-toggle">
              {[
                { split: false, label: t.plan.upfront },
                { split: true, label: t.plan.split },
              ].map((o) => (
                <label key={String(o.split)}>
                  <input type="radio" name="pay" value={o.split ? 'split' : 'upfront'} checked={flight.split === o.split} onChange={() => onChange({ restock: flight.restock, split: o.split })} />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <StatGrid className="sm:grid-cols-3">
          <StatTile label={t.plan.lowest} value={t.m(flight.min)} negative={flight.min < 0} />
          <StatTile label={t.plan.on} value={t.dayName(today, flight.minDay)} numeric={false} />
          <StatTile label={t.plan.verdict} value={verdict} numeric={false} negative={flight.short} />
        </StatGrid>
        <p className="sr-only" aria-live="polite">
          {summary}
        </p>
      </div>
    </Card>
  )
}
