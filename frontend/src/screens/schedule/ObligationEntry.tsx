import { useId, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { ArrowDownLeft, ArrowUpRight, CalendarClock, CircleCheck, CircleSlash, MoreHorizontal, PencilLine, RotateCcw, Trash2 } from 'lucide-react'
import { useShop } from '@/app/use-shop'
import { MoneyInput } from '@/components/MoneyInput'
import { DateInput, FieldError, FieldLabel } from '@/components/fields'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import { formatDate, isValidIsoDate } from '@/lib/date'
import { newId } from '@/lib/id'
import { compareMoney, formatVnd, isZero } from '@/lib/money'
import { forecastStart, paidTotal, remaining } from '@/lib/shop'
import type { Obligation } from '@/lib/shop'
import { cn } from '@/lib/utils'
import { ObligationForm } from './ObligationForm'

const STATUS_TEXT = { open: 'Còn mở', paid: 'Đã xong', cancelled: 'Đã hủy' } as const

/** Inline form below a row (payment, new date); spans the label and amount columns. */
function InlinePanel({ children }: { children: ReactNode }) {
  return <div className="col-span-full rounded-lg border bg-muted/50 p-3 sm:col-span-2 sm:col-start-2">{children}</div>
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
      <div className="min-w-0">
        <FieldLabel htmlFor={`${uid}-date`}>Ngày {verb}</FieldLabel>
        <DateInput
          id={`${uid}-date`}
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          invalid={showErrors && Boolean(errors.date)}
          describedBy={`${uid}-date-error`}
        />
        <FieldError id={`${uid}-date-error`} message={showErrors ? errors.date : undefined} />
      </div>
      <div className="flex gap-2 sm:pt-7">
        <Button type="submit">Ghi nhận</Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Hủy
        </Button>
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
      <div className="w-44">
        <FieldLabel htmlFor={`${uid}-date`}>Ngày dự kiến mới</FieldLabel>
        <DateInput id={`${uid}-date`} value={date} min={minDate} autoFocus onChange={(e) => setDate(e.target.value)} invalid={Boolean(error)} describedBy={`${uid}-date-error`} />
        <FieldError id={`${uid}-date-error`} message={error} />
      </div>
      <div className="flex gap-2 pt-7">
        <Button type="submit">Lưu ngày mới</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Hủy
        </Button>
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
        <div className="rounded-lg border border-primary/30 bg-card p-4 ring-3 ring-primary/10">
          <p className="mb-3 text-sm font-semibold">Sửa khoản</p>
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

  return (
    <article
      aria-labelledby={`${uid}-label`}
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)_auto] sm:px-5',
        done && 'text-muted-foreground',
      )}
    >
      <div className={cn('col-span-full sm:col-span-1', !date && 'hidden sm:block')}>{date}</div>

      <div className="flex min-w-0 gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'mt-0.5 grid size-7 shrink-0 place-items-center rounded-full',
            done ? 'bg-muted text-muted-foreground' : isIn ? 'bg-ok-soft text-ok' : 'bg-muted text-secondary-foreground',
          )}
        >
          {isIn ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <h4 id={`${uid}-label`} className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 font-medium break-words', !done && 'text-foreground')}>
            <span className="sr-only">{isIn ? 'Khoản thu: ' : 'Khoản chi: '}</span>
            <span className={obligation.status === 'cancelled' ? 'line-through' : undefined}>{obligation.label}</span>
            {done && <Badge variant={obligation.status === 'paid' ? 'success' : 'neutral'}>{STATUS_TEXT[obligation.status]}</Badge>}
            {overdue && <Badge variant="danger">Quá hạn</Badge>}
            {obligation.importedFrom && <Badge variant="neutral">Từ file</Badge>}
          </h4>
          {obligation.note && <p className="text-[0.8125rem] break-words text-muted-foreground">{obligation.note}</p>}

          {partial && (
            <div className="mt-2 grid max-w-md gap-1">
              <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={cn('h-full rounded-full', isIn ? 'bg-ok' : 'bg-primary')} style={{ width: `${percent}%` }} />
              </div>
              <p className="num text-xs text-muted-foreground">
                Đã {verb} {formatVnd(paid)} / {formatVnd(obligation.amount)}
                {!done && <> · còn {formatVnd(left)} đưa vào dự báo</>}
              </p>
              <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {obligation.payments.map((p) => (
                  <li key={p.id} className="num flex items-center gap-1">
                    {formatDate(p.date)}: {formatVnd(p.amount)}
                    <button
                      type="button"
                      className="rounded px-1 font-medium text-destructive hover:underline"
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
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setMode('reschedule')}>
                <CalendarClock aria-hidden="true" />
                Đổi ngày
              </Button>
              <Button size="sm" variant="ghost" onClick={settleOnCutoff}>
                <CircleCheck aria-hidden="true" />
                Đã {verb}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-start gap-1">
        <p className={cn('num pt-0.5 text-right font-semibold whitespace-nowrap', !done && (isIn ? 'text-ok' : 'text-foreground'))}>
          <span aria-hidden="true">{isIn ? '+' : '−'}</span>
          {formatVnd(done ? obligation.amount : left)}
        </p>
        <Menu>
          <MenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="-my-1" aria-label={`Thao tác với “${obligation.label}”`}>
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </MenuTrigger>
          <MenuContent>
            {!done && !overdue && (
              <MenuItem onSelect={() => setMode('pay')}>
                <CircleCheck aria-hidden="true" />
                Ghi nhận đã {verb}
              </MenuItem>
            )}
            <MenuItem onSelect={() => setMode('edit')}>
              <PencilLine aria-hidden="true" />
              Sửa
            </MenuItem>
            {obligation.status === 'open' ? (
              <MenuItem onSelect={() => void save({ ...obligation, status: 'cancelled' })}>
                <CircleSlash aria-hidden="true" />
                Hủy khoản
              </MenuItem>
            ) : (
              // A fully paid line has nothing left to reopen; remove a payment instead.
              !(obligation.status === 'paid' && isZero(left)) && (
                <MenuItem onSelect={() => void save({ ...obligation, status: 'open' })}>
                  <RotateCcw aria-hidden="true" />
                  Mở lại
                </MenuItem>
              )
            )}
            <MenuSeparator />
            <MenuItem tone="danger" onSelect={() => setConfirmDelete(true)}>
              <Trash2 aria-hidden="true" />
              Xóa
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>

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
