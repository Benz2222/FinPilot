import { useState } from 'react'
import { ArrowRight, CalendarPlus, ChevronDown, TriangleAlert } from 'lucide-react'
import { useShop } from '@/app/use-shop'
import { EmptyState, PageHeader } from '@/components/page'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { addDays, diffDays, formatDate, formatDayMonth, formatWeekday } from '@/lib/date'
import { newId } from '@/lib/id'
import { addMoney, formatVnd, isZero } from '@/lib/money'
import { forecastStart, isOverdue, outstanding } from '@/lib/shop'
import type { Obligation } from '@/lib/shop'
import { BalanceTicket } from './BalanceTicket'
import { ObligationEntry } from './ObligationEntry'
import { ObligationForm } from './ObligationForm'

/** Monday of the week containing `date` (weeks run Monday to Sunday, as on a Vietnamese wall calendar). */
function weekStart(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
  return addDays(date, -weekday)
}

function weekTitle(monday: string, today: string): string {
  const n = diffDays(weekStart(today), monday) / 7
  const range = `${formatDayMonth(monday)} – ${formatDayMonth(addDays(monday, 6))}`
  if (n === 0) return `Tuần này · ${range}`
  if (n === 1) return `Tuần sau · ${range}`
  return `Tuần ${range}`
}

function byDate(items: Obligation[]): Obligation[] {
  return [...items].sort((a, b) => a.date.localeCompare(b.date))
}

function groupByWeek(items: Obligation[]): [string, Obligation[]][] {
  const weeks = new Map<string, Obligation[]>()
  for (const o of byDate(items)) weeks.set(weekStart(o.date), [...(weeks.get(weekStart(o.date)) ?? []), o])
  return [...weeks.entries()]
}

/** Date cell: day and weekday, and how soon it is. */
function DateMark({ date, today }: { date: string; today: string }) {
  const n = diffDays(today, date)
  const soon = n === 0 ? 'Hôm nay' : n === 1 ? 'Ngày mai' : n > 0 ? `Còn ${n} ngày` : `${-n} ngày trước`
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:grid sm:justify-items-start sm:gap-0.5">
      <span className="num text-sm font-semibold text-foreground">{formatDate(date).slice(0, 5)}</span>
      <span className="text-xs text-muted-foreground">{formatWeekday(date)}</span>
      {n >= 0 && n <= 2 ? (
        <Badge variant={n === 0 ? 'primary' : 'warning'} className="sm:mt-1">
          {soon}
        </Badge>
      ) : (
        <span className="text-xs text-muted-foreground sm:mt-0.5">{soon}</span>
      )}
    </p>
  )
}

/** Rows with the date shown only on the first line of each day. */
function Rows({ items, today, overdue = false }: { items: Obligation[]; today: string; overdue?: boolean }) {
  return (
    <ul className="divide-y">
      {items.map((o, i) => (
        <li key={o.id}>
          <ObligationEntry obligation={o} overdue={overdue} date={i === 0 || items[i - 1].date !== o.date ? <DateMark date={o.date} today={today} /> : null} />
        </li>
      ))}
    </ul>
  )
}

