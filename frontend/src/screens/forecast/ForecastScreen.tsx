import { ArrowRight, CalendarClock, Info, LoaderCircle, TriangleAlert } from 'lucide-react'
import { splitScenarioHref } from '@/app/routes'
import { useShop } from '@/app/use-shop'
import { formatDate, formatDayMonth, formatWeekday } from '@/lib/date'
import { explainShortage, inDays, relativeDay } from '@/lib/explain'
import { formatMoneyWords, formatVnd, isNegative } from '@/lib/money'
import { BalanceChart } from './BalanceChart'
import { CashTrail } from './CashTrail'
import { DayTable } from './DayTable'
import { ErrorAlert } from './ErrorAlert'
import { EventList } from './EventList'
import { INTRADAY_RISK_NOTE } from './copy'

function Readout({ label, value, sub, alarm }: { label: string; value: string; sub: string; alarm?: boolean }) {
  return (
    <div className={`relative grid content-start gap-1 border-t-2 pt-3 ${alarm ? 'border-(--shortage)' : 'border-hud/25'}`}>
      <dt className="font-mono text-[0.72rem] tracking-[0.14em] text-[#a9b6d6] uppercase">{label}</dt>
      <dd className={`figure text-[1.65rem] leading-none font-bold whitespace-nowrap sm:text-4xl ${alarm ? 'text-(--shortage) [text-shadow:0_0_18px_rgb(255_122_114/0.45)]' : 'text-hud'}`}>
        {value}
      </dd>
      <dd className="text-sm text-[#a9b6d6]">{sub}</dd>
    </div>
  )
}

/** Before there is data: the shape of what will appear, each part saying what it will show. */
function Empty() {
  const ghost = 'rounded border border-dashed border-hud/25 p-3 text-sm text-[#a9b6d6]'
  return (
    <div className="cockpit grid gap-6 rounded-2xl p-5 sm:p-8">
      <p className="font-mono text-xs tracking-[0.16em] text-[#a9b6d6] uppercase">Chưa có dữ liệu</p>
      <p className="max-w-2xl font-serif text-2xl sm:text-3xl">
        Ở đây sẽ là một câu trả lời: có thiếu tiền không, ngày nào, bao nhiêu, vì khoản nào.
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <p className={ghost}>Số dư thấp nhất</p>
        <p className={ghost}>Ngày đầu thiếu tiền</p>
        <p className={ghost}>Thiếu lớn nhất</p>
        <p className={ghost}>Số dư ngày 56</p>
      </div>
      <svg aria-hidden="true" viewBox="0 0 560 120" className="h-28 w-full" preserveAspectRatio="none">
        <line x1="0" x2="560" y1="80" y2="80" stroke="currentColor" strokeOpacity="0.3" />
        <path d="M0 40 H80 V95 H160 V25 H560" fill="none" stroke="#62d6ea" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" />
      </svg>
      <a href="#lich" className="inline-flex items-center gap-2 justify-self-start rounded-md bg-hud px-4 py-2.5 font-semibold text-night">
        Nhập số dư hôm nay <ArrowRight aria-hidden="true" className="size-4" />
      </a>
    </div>
  )
}

