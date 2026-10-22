import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { useShop } from '@/app/use-shop'
import { MoneyInput } from '@/components/MoneyInput'
import { FieldError } from '@/components/fields'
import { formatDate, isValidIsoDate } from '@/lib/date'
import { newId } from '@/lib/id'
import { compareMoney, formatVnd, isZero } from '@/lib/money'
import { forecastStart, paidTotal, remaining } from '@/lib/shop'
import type { Obligation } from '@/lib/shop'
import { ObligationForm } from './ObligationForm'

const STATUS_TEXT = { open: 'Còn mở', paid: 'Đã xong', cancelled: 'Đã hủy' } as const

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
    <form onSubmit={submit} noValidate className="mt-3 grid gap-3 rounded-lg bg-paper-2/80 p-3 sm:grid-cols-[minmax(0,12rem)_11rem_auto] sm:items-start">
      <div>
        <label htmlFor={`${uid}-amount`} className="mb-1 block text-xs font-semibold">
          Số tiền đã {verb}
        </label>
        <MoneyInput
          id={`${uid}-amount`}
          value={amount}
          onValueChange={setAmount}
          error={showErrors ? errors.amount : undefined}
          className="h-10 bg-card"
        />
      </div>
      <div>
        <label htmlFor={`${uid}-date`} className="mb-1 block text-xs font-semibold">
          Ngày {verb}
        </label>
        <input
          id={`${uid}-date`}
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          aria-invalid={showErrors && errors.date ? true : undefined}
          aria-describedby={showErrors && errors.date ? `${uid}-date-error` : undefined}
          className="h-10 w-full rounded-md border border-input bg-card px-3 aria-invalid:border-destructive"
        />
        <FieldError id={`${uid}-date-error`} message={showErrors ? errors.date : undefined} />
      </div>
      <div className="flex gap-2 sm:pt-5">
        <button type="submit" className="h-10 rounded-md bg-ink px-4 text-sm font-semibold text-paper">
          Ghi nhận
        </button>
        <button type="button" onClick={onDone} className="h-10 rounded-md px-3 text-sm font-medium hover:bg-paper-3/60">
          Hủy
        </button>
      </div>
    </form>
  )
}

