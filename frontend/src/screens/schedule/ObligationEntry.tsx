import { useId, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { ArrowDownLeft, ArrowUpRight, CalendarClock, CircleCheck, CircleSlash, PencilLine, RotateCcw, Trash2 } from 'lucide-react'
import { Badge } from '@astryxdesign/core/Badge'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { ProgressBar } from '@astryxdesign/core/ProgressBar'
import { useShop } from '@/app/use-shop'
import { MoneyInput } from '@/components/MoneyInput'
import { DateInput, Field, FieldLabel } from '@/components/fields'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { RowMenu } from '@/components/RowMenu'
import type { RowAction } from '@/components/RowMenu'
import { diffDays, formatDate, formatWeekday, isValidIsoDate } from '@/lib/date'
import { newId } from '@/lib/id'
import { compareMoney, formatVnd, isZero } from '@/lib/money'
import { forecastStart, paidTotal, remaining } from '@/lib/shop'
import type { Obligation } from '@/lib/shop'
import { cn } from '@/lib/utils'
import { ObligationForm } from './ObligationForm'

/** The date column of an obligation row: dd/mm, weekday and how far away it is (soon ones as a badge). */
export function DateMark({ date, today, countdown }: { date: string; today: string; countdown: boolean }) {
  const n = diffDays(today, date)
  const soon = n === 0 ? 'Hôm nay' : n === 1 ? 'Ngày mai' : n > 0 ? `Còn ${n} ngày` : `${-n} ngày trước`
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:grid sm:justify-items-start sm:gap-0.5">
      <span className="num font-bold text-primary">{formatDate(date).slice(0, 5)}</span>
      <span className="text-sm text-secondary">{formatWeekday(date)}</span>
      {!countdown ? null : n >= 0 && n <= 2 ? (
        <span className="sm:mt-1">
          <Badge variant={n === 0 ? 'info' : 'warning'} label={soon} />
        </span>
      ) : (
        <span className="text-sm text-secondary sm:mt-0.5">{soon}</span>
      )}
    </p>
  )
}

const STATUS_TEXT = { open: 'Còn mở', paid: 'Đã xong', cancelled: 'Đã hủy' } as const

/** Inline form below a row (payment, new date); spans the label and amount columns. */
function InlinePanel({ children }: { children: ReactNode }) {
  return <div className="fp-well col-span-full p-3 sm:col-span-2 sm:col-start-2 sm:p-4">{children}</div>
}

function PaymentForm({ obligation, onDone }: { obligation: Obligation; onDone: () => void }) {
  const { write, today } = useShop()
  const uid = useId()
  const left = remaining(obligation)
  const [amount, setAmount] = useState(left)
  const [date, setDate] = useState(today)
  const [showErrors, setShowErrors] = useState(false)
  const verb = obligation.direction === 'In' ? 'thu' : 'trả'
  const errors = {
    amount: !amount
      ? 'Nhập số tiền'
      : isZero(amount)
        ? 'Số tiền phải lớn hơn 0'
        : compareMoney(amount, left) > 0
          ? `Không được quá phần còn lại (${formatVnd(left)})`
          : undefined,
    date: !isValidIsoDate(date) ? 'Chọn ngày' : date > today ? `Chỉ ghi nhận tiền đã ${verb} (không sau hôm nay)` : undefined,
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (errors.amount || errors.date) return setShowErrors(true)
    const payments = [...obligation.payments, { id: newId(), amount, date }]
    const next: Obligation = { ...obligation, payments }
    if (compareMoney(amount, left) === 0) next.status = 'paid'
    if (await write((r) => r.saveObligation(next))) onDone()
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-[minmax(0,13rem)_11rem_auto] sm:items-start">
      <div className="min-w-0">
        <FieldLabel htmlFor={`${uid}-amount`}>Số tiền đã {verb}</FieldLabel>
        <MoneyInput id={`${uid}-amount`} value={amount} onValueChange={setAmount} error={showErrors ? errors.amount : undefined} />
      </div>
      <Field id={`${uid}-date`} label={`Ngày ${verb}`} error={showErrors ? errors.date : undefined}>
        <DateInput
          id={`${uid}-date`}
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          invalid={showErrors && Boolean(errors.date)}
          describedBy={`${uid}-date-error`}
        />
      </Field>
      <div className="flex gap-2 sm:pt-7">
        <Button type="submit" variant="primary" size="lg" label="Ghi nhận" />
        <Button type="button" variant="ghost" size="lg" label="Hủy" onClick={onDone} />
      </div>
    </form>
  )
}