export function ForecastScreen() {
  const { data, forecast, forecastError, forecastLoading, retryForecast, today } = useShop()

  const heading = (
    <header className="grid gap-2">
      <h1 id="screen-title" tabIndex={-1} className="font-display text-4xl font-bold tracking-tight outline-none sm:text-5xl">
        Dự báo &amp; cảnh báo
      </h1>
      <p className="max-w-2xl text-ink-2">
        Số dư cuối mỗi ngày trong 56 ngày, tính bằng phép cộng trừ từ số dư đã chốt và các khoản còn lại. Không phải dự báo AI.
      </p>
    </header>
  )

  if (!data) return heading
  if (!data.balance) return <div className="grid gap-8">{heading}<Empty /></div>

  if (forecastError && !forecast) {
    return (
      <div className="grid gap-8">
        {heading}
        <ErrorAlert error={forecastError} onRetry={retryForecast} />
      </div>
    )
  }

  if (!forecast) {
    return (
      <div className="grid gap-8">
        {heading}
        <div className="cockpit flex min-h-80 items-center justify-center gap-3 rounded-2xl" role="status">
          <LoaderCircle aria-hidden="true" className="size-5 motion-safe:animate-spin" /> Đang tính dự báo…
        </div>
      </div>
    )
  }

  const { result, request } = forecast
  const story = explainShortage(result, request.events, today)
  const first = result.days[0].date
  const last = result.days[result.days.length - 1].date
  const end = result.days[result.days.length - 1].closing
  const riskDays = result.days.filter((d) => d.hasIntradayTimingRisk)
  const lowestNegative = isNegative(result.lowestBalance)
  // Only a real schedule line can be split (not an actual payment already made).
  const candidate = story ? (story.lead ?? story.triggers[0] ?? null) : null
  const splitTarget = candidate && data.obligations.some((o) => o.id === candidate.id) ? candidate : null

  return (
    <div className="grid gap-10">
      {heading}

      <section aria-labelledby="verdict" aria-busy={forecastLoading} className="cockpit relative overflow-hidden rounded-2xl px-4 pt-6 pb-4 shadow-[0_40px_80px_-40px_rgb(10_16_32/0.9)] sm:px-8 sm:pt-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(60rem_24rem_at_80%_-10%,rgb(98_214_234/0.12),transparent),radial-gradient(40rem_20rem_at_0%_110%,rgb(255_106_181/0.10),transparent)]"
        />
        <div className="relative">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.72rem] tracking-[0.14em] text-[#a9b6d6] uppercase">
            <span className={`inline-block size-2 rounded-full ${story ? 'bg-(--shortage) motion-safe:animate-pulse' : 'bg-[#6fe2a3]'}`} aria-hidden="true" />
            {formatDate(first)} → {formatDate(last)} · {result.days.length} ngày
            {forecastLoading && <span className="normal-case tracking-normal">· đang cập nhật…</span>}
          </p>
          <h2 id="verdict" className="mt-3 max-w-4xl font-serif text-2xl leading-snug font-medium text-hud sm:text-[2.1rem]">
            {story ? (
              story.segments.map((seg, i) =>
                seg.alarm ? (
                  <mark key={i} className="bg-transparent text-(--shortage) underline decoration-2 underline-offset-[0.2em] [text-shadow:0_0_24px_rgb(255_122_114/0.35)]">
                    {seg.text}
                  </mark>
                ) : (
                  <span key={i}>{seg.text}</span>
                ),
              )
            ) : (
              <>
                Đủ tiền trong {result.days.length} ngày tới. Thấp nhất còn{' '}
                <span className="text-[#6fe2a3]">{formatMoneyWords(result.lowestBalance)}</span>{' '}
                {relativeDay(result.lowestBalanceDate, today)}.
              </>
            )}
          </h2>

          {(splitTarget || story) && (
            <div className="mt-5 flex flex-wrap gap-2">
              {splitTarget && (
                <a
                  href={splitScenarioHref(splitTarget.id)}
                  className="inline-flex items-center gap-2 rounded-md bg-[#ff6ab5] px-4 py-2.5 font-semibold text-night hover:bg-[#ff8cc4]"
                >
                  Thử chia đợt “{splitTarget.label}”
                  <ArrowRight aria-hidden="true" className="size-4" />
                </a>
              )}
              <a href="#kich-ban" className="inline-flex items-center gap-2 rounded-md border border-hud/40 px-4 py-2.5 font-semibold text-hud hover:bg-hud/10">
                Phương án khác
              </a>
            </div>
          )}

          {(result.unresolvedEvents.length > 0 || riskDays.length > 0) && (
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {result.unresolvedEvents.length > 0 && (
                <section aria-labelledby="unresolved-title" className="rounded-lg border border-(--shortage)/60 bg-(--shortage)/10 p-3">
                  <h3 id="unresolved-title" className="flex items-center gap-2 font-semibold text-(--shortage)">
                    <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
                    {result.unresolvedEvents.length} khoản quá hạn chưa được tính
                  </h3>
                  <p className="mt-1 text-sm text-hud/90">
                    Ngày dự kiến đã qua ngày chốt mà chưa xong. Không tính, cũng không coi là đã trả.{' '}
                    <a href="#lich" className="font-semibold text-hud underline underline-offset-4">Đổi ngày ở Lịch thu–chi</a>
                  </p>
                  <ul className="mt-2 grid gap-0.5 text-sm text-hud">
                    {result.unresolvedEvents.map((e) => (
                      <li key={e.id} className="flex flex-wrap justify-between gap-x-3">
                        <span className="break-words">{e.label}</span>
                        <span className="whitespace-nowrap tabular-nums">{e.direction === 'In' ? '+' : '−'}{formatVnd(e.amount)} · {formatDayMonth(e.date)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {riskDays.length > 0 && (
                <section aria-labelledby="intraday-title" className="rounded-lg border border-(--caution)/60 bg-(--caution)/10 p-3">
                  <h3 id="intraday-title" className="flex items-center gap-2 font-semibold text-(--caution)">
                    <CalendarClock aria-hidden="true" className="size-4 shrink-0" />
                    {riskDays.length} ngày vừa thu vừa chi
                  </h3>
                  <p className="mt-1 text-sm text-hud/90">
                    {INTRADAY_RISK_NOTE}: nếu chi trước khi tiền về, trong ngày vẫn có thể thiếu.
                  </p>
                  <p className="mt-2 text-sm font-semibold text-hud">
                    {riskDays.map((d) => `${formatWeekday(d.date)} ${formatDayMonth(d.date)}`).join(' · ')}
                  </p>
                </section>
              )}
            </div>
          )}

          <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
            <Readout
              label="Số dư thấp nhất"
              value={formatVnd(result.lowestBalance)}
              sub={`${formatWeekday(result.lowestBalanceDate)} ${formatDayMonth(result.lowestBalanceDate)}`}
              alarm={lowestNegative}
            />
            <Readout
              label="Ngày đầu thiếu tiền"
              value={result.firstShortageDate ? formatDayMonth(result.firstShortageDate) : 'Không có'}
              sub={result.firstShortageDate ? `${formatWeekday(result.firstShortageDate)} · ${inDays(result.firstShortageDate, today)}` : 'Số dư không xuống dưới 0'}
              alarm={Boolean(result.firstShortageDate)}
            />
            <Readout
              label="Thiếu lớn nhất"
              value={formatVnd(result.maxShortage)}
              sub={story ? 'Mức âm sâu nhất trong kỳ' : 'Không ngày nào âm'}
              alarm={Boolean(story)}
            />
            <Readout label="Cuối kỳ" value={formatVnd(end)} sub={`Cuối ngày ${formatDayMonth(last)}`} alarm={isNegative(end)} />
          </dl>

          <div className="mt-8 -mx-2 sm:mx-0">
            <BalanceChart result={result} events={request.events} />
          </div>
        </div>
      </section>

      {forecastError && (
        <ErrorAlert error={forecastError} onRetry={retryForecast} />
      )}

      <section aria-labelledby="trail-title" className="grid gap-4">
        <div>
          <h2 id="trail-title" className="font-display text-3xl font-bold">
            {story ? 'Tiền đi đâu trước ngày thiếu' : 'Tiền đi đâu tới ngày thấp nhất'}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-2">
            Từng khoản từ đầu kỳ tới ngày số dư thấp nhất ({formatDate(result.lowestBalanceDate)}), kèm số dư sau mỗi khoản.
          </p>
        </div>
        <CashTrail result={result} events={request.events} />
      </section>

      {result.eventsAfterHorizon.length > 0 && (
        <section aria-labelledby="after-title" className="rounded-xl bg-paper-2 p-4 sm:p-5">
          <h2 id="after-title" className="flex items-center gap-2 font-semibold">
            <Info aria-hidden="true" className="size-4" />
            {result.eventsAfterHorizon.length} khoản sau {formatDate(last)}, ngoài 56 ngày nên chưa tính
          </h2>
          <div className="mt-2 text-sm">
            <EventList events={result.eventsAfterHorizon} />
          </div>
        </section>
      )}

      <DayTable result={result} events={request.events} />
    </div>
  )
}