export function ScheduleScreen() {
  const { data, write, today } = useShop()
  const [showDone, setShowDone] = useState(false)
  if (!data) return null

  const { balance } = data
  const start = balance ? forecastStart(balance) : null
  const open = data.obligations.filter((o) => o.status === 'open' && !isZero(outstanding(o)))
  const overdue = open.filter((o) => isOverdue(o, balance))
  const upcoming = open.filter((o) => !isOverdue(o, balance))
  const done = data.obligations.filter((o) => !open.includes(o))
  const ins = upcoming.filter((o) => o.direction === 'In')
  const outs = upcoming.filter((o) => o.direction === 'Out')

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Lịch thu–chi"
        description="Ghi số dư thật và mọi khoản sắp chi, sắp thu kèm ngày. Đây là dữ liệu thật của shop: dự báo và kịch bản đều tính từ đây."
        actions={
          upcoming.length > 0 && (
            <a href="#du-bao" className={buttonVariants({ variant: 'outline' })}>
              Xem dự báo 56 ngày
              <ArrowRight aria-hidden="true" />
            </a>
          )
        }
      />

      <BalanceTicket
        totalIn={addMoney('0', ...ins.map(outstanding))}
        totalOut={addMoney('0', ...outs.map(outstanding))}
        countIn={ins.length}
        countOut={outs.length}
      />

      {overdue.length > 0 && (
        <Card className="overflow-hidden border-shortage-line">
          <section aria-labelledby="overdue-title">
            <div className="flex gap-3 border-b border-shortage-line bg-shortage-soft px-4 py-3 sm:px-5">
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-shortage" />
              <div>
                <h2 id="overdue-title" className="font-semibold text-shortage">
                  {overdue.length} khoản quá hạn cần ngày mới
                </h2>
                <p className="mt-0.5 max-w-3xl text-sm text-secondary-foreground">
                  Các khoản này dự kiến vào hoặc trước ngày chốt {formatDate(balance!.cutoff)} nhưng chưa xong. Dự báo{' '}
                  <strong className="font-semibold">không tính</strong> chúng và cũng không coi là đã trả hoặc đã thu: hãy chọn ngày mới, ghi nhận đã xong,
                  hoặc hủy.
                </p>
              </div>
            </div>
            <Rows items={byDate(overdue)} today={today} overdue />
          </section>
        </Card>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <Card className="lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1">
          <section aria-labelledby="compose-title" className="p-4 sm:p-5">
            <h2 id="compose-title" className="mb-4 text-base font-semibold">
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
              <p className="text-sm text-muted-foreground">Lưu số dư ở trên trước, để biết dự báo bắt đầu từ ngày nào.</p>
            )}
          </section>
        </Card>

        <Card className="min-w-0 overflow-hidden lg:col-start-1 lg:row-start-1">
          <section aria-labelledby="ledger-title">
            <CardHeader className="pb-4 sm:pb-4">
              <div>
                <CardTitle id="ledger-title">Sắp tới</CardTitle>
                {upcoming.length > 0 && (
                  <CardDescription className="num">
                    {upcoming.length} khoản · sắp chi {formatVnd(addMoney('0', ...outs.map(outstanding)))} · sắp thu{' '}
                    {formatVnd(addMoney('0', ...ins.map(outstanding)))}
                  </CardDescription>
                )}
              </div>
            </CardHeader>

            {upcoming.length === 0 ? (
              <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                <EmptyState
                  icon={<CalendarPlus />}
                  title="Chưa có khoản nào sắp tới"
                  action={
                    <a href="#nhap-file" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                      Nhập từ file Excel/CSV
                    </a>
                  }
                >
                  Thêm tiền nhập hàng, lương, tiền thuê, tiền sàn sắp về… hoặc nhập cả danh sách từ file.
                </EmptyState>
              </div>
            ) : (
              groupByWeek(upcoming).map(([monday, items]) => (
                <section key={monday} aria-label={weekTitle(monday, today)} className="border-t">
                  <h3 className="num bg-muted/60 px-4 py-2 text-xs font-medium text-muted-foreground sm:px-5">{weekTitle(monday, today)}</h3>
                  <div className="border-t">
                    <Rows items={items} today={today} />
                  </div>
                </section>
              ))
            )}

            {done.length > 0 && (
              <section aria-labelledby="done-title" className="border-t">
                <h3 id="done-title">
                  <Button
                    variant="ghost"
                    aria-expanded={showDone}
                    aria-controls="done-list"
                    onClick={() => setShowDone((v) => !v)}
                    className="h-11 w-full justify-start rounded-none px-4 text-muted-foreground sm:px-5"
                  >
                    <ChevronDown aria-hidden="true" className={showDone ? 'rotate-180' : undefined} />
                    Đã xong hoặc đã hủy ({done.length})
                  </Button>
                </h3>
                {showDone && (
                  <div id="done-list" className="border-t">
                    <Rows items={byDate(done)} today={today} />
                  </div>
                )}
              </section>
            )}
          </section>
        </Card>
      </div>
    </div>
  )
}