function RescheduleForm({ minDate, onSave, onCancel }: { minDate?: string; onSave: (date: string) => void; onCancel: () => void }) {
  const uid = useId()
  const [date, setDate] = useState(minDate ?? '')
  const [error, setError] = useState<string>()
  return (
    <form
      noValidate
      className="flex flex-wrap items-start gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!isValidIsoDate(date)) return setError('Chọn ngày mới')
        if (minDate && date < minDate) return setError(`Chọn từ ${formatDate(minDate)} trở đi`)
        onSave(date)
      }}
    >
      <Field id={`${uid}-date`} label="Ngày dự kiến mới" error={error} className="w-48">
        <DateInput id={`${uid}-date`} value={date} min={minDate} autoFocus onChange={(e) => setDate(e.target.value)} invalid={Boolean(error)} describedBy={`${uid}-date-error`} />
      </Field>
      <div className="flex gap-2 pt-7">
        <Button type="submit" variant="primary" size="lg" label="Lưu ngày mới" />
        <Button type="button" variant="ghost" size="lg" label="Hủy" onClick={onCancel} />
      </div>
    </form>
  )
}

/**
 * One line of the ledger: date (blank when the line above has the same date), what it is, partial progress,
 * what is still to move, and its actions in a menu. Overdue lines show their two fixes as buttons.
 */
