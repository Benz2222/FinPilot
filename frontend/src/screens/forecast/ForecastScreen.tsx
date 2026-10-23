import { ArrowRight, CalendarClock, Info, LineChart, TriangleAlert } from 'lucide-react'
import { splitScenarioHref } from '@/app/routes'
import { useShop } from '@/app/use-shop'
import { EmptyState, PageHeader, Skeleton } from '@/components/page'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatDayMonth, formatWeekday } from '@/lib/date'
import { explainShortage, inDays, relativeDay } from '@/lib/explain'
import { formatMoneyWords, formatVnd, isNegative, subtractMoney, toPlotNumber } from '@/lib/money'
import { cn } from '@/lib/utils'
import { BalanceChart } from './BalanceChart'
import { CashTrail } from './CashTrail'
import { DayTable } from './DayTable'
import { ErrorAlert } from './ErrorAlert'
import { EventList } from './EventList'
import { Led, Readout, ReadoutPanel } from '@/components/readout'
import { DayStrip, DeltaGauge, DepthTrace, ScaleGauge } from './Instruments'
import { INTRADAY_RISK_NOTE } from './copy'

const STATS = ['Số dư thấp nhất', 'Ngày đầu thiếu tiền', 'Thiếu lớn nhất', 'Số dư ngày 56']

