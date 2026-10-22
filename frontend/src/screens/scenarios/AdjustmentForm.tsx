import { useId, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { MoneyInput } from '@/components/MoneyInput'
import { FieldError, TextField } from '@/components/fields'
import { formatDayMonth, isValidIsoDate } from '@/lib/date'
import { newId } from '@/lib/id'
import { compareMoney, formatVnd, isZero, subtractMoney } from '@/lib/money'
import type { Adjustment } from '@/lib/shop'
import type { CashEvent } from '@/lib/types'
import type { PresetId } from './describe'
import { PRESETS } from './describe'

const control = 'h-10 w-full rounded-md border border-input bg-card px-3 text-base aria-invalid:border-destructive'

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-xs font-semibold">
        {label}
      </label>
      {children}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  )
}

/** Builds one adjustment of the chosen preset over the real schedule's open lines. */
export function AdjustmentForm({
  preset,
  events,
  start,
  onAdd,
  onCancel,
  initial,
}: {
  /** Suggested starting values (the owner can change every one). */
  initial?: { targetId?: string; amount?: string; date?: string; date2?: string }
  preset: PresetId
  events: CashEvent[]
  start: string
  onAdd: (a: Adjustment) => void
  onCancel: () => void
}) {
  const uid = useId()
  const wantsIn = preset === 'late-receipt'
  const candidates = events.filter((e) => (preset === 'exclude' ? true : wantsIn ? e.direction === 'In' : e.direction === 'Out'))
  const [targetId, setTargetId] = useState(initial?.targetId ?? candidates[0]?.id ?? '')
  const target = candidates.find((e) => e.id === targetId)
  const [amount, setAmount] = useState(initial?.amount ?? '')
  const [date, setDate] = useState(initial?.date ?? start)
  const [date2, setDate2] = useState(initial?.date2 ?? start)
  const [label, setLabel] = useState('Nhập hàng thêm')
  const [showErrors, setShowErrors] = useState(false)
  const title = PRESETS.find((p) => p.id === preset)!.title

  const errors: Record<string, string | undefined> = {}
  if (preset !== 'add' && !target) errors.target = 'Chọn khoản'
  if (preset === 'add') {
    if (!label.trim()) errors.label = 'Nhập nội dung'
    if (!amount || isZero(amount)) errors.amount = 'Nhập số tiền lớn hơn 0'
    if (!isValidIsoDate(date)) errors.date = 'Chọn ngày'
  }
  if ((preset === 'later' || preset === 'late-receipt') && target) {
    if (!isValidIsoDate(date)) errors.date = 'Chọn ngày mới'
    else if (date <= target.date) errors.date = `Chọn sau ${formatDayMonth(target.date)}`
  }
  if (preset === 'less' && target) {
    if (!amount || isZero(amount)) errors.amount = 'Nhập số tiền mới lớn hơn 0'
    else if (compareMoney(amount, target.amount) >= 0) errors.amount = `Phải nhỏ hơn ${formatVnd(target.amount)}`
  }
  if (preset === 'split' && target) {
    if (!amount || isZero(amount)) errors.amount = 'Nhập số tiền đợt 1'
    else if (compareMoney(amount, target.amount) >= 0) errors.amount = `Phải nhỏ hơn ${formatVnd(target.amount)}`
    if (!isValidIsoDate(date)) errors.date = 'Chọn ngày đợt 1'
    if (!isValidIsoDate(date2)) errors.date2 = 'Chọn ngày đợt 2'
  }
  if (date && date < start && !errors.date && preset !== 'exclude' && preset !== 'less') errors.date = 'Chọn từ ngày bắt đầu dự báo'
  const shown = showErrors ? errors : {}
  const rest = preset === 'split' && target && amount && compareMoney(amount, target.amount) < 0 ? subtractMoney(target.amount, amount) : null

  function submit(e: FormEvent) {
    e.preventDefault()
    if (Object.values(errors).some(Boolean)) return setShowErrors(true)
    const id = newId()
    switch (preset) {
      case 'add':
        return onAdd({ kind: 'add', id, direction: 'Out', label: label.trim(), amount, date })
      case 'later':
      case 'late-receipt':
        return onAdd({ kind: 'shift', id, targetId, date })
      case 'less':
        return onAdd({ kind: 'resize', id, targetId, amount })
      case 'exclude':
        return onAdd({ kind: 'exclude', id, targetId })
      case 'split':
        return onAdd({ kind: 'split', id, targetId, parts: [{ id: newId(), amount, date }, { id: newId(), amount: rest!, date: date2 }] })
    }
  }

  const f = (name: string) => `${uid}-${name}`
  const invalid = (name: string) => ({
    'aria-invalid': shown[name] ? true : undefined,
    'aria-describedby': shown[name] ? `${f(name)}-error` : undefined,
  })

  if (preset !== 'add' && candidates.length === 0) {
    return (
      <div className="rounded-lg bg-paper-2 p-4 text-sm">
        <p>Lịch chưa có khoản {wantsIn ? 'thu' : preset === 'exclude' ? '' : 'chi'} nào còn mở để thử.</p>
        <button type="button" onClick={onCancel} className="mt-2 font-semibold underline underline-offset-4">
          Đóng
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-3 rounded-lg border-2 border-ink bg-card p-4" aria-label={title}>
      <p className="font-display text-xl font-bold">{title}</p>
      {initial && <p className="-mt-2 text-xs text-ink-3">Số gợi ý để bắt đầu; sửa tùy ý trước khi thêm.</p>}
      {preset === 'add' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id={f('label')} label="Nội dung" error={shown.label}>
            <TextField id={f('label')} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={200} {...invalid('label')} />
          </Field>
          <Field id={f('amount')} label="Số tiền" error={undefined}>
            <MoneyInput id={f('amount')} value={amount} onValueChange={setAmount} error={shown.amount} className="h-10 bg-card" />
          </Field>
          <Field id={f('date')} label="Ngày chi" error={shown.date}>
            <input id={f('date')} type="date" min={start} value={date} onChange={(e) => setDate(e.target.value)} className={control} {...invalid('date')} />
          </Field>
        </div>
      ) : (
        <Field id={f('target')} label={wantsIn ? 'Khoản thu' : 'Khoản'} error={shown.target}>
          <select id={f('target')} value={targetId} onChange={(e) => setTargetId(e.target.value)} className={control} {...invalid('target')}>
            {candidates.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label} · {formatVnd(e.amount)} · {formatDayMonth(e.date)}
              </option>
            ))}
          </select>
        </Field>
      )}

      {(preset === 'later' || preset === 'late-receipt') && (
        <Field id={f('date')} label={wantsIn ? 'Giả sử tiền về ngày' : 'Ngày chi mới'} error={shown.date}>
          <input id={f('date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} className={control} {...invalid('date')} />
        </Field>
      )}
      {preset === 'less' && (
        <Field id={f('amount')} label="Số tiền mới" error={undefined}>
          <MoneyInput id={f('amount')} value={amount} onValueChange={setAmount} error={shown.amount} className="h-10 bg-card" />
        </Field>
      )}
      {preset === 'split' && target && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id={f('amount')} label="Đợt 1: số tiền" error={undefined}>
            <MoneyInput id={f('amount')} value={amount} onValueChange={setAmount} error={shown.amount} className="h-10 bg-card" />
          </Field>
          <Field id={f('date')} label="Đợt 1: ngày" error={shown.date}>
            <input id={f('date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} className={control} {...invalid('date')} />
          </Field>
          <div className="min-w-0">
            <p className="mb-1 text-xs font-semibold">Đợt 2: phần còn lại</p>
            <p className="figure flex h-10 items-center rounded-md bg-paper-2 px-3 text-lg font-bold" aria-live="polite">
              {rest ? formatVnd(rest) : '—'}
            </p>
          </div>
          <Field id={f('date2')} label="Đợt 2: ngày" error={shown.date2}>
            <input id={f('date2')} type="date" value={date2} onChange={(e) => setDate2(e.target.value)} className={control} {...invalid('date2')} />
          </Field>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="h-10 rounded-md bg-ink px-4 font-semibold text-paper">
          Thêm giả định
        </button>
        <button type="button" onClick={onCancel} className="h-10 rounded-md px-3 font-medium hover:bg-paper-2">
          Hủy
        </button>
      </div>
    </form>
  )
}
