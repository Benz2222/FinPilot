import { useState } from 'react'
import { ArrowRight, ChevronDown, TriangleAlert } from 'lucide-react'
import { useShop } from '@/app/use-shop'
import { addDays, diffDays, formatDate, formatDayMonth, formatWeekday } from '@/lib/date'
import { newId } from '@/lib/id'
import { addMoney, formatVnd, isZero } from '@/lib/money'
import { forecastStart, isOverdue, outstanding } from '@/lib/shop'
import type { Obligation } from '@/lib/shop'
import { BalanceTicket } from './BalanceTicket'
import { ObligationEntry } from './ObligationEntry'
import { ObligationForm } from './ObligationForm'

const MONTHS = ['thg 1', 'thg 2', 'thg 3', 'thg 4', 'thg 5', 'thg 6', 'thg 7', 'thg 8', 'thg 9', 'thg 10', 'thg 11', 'thg 12']

/** Monday of the week containing `date` (weeks run Monday to Sunday, as on a Vietnamese wall calendar). */
function weekStart(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
  return addDays(date, -weekday)
}

function weekTitle(monday: string, today: string): string {
  const n = diffDays(weekStart(today), monday) / 7
  if (n === 0) return 'Tuần này'
  if (n === 1) return 'Tuần sau'
  return `Tuần ${formatDayMonth(monday)} – ${formatDayMonth(addDays(monday, 6))}`
}

function groupByWeek(items: Obligation[]): [string, [string, Obligation[]][]][] {
  const weeks = new Map<string, Obligation[]>()
  for (const o of items) weeks.set(weekStart(o.date), [...(weeks.get(weekStart(o.date)) ?? []), o])
  return [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([w, list]) => [w, groupByDate(list)])
}

function groupByDate(items: Obligation[]): [string, Obligation[]][] {
  const map = new Map<string, Obligation[]>()
  for (const o of [...items].sort((a, b) => a.date.localeCompare(b.date))) {
    map.set(o.date, [...(map.get(o.date) ?? []), o])
  }
  return [...map.entries()]
}

/** Date block on the spine: big day number, weekday and month, and how soon it is. */
function DateMark({ date, today }: { date: string; today: string }) {
  const [, m, d] = date.split('-')
  const n = diffDays(today, date)
  const soon = n === 0 ? 'Hôm nay' : n === 1 ? 'Ngày mai' : n > 0 ? `Còn ${n} ngày` : `${-n} ngày trước`
  const tone =
    n === 0 ? 'bg-magenta text-white' : n > 0 && n <= 2 ? 'bg-[#fdf3df] text-[#7a4a00] ring-1 ring-[#e39a12]' : 'text-ink-3'
  return (
    <div className="relative grid justify-items-start gap-0.5 sm:justify-items-end sm:text-right">
      <span
        aria-hidden="true"
        className={`absolute top-3 -right-[1.4rem] hidden size-3 rounded-full ring-4 ring-paper sm:block ${n === 0 ? 'bg-magenta' : 'bg-ink'}`}
      />
      <p className="grid grid-cols-[auto_1fr] items-center gap-x-3 sm:flex sm:flex-col sm:items-end sm:gap-0.5">
        <span className="figure row-span-2 text-4xl leading-none font-bold">{d}</span>
        <span className="text-sm font-semibold whitespace-nowrap text-ink-2">
          {formatWeekday(date)}, {MONTHS[Number(m) - 1]}
        </span>
        <span className={`justify-self-start rounded px-1.5 text-xs font-bold ${tone}`}>{soon}</span>
      </p>
    </div>
  )
}