export function ObligationEntry({ obligation, overdue = false, date }: { obligation: Obligation; overdue?: boolean; date: ReactNode }) {
  const { write, data } = useShop()
  const [mode, setMode] = useState<'view' | 'pay' | 'edit' | 'reschedule'>('view')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const uid = useId()
  const balance = data?.balance ?? null
  const minDate = balance ? forecastStart(balance) : undefined
  const paid = paidTotal(obligation)
  const left = remaining(obligation)
  const partial = !isZero(paid)
  const isIn = obligation.direction === 'In'
  const done = obligation.status !== 'open'
  const percent = isZero(obligation.amount) ? 0 : Number((BigInt(paid) * 1000n) / BigInt(obligation.amount)) / 10 // display only
  const verb = isIn ? 'thu' : 'trả'
  const save = (o: Obligation) => write((r) => r.saveObligation(o))
  const settleOnCutoff = () =>
    void save({ ...obligation, status: 'paid', payments: [...obligation.payments, { id: newId(), amount: left, date: balance!.cutoff }] })

  if (mode === 'edit') {
    return (
      <div className="px-4 py-4 sm:px-5">
        <div className="fp-well p-4">
          <h4 className="mb-3 font-semibold">Sửa khoản</h4>
          <ObligationForm
            initial={{ direction: obligation.direction, label: obligation.label, amount: obligation.amount, date: obligation.date, note: obligation.note }}
            submitLabel="Lưu thay đổi"
            minDate={obligation.status === 'open' ? minDate : undefined}
            onCancel={() => setMode('view')}
            onSubmit={async (d) => {
              if (d.direction === '') return false
              const ok = await save({ ...obligation, ...d, direction: d.direction })
              if (ok) setMode('view')
              return ok
            }}
          />
        </div>
      </div>
    )
  }

  const actions: RowAction[] = [
    ...(!done && !overdue ? [{ label: `Ghi nhận đã ${verb}`, icon: CircleCheck, onClick: () => setMode('pay') }] : []),
    { label: 'Sửa', icon: PencilLine, onClick: () => setMode('edit') },
    ...(obligation.status === 'open'
      ? [{ label: 'Hủy khoản', icon: CircleSlash, onClick: () => void save({ ...obligation, status: 'cancelled' }) }]
      : // A fully paid line has nothing left to reopen; remove a payment instead.
        obligation.status === 'paid' && isZero(left)
        ? []
        : [{ label: 'Mở lại', icon: RotateCcw, onClick: () => void save({ ...obligation, status: 'open' }) }]),
    { label: 'Xóa', icon: Trash2, onClick: () => setConfirmDelete(true), destructive: true },
  ]

  return (
    <article
      aria-labelledby={`${uid}-label`}
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-4 py-3.5 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto] sm:px-5',
        done && 'text-secondary',
      )}
    >
      <div className={cn('col-span-full sm:col-span-1', !date && 'hidden sm:block')}>{date}</div>

      <div className="flex min-w-0 gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border-2',
            done ? 'border-border text-secondary' : isIn ? 'border-ok bg-ok-soft text-ok' : 'border-[var(--color-border-emphasized)] bg-surface text-primary',
          )}
        >
          {isIn ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <h4 id={`${uid}-label`} className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold break-words', !done && 'text-primary')}>
            <span className="sr-only">{isIn ? 'Khoản thu: ' : 'Khoản chi: '}</span>
            <span className={obligation.status === 'cancelled' ? 'line-through' : undefined}>{obligation.label}</span>
            {done && <Badge variant={obligation.status === 'paid' ? 'success' : 'neutral'} label={STATUS_TEXT[obligation.status]} />}
            {overdue && <Badge variant="error" label="Quá hạn" />}
            {obligation.importedFrom && <Badge variant="neutral" label="Từ file" />}
          </h4>
          {obligation.note && <p className="text-sm break-words text-secondary">{obligation.note}</p>}
        </div>
      </div>

      <div className="flex items-start gap-0.5">
        <p className={cn('num pt-1.5 text-right font-semibold whitespace-nowrap', !done && (isIn ? 'text-ok' : 'text-primary'))}>
          <span aria-hidden="true">{isIn ? '+' : '−'}</span>
          {formatVnd(done ? obligation.amount : left)}
        </p>
        <RowMenu label={`Thao tác với “${obligation.label}”`} actions={actions} />
      </div>

      {(partial || (overdue && mode === 'view')) && (
        <div className="col-span-full grid gap-2 pl-11 sm:col-span-2 sm:col-start-2">
          {partial && (
            <div className="grid max-w-md gap-1.5">
              <ProgressBar label={`Đã ${verb}`} isLabelHidden value={percent} max={100} variant={isIn ? 'success' : 'accent'} />
              <p className="num text-sm text-secondary">
                Đã {verb} {formatVnd(paid)} / {formatVnd(obligation.amount)}
                {!done && <> · còn {formatVnd(left)}</>}
              </p>
              <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-secondary">
                {obligation.payments.map((p) => (
                  <li key={p.id} className="num flex items-center gap-1">
                    {formatDate(p.date)}: {formatVnd(p.amount)}
                    <button
                      type="button"
                      className="min-h-8 rounded px-1.5 font-semibold text-shortage hover:bg-shortage-soft hover:underline"
                      aria-label={`Bỏ lần ${verb} ${formatVnd(p.amount)} ngày ${formatDate(p.date)}`}
                      onClick={() =>
                        void save({ ...obligation, status: obligation.status === 'paid' ? 'open' : obligation.status, payments: obligation.payments.filter((x) => x.id !== p.id) })
                      }
                    >
                      Bỏ
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {overdue && mode === 'view' && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" label="Đổi ngày" icon={<Icon icon={CalendarClock} />} onClick={() => setMode('reschedule')} />
              <Button size="sm" variant="ghost" label={`Đã ${verb}`} icon={<Icon icon={CircleCheck} />} onClick={settleOnCutoff} />
            </div>
          )}
        </div>
      )}

      {mode === 'reschedule' && (
        <InlinePanel>
          <RescheduleForm
            minDate={minDate}
            onCancel={() => setMode('view')}
            onSave={async (next) => {
              if (await save({ ...obligation, date: next })) setMode('view')
            }}
          />
        </InlinePanel>
      )}
      {mode === 'pay' && (
        <InlinePanel>
          <PaymentForm obligation={obligation} onDone={() => setMode('view')} />
        </InlinePanel>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Xóa khoản này?"
        description={`“${obligation.label}” sẽ bị xóa khỏi lịch thu–chi, kể cả các lần đã ${verb}.`}
        confirmLabel="Xóa khoản"
        onConfirm={() => void write((r) => r.deleteObligation(obligation.id))}
      />
    </article>
  )
}