/** Before there is data: the shape of what will appear, and how to get there. */
function Empty() {
  return (
    <div className="grid gap-4">
      <ReadoutPanel className="grid-cols-2 lg:grid-cols-4">
        {STATS.map((label) => (
          <Readout key={label} label={label} signal="idle" value={<span className="text-muted-foreground">—</span>} sub="Chưa có số liệu" />
        ))}
      </ReadoutPanel>
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
      <Skeleton className="h-24 rounded-lg" />
      <div className="grid grid-cols-2 gap-px lg:grid-cols-4">
        {STATS.map((s) => (
          <Skeleton key={s} className="h-32 rounded-none" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-lg" />
    </div>
  )
}

export function ForecastScreen() {
  const { data, forecast, forecastError, forecastLoading, retryForecast, today } = useShop()

  const heading = (
    <PageHeader
      eyebrow="Buồng lái dòng tiền · 56 ngày"
      title="Dự báo & cảnh báo"
      description="Số dư cuối mỗi ngày trong 56 ngày, tính bằng phép cộng trừ từ số dư hiện có và các khoản còn lại. Không phải dự báo AI."
    />
  )

  if (!data) return heading
  if (!data.balance)
    return (
      <div className="grid gap-6">
        {heading}
        <Empty />
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
  const first = result.days[0].date
  const last = result.days[result.days.length - 1].date
  const opening = result.days[0].opening
  const end = result.days[result.days.length - 1].closing
  const riskDays = result.days.filter((d) => d.hasIntradayTimingRisk)
  const shortDays = result.days.filter((d) => isNegative(d.closing)).length
  const closings = result.days.map((d) => toPlotNumber(d.closing))
  const delta = subtractMoney(end, opening)
  const deltaScale = Math.max(Math.abs(toPlotNumber(opening)), Math.abs(toPlotNumber(end)), 1)
  // Only a real schedule line can be split (not an actual payment already made).
  const candidate = story ? (story.lead ?? story.triggers[0] ?? null) : null
  const splitTarget = candidate && data.obligations.some((o) => o.id === candidate.id) ? candidate : null

  return (
    <div className="grid gap-5">
      {heading}

      <section aria-labelledby="verdict" aria-busy={forecastLoading} className="grid gap-4">
        {/* Master warning: the verdict as an annunciator, the lamp on the left, the plain-language story beside it. */}
        <div
          className={cn(
            'grid overflow-hidden rounded-lg border bg-card sm:grid-cols-[12rem_minmax(0,1fr)]',
            story ? 'border-shortage-line' : 'border-ok-line',
          )}
        >
          <div className="flex items-center gap-3 border-b bg-glass p-4 sm:flex-col sm:items-stretch sm:justify-center sm:border-r sm:border-b-0 sm:p-5">
            <div
              className={cn(
                'grid shrink-0 justify-items-center gap-1 rounded-md border px-3 py-2.5 text-center sm:gap-1.5 sm:py-5',
                story
                  ? 'border-shortage bg-shortage-soft text-shortage motion-safe:animate-[lamp_2.4s_ease-in-out_infinite]'
                  : 'border-ok-line bg-ok-soft text-ok',
              )}
            >
              {story ? <TriangleAlert aria-hidden="true" className="size-4 sm:size-5" /> : <Led signal="ok" className="size-2 sm:size-2.5" />}
              <span className="placard text-[0.8125rem] font-semibold sm:text-sm">{story ? 'Thiếu tiền' : 'Đủ tiền'}</span>
              <span className="num text-xs">{result.firstShortageDate ? inDays(result.firstShortageDate, today) : `${result.days.length}/${result.days.length} ngày`}</span>
            </div>
            <p className="num placard min-w-0 text-muted-foreground sm:hidden">
              {formatDate(first)} → {formatDate(last)}
              <span className="mt-1 block">
                {result.days.length} ngày{forecastLoading && <span className="text-primary"> · đang cập nhật…</span>}
              </span>
            </p>
          </div>

          <div className="grid content-center gap-3 p-4 sm:p-6">
            <p className="num placard hidden text-muted-foreground sm:block">
              {formatDate(first)} → {formatDate(last)} · {result.days.length} ngày
              {forecastLoading && <span className="text-primary"> · đang cập nhật…</span>}
            </p>
            <h2 id="verdict" className="text-[1.0625rem] leading-relaxed font-medium text-foreground sm:text-xl sm:leading-relaxed">
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
                  <span className="font-semibold whitespace-nowrap text-ok">{formatMoneyWords(result.lowestBalance)}</span> {relativeDay(result.lowestBalanceDate, today)}.
                </>
              )}
            </h2>
            {story && (
              <div className="flex flex-wrap gap-2">
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
          </div>
        </div>

        {(result.unresolvedEvents.length > 0 || riskDays.length > 0) && (
          <div className="grid gap-3 lg:grid-cols-2">
            {result.unresolvedEvents.length > 0 && (
              <Alert variant="danger">
                <TriangleAlert aria-hidden="true" />
                <AlertTitle>{result.unresolvedEvents.length} khoản quá hạn chưa được tính</AlertTitle>
                <AlertDescription>
                  <p>
                    Ngày hẹn đã qua ngày tính số dư hiện có mà chưa xong. Không tính, cũng không coi là đã trả.{' '}
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

        {/* Instrument cluster: four readouts in one panel, hairlines between them. */}
        <ReadoutPanel className="grid-cols-2 lg:grid-cols-4">
          <Readout
            label="Số dư thấp nhất"
            value={formatVnd(result.lowestBalance)}
            sub={`${formatWeekday(result.lowestBalanceDate)} ${formatDayMonth(result.lowestBalanceDate)}`}
            signal={isNegative(result.lowestBalance) ? 'shortage' : 'ok'}
            gauge={<ScaleGauge min={Math.min(...closings)} max={Math.max(...closings)} value={toPlotNumber(result.lowestBalance)} />}
          />
          <Readout
            label="Ngày đầu thiếu tiền"
            value={result.firstShortageDate ? formatDayMonth(result.firstShortageDate) : 'Không có'}
            numeric={Boolean(result.firstShortageDate)}
            sub={result.firstShortageDate ? `${formatWeekday(result.firstShortageDate)} · ${inDays(result.firstShortageDate, today)}` : 'Số dư không xuống dưới 0'}
            signal={result.firstShortageDate ? 'shortage' : 'ok'}
            gauge={<DayStrip days={result.days} />}
          />
          <Readout
            label="Thiếu lớn nhất"
            value={formatVnd(result.maxShortage)}
            sub={story ? `Mức âm sâu nhất trong kỳ · ${shortDays} ngày dưới 0` : 'Không ngày nào âm'}
            signal={story ? 'shortage' : 'ok'}
            gauge={<DepthTrace days={result.days} deepest={result.maxShortage} />}
          />
          <Readout
            label="Cuối kỳ"
            value={formatVnd(end)}
            sub={`Cuối ngày ${formatDayMonth(last)} · ${isNegative(delta) ? '' : '+'}${formatMoneyWords(delta)} so với đầu kỳ`}
            signal={isNegative(end) ? 'shortage' : 'ok'}
            gauge={<DeltaGauge ratio={toPlotNumber(delta) / deltaScale} />}
          />
        </ReadoutPanel>

        <Card className="overflow-hidden">
          <CardHeader className="pb-0 sm:pb-0">
            <div>
              <CardTitle>Số dư cuối ngày</CardTitle>
              <CardDescription>Di chuột hoặc chạm vào đường để xem từng ngày.</CardDescription>
            </div>
          </CardHeader>
          <div className="px-2 pt-4 pb-3 sm:px-4 sm:pb-4">
            <BalanceChart result={result} events={request.events} />
          </div>
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
