import { useState } from 'react'
import { ArrowRight, CalendarPlus, Plus, TriangleAlert } from 'lucide-react'
import { BottomSheet } from '@astryxdesign/core/BottomSheet'
import { Button } from '@astryxdesign/core/Button'
import { Collapsible } from '@astryxdesign/core/Collapsible'
import { useMediaQuery } from '@astryxdesign/core/hooks'
import { Icon } from '@astryxdesign/core/Icon'
import { useShop } from '@/app/use-shop'
import { EmptyState, PageHeader, Panel } from '@/components/page'
import { addDays, diffDays, formatDayMonth } from '@/lib/date'
import { newId } from '@/lib/id'
import { addMoney, isZero } from '@/lib/money'
import { forecastStart, isOverdue, outstanding } from '@/lib/shop'
import type { Obligation } from '@/lib/shop'
import { BalanceTicket } from './BalanceTicket'
import { DateMark, ObligationEntry } from './ObligationEntry'
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

/** Date cell: day and weekday, and how soon it is (only while the item is still open; a countdown means nothing once it is done or cancelled). */
/** Rows with the date shown only on the first line of each day. */
function Rows({ items, today, overdue = false }: { items: Obligation[]; today: string; overdue?: boolean }) {
  return (
    <ul className="divide-y">
      {items.map((o, i) => (
        <li key={o.id}>
          <ObligationEntry obligation={o} overdue={overdue} date={i === 0 || items[i - 1].date !== o.date ? <DateMark date={o.date} today={today} countdown={o.status === 'open'} /> : null} />
        </li>
      ))}
    </ul>
  )
}

const COMPOSE_TITLE = 'Thêm khoản sắp thu / sắp chi'

export function ScheduleScreen() {
  const { data, write, today } = useShop()
  const [showDone, setShowDone] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  // Phones add through a bottom sheet; wider screens keep the form beside the list.
  const wide = useMediaQuery('(min-width: 64rem)')
  if (!data) return null

  const { balance } = data
  const start = balance ? forecastStart(balance) : null
  const open = data.obligations.filter((o) => o.status === 'open' && !isZero(outstanding(o)))
  const overdue = open.filter((o) => isOverdue(o, balance))
  const upcoming = open.filter((o) => !isOverdue(o, balance))
  const done = data.obligations.filter((o) => !open.includes(o))
  const ins = upcoming.filter((o) => o.direction === 'In')
  const outs = upcoming.filter((o) => o.direction === 'Out')

  const form = balance && (
    <ObligationForm
      initial={{ direction: 'Out', label: '', amount: '', date: start ?? today, note: '' }}
      submitLabel="Thêm vào lịch"
      minDate={start ?? undefined}
      onSubmit={async (d) => {
        const ok = await write((r) =>
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
        if (ok) setSheetOpen(false)
        return ok
      }}
    />
  )
  const phoneAdd = Boolean(balance) && !wide

  return (
    <div className="grid gap-5 lg:gap-6">
      <PageHeader
        title="Lịch thu–chi"
        actions={
          (phoneAdd || upcoming.length > 0) && (
            <>
              {upcoming.length > 0 && <Button label="Xem dự báo" href="#du-bao" endContent={<Icon icon={ArrowRight} />} />}
              {phoneAdd && <Button variant="primary" label="Thêm khoản" icon={<Icon icon={Plus} />} onClick={() => setSheetOpen(true)} />}
            </>
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
        <Panel
          flush
          titleId="overdue-title"
          title={
            <span className="flex items-center gap-2 text-shortage">
              <TriangleAlert aria-hidden="true" className="size-5 shrink-0" />
              {overdue.length} khoản quá hạn cần ngày mới
            </span>
          }
        >
          <div className="border-t">
            <Rows items={byDate(overdue)} today={today} overdue />
          </div>
        </Panel>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {wide && (
          <Panel title={COMPOSE_TITLE} titleId="compose-title" className="lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1">
            {form || <p className="text-sm text-secondary">Lưu số dư ở trên trước.</p>}
          </Panel>
        )}

        <Panel title="Sắp tới" titleId="ledger-title" flush className="lg:col-start-1 lg:row-start-1">
          {upcoming.length === 0 ? (
            <div className="border-t px-4 py-8">
              <EmptyState bare icon={<CalendarPlus />} title="Chưa có khoản nào sắp tới" action={<Button size="sm" label="Nhập từ file Excel/CSV" href="#nhap-file" />} />
            </div>
          ) : (
            groupByWeek(upcoming).map(([monday, items]) => (
              <section key={monday} aria-label={weekTitle(monday, today)} className="border-t">
                <h3 className="bg-muted px-4 py-2 text-sm font-bold text-secondary sm:px-5">{weekTitle(monday, today)}</h3>
                <div className="border-t">
                  <Rows items={items} today={today} />
                </div>
              </section>
            ))
          )}

          {done.length > 0 && (
            <div className="day-toggle border-t">
              <Collapsible
                isOpen={showDone}
                onOpenChange={setShowDone}
                chevronPosition="start"
                trigger={<span className="block font-semibold text-secondary">Đã xong hoặc đã hủy ({done.length})</span>}
              >
                <div className="border-t">
                  <Rows items={byDate(done)} today={today} />
                </div>
              </Collapsible>
            </div>
          )}
        </Panel>
      </div>

      {phoneAdd && (
        <BottomSheet label={COMPOSE_TITLE} isOpen={sheetOpen} onOpenChange={setSheetOpen} height="tall" purpose="form">
          <h2 className="section-title mb-4">{COMPOSE_TITLE}</h2>
          {form}
        </BottomSheet>
      )}
    </div>
  )
}