export function ScheduleScreen() {
  const { data, write, today } = useShop()
  const [showDone, setShowDone] = useState(false)
  if (!data) return <p className="text-ink-3">Đang mở dữ liệu…</p>

  const { balance } = data
  const start = balance ? forecastStart(balance) : null
  const open = data.obligations.filter((o) => o.status === 'open' && !isZero(outstanding(o)))
  const overdue = open.filter((o) => isOverdue(o, balance))
  const upcoming = open.filter((o) => !isOverdue(o, balance))
  const done = data.obligations.filter((o) => !open.includes(o))
  const totalIn = addMoney('0', ...upcoming.filter((o) => o.direction === 'In').map(outstanding))
  const totalOut = addMoney('0', ...upcoming.filter((o) => o.direction === 'Out').map(outstanding))

  return (
    <div className="grid gap-10">
      <header className="grid gap-2">
        <h1 id="screen-title" tabIndex={-1} className="font-display text-4xl font-bold tracking-tight outline-none sm:text-5xl">
          Lịch thu–chi
        </h1>
        <p className="max-w-2xl text-ink-2">
          Ghi số dư thật và mọi khoản sắp chi, sắp thu kèm ngày. Đây là dữ liệu thật của shop: dự báo và kịch bản đều tính từ đây.
        </p>
      </header>

      <BalanceTicket />

      {overdue.length > 0 && (
        <section aria-labelledby="overdue-title" className="rounded-xl border-2 border-destructive/60 bg-card p-4 sm:p-6">
          <h2 id="overdue-title" className="flex items-center gap-2 font-display text-2xl font-bold text-destructive">
            <TriangleAlert aria-hidden="true" className="size-6" />
            {overdue.length} khoản quá hạn cần ngày mới
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-2">
            Các khoản này dự kiến vào hoặc trước ngày chốt {formatDate(balance!.cutoff)} nhưng chưa xong. Dự báo{' '}
            <strong>không tính</strong> chúng và cũng không coi là đã trả hoặc đã thu: hãy chọn ngày mới, ghi nhận đã xong, hoặc hủy.
          </p>
          <div className="mt-4 grid gap-2">
            {overdue.map((o) => (
              <ObligationEntry key={o.id} obligation={o} overdue />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="compose-title" className="rounded-xl bg-card p-4 shadow-[0_1px_0_rgb(255_255_255/0.7)_inset,0_18px_40px_-28px_rgb(16_27_51/0.5)] ring-1 ring-ink/10 sm:p-6">
        <h2 id="compose-title" className="eyebrow mb-4">
          Thêm khoản sắp thu / sắp chi
        </h2>
        {balance ? (
          <ObligationForm
            initial={{ direction: 'Out', label: '', amount: '', date: start ?? today, note: '' }}
            submitLabel="Thêm vào lịch"
            minDate={start ?? undefined}
            onSubmit={(d) =>
              write((r) =>
                r.saveObligation({
                  id: newId(),
                  direction: d.direction as Obligation['direction'],
                  label: d.label,
                  amount: d.amount,
                  date: d.date,
                  note: d.note,
                  status: 'open',
                  payments: [],
                }),
              )
            }
          />
        ) : (
          <p className="text-sm text-ink-3">Lưu số dư ở trên trước, để biết dự báo bắt đầu từ ngày nào.</p>
        )}
      </section>

      <section aria-labelledby="ledger-title">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b-2 border-ink pb-2">
          <h2 id="ledger-title" className="font-display text-3xl font-bold">
            Sắp tới
          </h2>
          {upcoming.length > 0 && (
            <p className="text-sm text-ink-2">
              {upcoming.length} khoản · sắp chi <strong className="figure text-base">{formatVnd(totalOut)}</strong> · sắp thu{' '}
              <strong className="figure text-base text-jade">{formatVnd(totalIn)}</strong>
            </p>
          )}
        </div>

        {upcoming.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-ink/30 px-4 py-8 text-center text-ink-3">
            Chưa có khoản nào sắp tới. Thêm tiền nhập hàng, lương, tiền thuê, tiền sàn sắp về… hoặc{' '}
            <a href="#nhap-file" className="font-semibold text-magenta underline underline-offset-4">
              nhập từ file Excel/CSV
            </a>
            .
          </p>
        ) : (
          <div className="mt-6 grid gap-10">
            {groupByWeek(upcoming).map(([monday, days]) => (
              <section key={monday} aria-label={weekTitle(monday, today)} className="grid gap-5">
                <h3 className="flex items-center gap-3 font-mono text-xs font-semibold tracking-[0.16em] text-ink-3 uppercase after:h-px after:flex-1 after:bg-ink/20">
                  {weekTitle(monday, today)}
                </h3>
                <ol className="grid gap-8">
                  {days.map(([date, items]) => (
                    <li key={date} className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-10">
                      <DateMark date={date} today={today} />
                      <div className="grid gap-2 sm:border-l-2 sm:border-dashed sm:border-ink/20 sm:pl-6">
                        {items.map((o) => (
                          <ObligationEntry key={o.id} obligation={o} />
                        ))}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}

        {upcoming.length > 0 && (
          <a
            href="#du-bao"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-ink px-5 py-3 font-semibold text-paper hover:bg-ink-2"
          >
            Xem dự báo 56 ngày
            <ArrowRight aria-hidden="true" className="size-4" />
          </a>
        )}
      </section>

      {done.length > 0 && (
        <section aria-labelledby="done-title">
          <h2 id="done-title">
            <button
              type="button"
              aria-expanded={showDone}
              aria-controls="done-list"
              onClick={() => setShowDone((v) => !v)}
              className="flex items-center gap-2 rounded font-semibold text-ink-2"
            >
              <ChevronDown aria-hidden="true" className={`size-4 transition-transform ${showDone ? 'rotate-180' : ''}`} />
              Đã xong hoặc đã hủy ({done.length})
            </button>
          </h2>
          {showDone && (
            <div id="done-list" className="mt-3 grid gap-2">
              {done.map((o) => (
                <ObligationEntry key={o.id} obligation={o} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
