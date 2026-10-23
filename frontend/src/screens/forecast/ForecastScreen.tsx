import { ArrowRight, CalendarClock, CircleCheck, Info, LineChart, TriangleAlert } from 'lucide-react'
import { splitScenarioHref } from '@/app/routes'
import { useShop } from '@/app/use-shop'
import { EmptyState, PageHeader, Skeleton, Stat } from '@/components/page'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatDayMonth, formatWeekday } from '@/lib/date'
import { explainShortage, inDays, relativeDay } from '@/lib/explain'
import { formatMoneyWords, formatVnd, isNegative } from '@/lib/money'
import { BalanceChart } from './BalanceChart'
import { CashTrail } from './CashTrail'
import { DayTable } from './DayTable'
import { ErrorAlert } from './ErrorAlert'
import { EventList } from './EventList'
import { INTRADAY_RISK_NOTE } from './copy'

const STATS = ['Số dư thấp nhất', 'Ngày đầu thiếu tiền', 'Thiếu lớn nhất', 'Số dư ngày 56']

/** Before there is data: the shape of what will appear, and how to get there. */
function Empty() {
  return (
    <div className="grid gap-4">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((label) => (
          <Stat key={label} label={label} value={<span className="text-muted-foreground">—</span>} className="border-dashed shadow-none" />
        ))}
      </dl>
      <EmptyState
        icon={<LineChart />}
        title="Chưa có dữ liệu để dự báo"
        action={
          <a href="#lich" className={buttonVariants()}>
            Nhập số dư hôm nay <ArrowRight aria-hidden="true" />
          </a>
        }
      >
        Ở đây sẽ là một câu trả lời: có thiếu tiền không, ngày nào, bao nhiêu, vì khoản nào.
      </EmptyState>
    </div>
  )
}