/** One line of the ledger: what it is, what is still to move, partial progress, and its actions. */
export function ObligationEntry({ obligation, overdue = false }: { obligation: Obligation; overdue?: boolean }) {
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
  const percent = isZero(obligation.amount)
    ? 0
    : Number((BigInt(paid) * 1000n) / BigInt(obligation.amount)) / 10 // display only
  const verb = isIn ? 'thu' : 'trả'
  const save = (o: Obligation) => write((r) => r.saveObligation(o))

  const action = 'rounded px-1.5 py-1 text-sm font-semibold underline-offset-4 hover:underline'

  if (mode === 'edit') {
    return (
      <div className="rounded-lg border-2 border-magenta/50 bg-card p-4">
        <p className="eyebrow mb-3">Sửa khoản</p>
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
    )
  }

  return (
    <article
      aria-labelledby={`${uid}-label`}
      className={`relative grid gap-1 border-l-4 py-3 pr-1 pl-4 ${
        done ? 'border-ink/20 opacity-75' : isIn ? 'border-jade' : 'border-ink'
      } ${overdue ? 'bg-destructive/[0.06]' : ''}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h4 id={`${uid}-label`} className={`font-semibold break-words ${obligation.status === 'cancelled' ? 'line-through' : ''}`}>
            <span className="sr-only">{isIn ? 'Khoản thu: ' : 'Khoản chi: '}</span>
            {obligation.label}
          </h4>
          {obligation.note && <p className="text-sm break-words text-ink-3">{obligation.note}</p>}
        </div>
        <p className={`figure text-2xl font-bold whitespace-nowrap ${isIn ? 'text-jade' : 'text-ink'}`}>
          <span aria-hidden="true">{isIn ? '+' : '−'}</span>
          {formatVnd(done ? obligation.amount : left)}
          {done && <span className="ml-2 align-middle font-sans text-xs font-semibold tracking-normal text-ink-3">{STATUS_TEXT[obligation.status]}</span>}
        </p>
      </div>

      {partial && (
        <div className="grid gap-1">
          <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-paper-3">
            <div className={`h-full rounded-full ${isIn ? 'bg-jade' : 'bg-ink-2'}`} style={{ width: `${percent}%` }} />
          </div>
          <p className="text-xs text-ink-3">
            Đã {verb} {formatVnd(paid)} / {formatVnd(obligation.amount)}
            {!done && <> · còn {formatVnd(left)} đưa vào dự báo</>}
          </p>
          <ul className="flex flex-wrap gap-x-3 text-xs text-ink-3">
            {obligation.payments.map((p) => (
              <li key={p.id} className="flex items-center gap-1">
                {formatDate(p.date)}: {formatVnd(p.amount)}
                <button
                  type="button"
                  className="rounded px-1 font-semibold text-destructive hover:underline"
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

      {mode === 'reschedule' && (
        <RescheduleForm
          minDate={minDate}
          onCancel={() => setMode('view')}
          onSave={async (date) => {
            if (await save({ ...obligation, date })) setMode('view')
          }}
        />
      )}
      {mode === 'pay' && <PaymentForm obligation={obligation} onDone={() => setMode('view')} />}

      {mode === 'view' && (
        <div className="-ml-1.5 flex flex-wrap items-center gap-x-1 gap-y-1">
          {overdue && (
            <button type="button" className={`${action} text-destructive`} onClick={() => setMode('reschedule')}>
              Đổi ngày
            </button>
          )}
          {overdue && (
            <button
              type="button"
              className={action}
              onClick={() =>
                void save({
                  ...obligation,
                  status: 'paid',
                  payments: [...obligation.payments, { id: newId(), amount: left, date: balance!.cutoff }],
                })
              }
            >
              Đã {verb}
            </button>
          )}
          {!done && !overdue && (
            <button type="button" className={action} onClick={() => setMode('pay')}>
              Ghi nhận đã {verb}
            </button>
          )}
          <button type="button" className={action} onClick={() => setMode('edit')}>
            Sửa
          </button>
          {obligation.status === 'open' ? (
            <button type="button" className={action} onClick={() => void save({ ...obligation, status: 'cancelled' })}>
              Hủy khoản
            </button>
          ) : (
            // A fully paid line has nothing left to reopen; remove a payment instead.
            !(obligation.status === 'paid' && isZero(left)) && (
              <button type="button" className={action} onClick={() => void save({ ...obligation, status: 'open' })}>
                Mở lại
              </button>
            )
          )}
          {confirmDelete ? (
            <button
              type="button"
              className={`${action} bg-destructive text-white`}
              onBlur={() => setConfirmDelete(false)}
              onClick={() => void write((r) => r.deleteObligation(obligation.id))}
            >
              Bấm lần nữa để xóa
            </button>
          ) : (
            <button type="button" className={`${action} text-destructive`} onClick={() => setConfirmDelete(true)}>
              Xóa
            </button>
          )}
        </div>
      )}
    </article>
  )
}

function RescheduleForm({ minDate, onSave, onCancel }: { minDate?: string; onSave: (date: string) => void; onCancel: () => void }) {
  const uid = useId()
  const [date, setDate] = useState(minDate ?? '')
  const [error, setError] = useState<string>()
  return (
    <form
      noValidate
      className="mt-2 flex flex-wrap items-start gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!isValidIsoDate(date)) return setError('Chọn ngày mới')
        if (minDate && date < minDate) return setError(`Chọn từ ${formatDate(minDate)} trở đi`)
        onSave(date)
      }}
    >
      <div>
        <label htmlFor={`${uid}-date`} className="mb-1 block text-xs font-semibold">
          Ngày dự kiến mới
        </label>
        <input
          id={`${uid}-date`}
          type="date"
          value={date}
          min={minDate}
          autoFocus
          onChange={(e) => setDate(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${uid}-date-error` : undefined}
          className="h-10 rounded-md border border-input bg-card px-3 aria-invalid:border-destructive"
        />
        <FieldError id={`${uid}-date-error`} message={error} />
      </div>
      <div className="flex gap-2 pt-5">
        <button type="submit" className="h-10 rounded-md bg-ink px-4 text-sm font-semibold text-paper">
          Lưu ngày mới
        </button>
        <button type="button" onClick={onCancel} className="h-10 rounded-md px-3 text-sm font-medium hover:bg-paper-3/60">
          Hủy
        </button>
      </div>
    </form>
  )
}
