import { ArrowRight, CircleCheck, TriangleAlert } from 'lucide-react'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { splitScenarioHref } from '@/app/routes'
import { formatDate } from '@/lib/date'
import { inDays, relativeDay } from '@/lib/explain'
import type { ShortageStory } from '@/lib/explain'
import { formatMoneyWords } from '@/lib/money'
import type { CashEvent, ForecastResponse, IsoDate } from '@/lib/types'
import { cn } from '@/lib/utils'

interface VerdictProps {
  result: ForecastResponse
  story: ShortageStory | null
  today: IsoDate
  /** The schedule line a split scenario can start from, if there is one. */
  splitTarget: CashEvent | null
  updating?: boolean
  /** Off for the picture on the landing page. */
  hasActions?: boolean
}

/**
 * The forecast's answer, the one full-colour panel in the app (coral when money runs short, lime when it does not):
 * a badge, one sentence with the shortage on a white highlight, then the next step. The badge and the words say the
 * verdict too, so the colour is never the only signal.
 */
export function Verdict({ result, story, today, splitTarget, updating = false, hasActions = true }: VerdictProps) {
  const first = result.days[0].date
  const last = result.days[result.days.length - 1].date
  const total = result.days.length

  return (
    <div className={cn('verdict grid gap-3 p-4 sm:gap-4 sm:p-6', story ? 'bg-hero-short' : 'bg-hero-ok')}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <span
          className={cn(
            'num inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-sm font-bold',
            story ? 'bg-shortage text-on-error' : 'bg-ok text-on-success',
          )}
        >
          {story ? <TriangleAlert aria-hidden="true" className="size-4" /> : <CircleCheck aria-hidden="true" className="size-4" />}
          {story ? `Thiếu tiền · ${inDays(story.firstDate, today)}` : `Đủ tiền · ${total}/${total} ngày`}
        </span>
        <p className="num text-xs font-medium">
          {formatDate(first)} → {formatDate(last)}
          {updating && <span> · đang cập nhật…</span>}
        </p>
      </div>

      <h2 id="verdict" className="verdict-text max-w-4xl">
        {story
          ? story.segments.map((seg, i) =>
              seg.alarm ? (
                <mark key={i} className="verdict-mark">
                  {seg.text}
                </mark>
              ) : (
                <span key={i}>{seg.text}</span>
              ),
            )
          : `Đủ tiền trong ${total} ngày tới. Thấp nhất còn ${formatMoneyWords(result.lowestBalance)} ${relativeDay(result.lowestBalanceDate, today)}.`}
      </h2>

      {story && hasActions && (
        <div className="flex min-w-0 flex-wrap gap-2">
          {splitTarget && (
            <Button variant="primary" href={splitScenarioHref(splitTarget.id)} label={`Thử chia đợt “${splitTarget.label}”`} endContent={<Icon icon={ArrowRight} />} />
          )}
          <Button href="#kich-ban" label="Phương án khác" />
        </div>
      )}
    </div>
  )
}