function LoadingState() {
  return (
    <div role="status" aria-label="Đang tính dự báo…" className="grid gap-4">
      <Skeleton className="h-20 rounded-xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((s) => (
          <Skeleton key={s} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}

export function ForecastScreen() {
  const { data, forecast, forecastError, forecastLoading, retryForecast, today } = useShop()

  const heading = (
    <PageHeader
      title="Dự báo & cảnh báo"
      description="Số dư cuối mỗi ngày trong 56 ngày, tính bằng phép cộng trừ từ số dư đã chốt và các khoản còn lại. Không phải dự báo AI."
    />
  )

  if (!data) return heading
  if (!data.balance) return <div className="grid gap-6">{heading}<Empty /></div>

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
  const first = result.days[0].date
  const last = result.days[result.days.length - 1].date
  const end = result.days[result.days.length - 1].closing
  const riskDays = result.days.filter((d) => d.hasIntradayTimingRisk)
  // Only a real schedule line can be split (not an actual payment already made).
  const candidate = story ? (story.lead ?? story.triggers[0] ?? null) : null
  const splitTarget = candidate && data.obligations.some((o) => o.id === candidate.id) ? candidate : null

  return (
    <div className="grid gap-6">
      {heading}

      <section aria-labelledby="verdict" aria-busy={forecastLoading} className="grid gap-4">
        <Alert variant={story ? 'danger' : 'success'} className="px-4 py-4 sm:px-5">
          {story ? <TriangleAlert aria-hidden="true" className="size-5!" /> : <CircleCheck aria-hidden="true" className="size-5!" />}
          <p className="num text-xs text-muted-foreground">
            {formatDate(first)} → {formatDate(last)} · {result.days.length} ngày
            {forecastLoading && <span> · đang cập nhật…</span>}
          </p>
          <h2 id="verdict" className="text-base leading-relaxed font-medium text-foreground sm:text-lg">
            {story ? (
              story.segments.map((seg, i) =>
                seg.alarm ? (
                  <mark key={i} className="bg-transparent font-semibold text-shortage">
                    {seg.text}
                  </mark>
                ) : (
                  <span key={i}>{seg.text}</span>
                ),
              )
            ) : (
              <>
                Đủ tiền trong {result.days.length} ngày tới. Thấp nhất còn{' '}
                <span className="font-semibold text-ok">{formatMoneyWords(result.lowestBalance)}</span> {relativeDay(result.lowestBalanceDate, today)}.
              </>
            )}
          </h2>
          {story && (
            <div className="mt-2 flex flex-wrap gap-2">
              {splitTarget && (
                <a href={splitScenarioHref(splitTarget.id)} className={buttonVariants()}>
                  Thử chia đợt “{splitTarget.label}”
                  <ArrowRight aria-hidden="true" />
                </a>
              )}
              <a href="#kich-ban" className={buttonVariants({ variant: 'outline' })}>
                Phương án khác
              </a>
            </div>
          )}
        </Alert>

        {(result.unresolvedEvents.length > 0 || riskDays.length > 0) && (
          <div className="grid gap-3 lg:grid-cols-2">
            {result.unresolvedEvents.length > 0 && (
              <Alert variant="danger">
                <TriangleAlert aria-hidden="true" />
                <AlertTitle>{result.unresolvedEvents.length} khoản quá hạn chưa được tính</AlertTitle>
                <AlertDescription>
                  <p>
                    Ngày dự kiến đã qua ngày chốt mà chưa xong. Không tính, cũng không coi là đã trả.{' '}
                    <a href="#lich" className="font-medium text-primary underline underline-offset-4">
                      Đổi ngày ở Lịch thu–chi
                    </a>
                  </p>
                  <ul className="mt-2 grid gap-0.5 text-foreground">
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
                </AlertDescription>
              </Alert>
            )}
            {riskDays.length > 0 && (
              <Alert variant="warning">
                <CalendarClock aria-hidden="true" />
                <AlertTitle>{riskDays.length} ngày vừa thu vừa chi</AlertTitle>
                <AlertDescription>
                  <p>{INTRADAY_RISK_NOTE}: nếu chi trước khi tiền về, trong ngày vẫn có thể thiếu.</p>
                  <p className="num font-medium text-foreground">{riskDays.map((d) => `${formatWeekday(d.date)} ${formatDayMonth(d.date)}`).join(' · ')}</p>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Số dư thấp nhất"
            value={formatVnd(result.lowestBalance)}
            sub={`${formatWeekday(result.lowestBalanceDate)} ${formatDayMonth(result.lowestBalanceDate)}`}
            tone={isNegative(result.lowestBalance) ? 'danger' : undefined}
          />
          <Stat
            label="Ngày đầu thiếu tiền"
            value={result.firstShortageDate ? formatDayMonth(result.firstShortageDate) : 'Không có'}
            sub={result.firstShortageDate ? `${formatWeekday(result.firstShortageDate)} · ${inDays(result.firstShortageDate, today)}` : 'Số dư không xuống dưới 0'}
            tone={result.firstShortageDate ? 'danger' : undefined}
          />
          <Stat
            label="Thiếu lớn nhất"
            value={formatVnd(result.maxShortage)}
            sub={story ? 'Mức âm sâu nhất trong kỳ' : 'Không ngày nào âm'}
            tone={story ? 'danger' : undefined}
          />
          <Stat label="Cuối kỳ" value={formatVnd(end)} sub={`Cuối ngày ${formatDayMonth(last)}`} tone={isNegative(end) ? 'danger' : undefined} />
        </dl>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Số dư cuối ngày</CardTitle>
              <CardDescription>Di chuột hoặc chạm vào đường để xem từng ngày.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-3 sm:pt-4">
            <BalanceChart result={result} events={request.events} />
          </CardContent>
        </Card>
      </section>

      {forecastError && <ErrorAlert error={forecastError} onRetry={retryForecast} />}

      <Card className="overflow-hidden">
        <section aria-labelledby="trail-title">
          <CardHeader className="pb-4 sm:pb-4">
            <div>
              <CardTitle id="trail-title">{story ? 'Tiền đi đâu trước ngày thiếu' : 'Tiền đi đâu tới ngày thấp nhất'}</CardTitle>
              <CardDescription>
                Từng khoản từ đầu kỳ tới ngày số dư thấp nhất ({formatDate(result.lowestBalanceDate)}), kèm số dư sau mỗi khoản.
              </CardDescription>
            </div>
          </CardHeader>
          <div className="border-t">
            <CashTrail result={result} events={request.events} />
          </div>
        </section>
      </Card>

      {result.eventsAfterHorizon.length > 0 && (
        <Alert>
          <Info aria-hidden="true" />
          <AlertTitle>
            {result.eventsAfterHorizon.length} khoản sau {formatDate(last)}, ngoài 56 ngày nên chưa tính
          </AlertTitle>
          <AlertDescription>
            <EventList events={result.eventsAfterHorizon} />
          </AlertDescription>
        </Alert>
      )}

      <DayTable result={result} events={request.events} />
    </div>
  )
}
