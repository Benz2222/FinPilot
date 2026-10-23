import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { useShop } from '@/app/use-shop'
import { MoneyInput } from '@/components/MoneyInput'
import { DateInput, DirectionToggle, FieldError, FieldLabel, TextField } from '@/components/fields'
import { Button } from '@/components/ui/button'
import { addDays, formatDayMonth, isValidIsoDate } from '@/lib/date'
import { MAX_MONEY_DIGITS } from '@/lib/money'
import { validateDraft } from '@/lib/shop'
import type { ObligationDraft } from '@/lib/shop'

const NAME_CHIPS = {
  Out: ['Nhập hàng', 'Lương', 'Thuê mặt bằng', 'Quảng cáo', 'Phí ship'],
  In: ['Tiền sàn', 'COD', 'Khách trả nợ'],
} as const

const chip =
  'inline-flex h-9 items-center gap-1.5 rounded-full border border-input/70 bg-glass px-3 text-[0.8125rem] font-medium text-secondary-foreground transition-colors hover:border-input hover:text-foreground aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-primary'

/**
 * One obligation: direction, amount, what it is and when. Amount first, with a 000 key, name chips and date
 * shortcuts so a phone user rarely types more than digits. Missing fields are errors, never zero.
 * Lays out in one column when narrow (side panel) and two when wide (inline edit).
 */
export function ObligationForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  minDate,
}: {
  initial: ObligationDraft
  submitLabel: string
  onSubmit: (draft: ObligationDraft) => Promise<boolean>
  onCancel?: () => void
  /** Dates before this are flagged (they would land before the forecast starts). */
  minDate?: string
}) {
  const { today } = useShop()
  const uid = useId()
  const [draft, setDraft] = useState(initial)
  const [showErrors, setShowErrors] = useState(false)
  const errors = validateDraft(draft)
  if (!errors.date && minDate && isValidIsoDate(draft.date) && draft.date < minDate) {
    errors.date = `Ngày này đã tính trong số dư hiện có. Chọn từ ${formatDayMonth(minDate)} trở đi`
  }
  const visible = showErrors ? errors : {}
  const id = (name: string) => `${uid}-${name}`
  const shortcuts = [
    { label: 'Hôm nay', date: today },
    { label: '+7 ngày', date: addDays(today, 7) },
    { label: '+14 ngày', date: addDays(today, 14) },
  ].filter((s) => !minDate || s.date >= minDate)
  const chips = draft.direction ? NAME_CHIPS[draft.direction] : []

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (Object.keys(errors).length > 0) {
      setShowErrors(true)
      const form = e.currentTarget
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    if (await onSubmit({ ...draft, label: draft.label.trim(), note: draft.note.trim() })) {
      setDraft(initial)
      setShowErrors(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="@container">
      <div className="grid gap-4 @xl:grid-cols-2">
        <div className="@xl:col-span-2">
          <DirectionToggle
            name={id('direction')}
            legend="Loại khoản"
            value={draft.direction}
            onChange={(direction) => setDraft({ ...draft, direction })}
            error={visible.direction}
          />
        </div>

        <div className="min-w-0">
          <FieldLabel htmlFor={id('amount')}>Số tiền</FieldLabel>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <MoneyInput
                id={id('amount')}
                value={draft.amount}
                onValueChange={(amount) => setDraft({ ...draft, amount })}
                error={visible.amount}
                placeholder="0"
                className="h-12 text-lg font-semibold sm:h-12 sm:text-lg"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              aria-label="Thêm ba số 0"
              disabled={!draft.amount || draft.amount.length + 3 > MAX_MONEY_DIGITS}
              onClick={() => setDraft({ ...draft, amount: `${draft.amount}000` })}
              className="num h-12 px-3.5 font-semibold"
            >
              000
            </Button>
          </div>
        </div>

        <div className="min-w-0">
          <FieldLabel htmlFor={id('label')}>Nội dung</FieldLabel>
          <TextField
            id={id('label')}
            value={draft.label}
            maxLength={200}
            autoComplete="off"
            placeholder="VD: Nhập hàng, lương, tiền sàn…"
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            error={visible.label}
          />
          {chips.length > 0 && (
            <div role="group" aria-label="Gợi ý nội dung" className="mt-2 flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <button key={c} type="button" aria-pressed={draft.label === c} className={chip} onClick={() => setDraft({ ...draft, label: c })}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <FieldLabel htmlFor={id('date')}>Ngày dự kiến</FieldLabel>
          <DateInput
            id={id('date')}
            value={draft.date}
            min={minDate}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            invalid={Boolean(visible.date)}
            describedBy={`${id('date')}-error`}
          />
          <FieldError id={`${id('date')}-error`} message={visible.date} />
          <div role="group" aria-label="Chọn nhanh ngày" className="mt-2 flex flex-wrap gap-1.5">
            {shortcuts.map((s) => (
              <button key={s.label} type="button" aria-pressed={draft.date === s.date} className={chip} onClick={() => setDraft({ ...draft, date: s.date })}>
                {s.label} <span className="num font-normal text-muted-foreground">{formatDayMonth(s.date)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <FieldLabel htmlFor={id('note')}>
            Ghi chú <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
          </FieldLabel>
          <TextField id={id('note')} value={draft.note} maxLength={500} autoComplete="off" onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
        </div>

        {showErrors && Object.keys(errors).length > 0 && (
          <p role="alert" className="text-sm text-destructive @xl:col-span-2">
            Còn {Object.keys(errors).length} ô cần điền đúng trước khi lưu.
          </p>
        )}

        <div className="flex gap-2 @xl:col-span-2 @xl:justify-end">
          {onCancel && (
            <Button type="button" variant="outline" size="lg" onClick={onCancel}>
              Hủy
            </Button>
          )}
          <Button type="submit" size="lg" className="flex-1 @xl:flex-none">
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  )
}
