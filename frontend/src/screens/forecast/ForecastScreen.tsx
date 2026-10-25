import { ArrowRight, LineChart } from 'lucide-react'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { useShop } from '@/app/use-shop'
import { BalanceChart } from '@/components/charts/BalanceChart'
import { EmptyState, PageHeader, Panel, Skeleton } from '@/components/page'
import { StatGrid, StatTile } from '@/components/readout'
import { formatDate, formatDayMonth, formatWeekday } from '@/lib/date'
import { explainShortage } from '@/lib/explain'
import { formatVnd, isNegative } from '@/lib/money'
import { CashTrail } from './CashTrail'
import { DayTable } from './DayTable'
import { ErrorAlert } from './ErrorAlert'
import { EventList } from './EventList'
import { INTRADAY_RISK_NOTE } from './copy'
import { Verdict } from './Verdict'

function LoadingState() {
  return (
    <div role="status" aria-label="Đang tính dự báo…" className="grid gap-4">
      <Skeleton className="h-56" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-16 sm:h-28" />
        <Skeleton className="h-16 sm:h-28" />
        <Skeleton className="h-16 sm:h-28" />
      </div>
      <Skeleton className="h-96" />
    </div>
  )
}

export function ForecastScreen() {
  const { data, forecast, forecastError, forecastLoading, retryForecast, today } = useShop()
  const heading = <PageHeader title="Dự báo & cảnh báo" />

  if (!data) return heading
  if (!data.balance)
    return (
      <div className="grid gap-6">
        {heading}
        <EmptyState
          icon={<LineChart />}
          title="Chưa có dữ liệu để dự báo"
          action={<Button variant="primary" href="#lich" label="Nhập số dư hôm nay" endContent={<Icon icon={ArrowRight} />} />}
        />
      </div>
    )

  if (forecastError && !forecast) {
    return (
      <div className="grid gap-6">
        {heading}
        <ErrorAlert error={forecastError} onRetry={retryForecast} />
      </div>
    )
  }

  if (!forecast) {
    return (
      <div className="grid gap-6">
        {heading}
        <LoadingState />
      </div>
    )
  }

  const { result, request } = forecast
  const story = explainShortage(result, request.events, today)
  const last = result.days[result.days.length - 1]
  const riskDays = result.days.filter((d) => d.hasIntradayTimingRisk)
  const shortDays = result.days.filter((d) => isNegative(d.closing)).length
  // Only a real schedule line can be split (not an actual payment already made).
  const candidate = story ? (story.lead ?? story.triggers[0] ?? null) : null
  const splitTarget = candidate && data.obligations.some((o) => o.id === candidate.id) ? candidate : null

  return (
    <div className="grid gap-5">
      {heading}

      <section aria-labelledby="verdict" aria-busy={forecastLoading} className="grid gap-4">
        <Verdict result={result} story={story} today={today} splitTarget={splitTarget} updating={forecastLoading} />

        {(result.unresolvedEvents.length > 0 || riskDays.length > 0) && (
          <div className="grid gap-3 lg:grid-cols-2 [&>:only-child]:col-span-full">
            {result.unresolvedEvents.length > 0 && (
              <Banner
                status="error"
                collapsible={false}
                title={`${result.unresolvedEvents.length} khoản quá hạn chưa được tính`}
                description={
                  <>
                    Chọn ngày mới, ghi đã xong hoặc hủy ở{' '}
                    <a href="#lich" className="font-semibold underline underline-offset-4">
                      Lịch thu–chi
                    </a>
                    .
                  </>
                }
              >
                <ul className="grid gap-1 text-sm">
                  {result.unresolvedEvents.map((e) => (
                    <li key={e.id} className="flex flex-wrap justify-between gap-x-3">
                      <span className="break-words">{e.label}</span>
                      <span className="num whitespace-nowrap">
                        {e.direction === 'In' ? '+' : '−'}
                        {formatVnd(e.amount)} · {formatDayMonth(e.date)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Banner>
            )}
            {riskDays.length > 0 && (
              <Banner status="warning" collapsible={false} title={`${riskDays.length} ngày vừa thu vừa chi`} description={`${INTRADAY_RISK_NOTE}.`}>
                <p className="num text-sm font-medium">{riskDays.map((d) => `${formatWeekday(d.date)} ${formatDayMonth(d.date)}`).join(' · ')}</p>
              </Banner>
            )}
          </div>
        )}

        <StatGrid className={story ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}>
          <StatTile
            label={story ? 'Thiếu nhiều nhất' : 'Số dư thấp nhất'}
            value={formatVnd(story ? result.maxShortage : result.lowestBalance)}
            negative={isNegative(result.lowestBalance)}
            sub={`${formatWeekday(result.lowestBalanceDate)} ${formatDayMonth(result.lowestBalanceDate)}`}
          />
          {story && <StatTile label="Số ngày thiếu tiền" value={`${shortDays} ngày`} negative />}
          <StatTile label="Cuối kỳ" value={formatVnd(last.closing)} negative={isNegative(last.closing)} sub={`Cuối ngày ${formatDayMonth(last.date)}`} />
        </StatGrid>

        <Panel title="Số dư cuối ngày" titleId="chart-title">
          <BalanceChart result={result} events={request.events} today={today} />
        </Panel>
      </section>

      {forecastError && <ErrorAlert error={forecastError} onRetry={retryForecast} />}

      <Panel title={story ? 'Tiền đi đâu trước ngày thiếu' : 'Tiền đi đâu tới ngày thấp nhất'} titleId="trail-title" flush>
        <div className="border-t">
          <CashTrail result={result} events={request.events} />
        </div>
      </Panel>

      {result.eventsAfterHorizon.length > 0 && (
        <Banner status="info" collapsible={false} title={`${result.eventsAfterHorizon.length} khoản sau ${formatDate(last.date)} chưa được tính`}>
          <div className="text-sm">
            <EventList events={result.eventsAfterHorizon} />
          </div>
        </Banner>
      )}

      <DayTable result={result} events={request.events} today={today} />
    </div>
  )
}
