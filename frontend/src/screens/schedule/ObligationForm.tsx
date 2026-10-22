import { useId, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useShop } from '@/app/use-shop'
import { MoneyInput } from '@/components/MoneyInput'
import { DirectionToggle, FieldError, TextField } from '@/components/fields'
import { addDays, formatDayMonth, isValidIsoDate } from '@/lib/date'
import { MAX_MONEY_DIGITS } from '@/lib/money'
import { validateDraft } from '@/lib/shop'
import type { ObligationDraft } from '@/lib/shop'

const NAME_CHIPS = {
  Out: ['Nhập hàng', 'Lương', 'Thuê mặt bằng', 'Quảng cáo', 'Phí ship'],
  In: ['Tiền sàn', 'COD', 'Khách trả nợ'],
} as const

const Word = ({ children }: { children: ReactNode }) => (
  <span className="font-serif text-lg text-ink-2 italic sm:text-xl">{children}</span>
)

const chip =
  'rounded-full border px-3 py-1 text-sm font-medium transition-colors aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper border-ink/20 bg-paper hover:border-ink'

/**
 * One obligation written as the owner would say it: "Shop sẽ [chi ra] [số tiền] cho [nội dung] vào [ngày]".
 * Amount first, with a 000 key, name chips and date shortcuts so a phone user rarely types more than digits.
 * Missing fields are errors, never zero.
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
    errors.date = 'Ngày này đã nằm trong số dư chốt; chọn từ ngày bắt đầu dự báo'
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
    <form onSubmit={submit} noValidate className="grid gap-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
        <Word>Shop sẽ</Word>
        <DirectionToggle
          name={id('direction')}
          legend="Loại khoản"
          value={draft.direction}
          onChange={(direction) => setDraft({ ...draft, direction })}
          error={visible.direction}
        />
      </div>

      <div>
        <label htmlFor={id('amount')} className="mb-1.5 block text-sm font-semibold">
          Số tiền
        </label>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 sm:max-w-sm">
            <MoneyInput
              id={id('amount')}
              value={draft.amount}
              onValueChange={(amount) => setDraft({ ...draft, amount })}
              error={visible.amount}
              placeholder="0"
              className="figure h-14 bg-card text-3xl! font-bold"
            />
          </div>
          <button
            type="button"
            aria-label="Thêm ba số 0"
            disabled={!draft.amount || draft.amount.length + 3 > MAX_MONEY_DIGITS}
            onClick={() => setDraft({ ...draft, amount: `${draft.amount}000` })}
            className="figure h-14 shrink-0 rounded-md border border-ink/25 bg-paper-2 px-4 text-2xl font-bold hover:bg-paper-3 disabled:opacity-50"
          >
            000
          </button>
        </div>
      </div>

      <div>
        <label htmlFor={id('label')} className="mb-1.5 flex items-baseline gap-2 text-sm font-semibold">
          <Word>cho</Word> Nội dung
        </label>
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

      <div>
        <label htmlFor={id('date')} className="mb-1.5 flex items-baseline gap-2 text-sm font-semibold">
          <Word>vào</Word> Ngày dự kiến
        </label>
        <div className="flex flex-wrap items-start gap-2">
          <div role="group" aria-label="Chọn nhanh ngày" className="flex flex-wrap gap-1.5">
            {shortcuts.map((s) => (
              <button
                key={s.label}
                type="button"
                aria-pressed={draft.date === s.date}
                className={`${chip} h-10`}
                onClick={() => setDraft({ ...draft, date: s.date })}
              >
                {s.label} <span className="text-xs opacity-80">{formatDayMonth(s.date)}</span>
              </button>
            ))}
          </div>
          <div className="w-[11.5rem]">
            <input
              id={id('date')}
              type="date"
              value={draft.date}
              min={minDate}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              aria-invalid={visible.date ? true : undefined}
              aria-describedby={visible.date ? `${id('date')}-error` : undefined}
              className="h-10 w-full rounded-md border border-input bg-card px-3 text-base aria-invalid:border-destructive"
            />
          </div>
        </div>
        <FieldError id={`${id('date')}-error`} message={visible.date} />
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <label htmlFor={id('note')} className="mb-1 block text-xs font-semibold text-ink-3">
            Ghi chú (không bắt buộc)
          </label>
          <TextField id={id('note')} value={draft.note} maxLength={500} autoComplete="off" onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="h-11 flex-1 rounded-md bg-magenta px-5 font-semibold text-white hover:bg-[#951c5b] sm:flex-none">
            {submitLabel}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="h-11 rounded-md px-3 font-medium text-ink-2 hover:bg-paper-2">
              Hủy
            </button>
          )}
        </div>
      </div>
      {showErrors && Object.keys(errors).length > 0 && (
        <p role="alert" className="text-sm font-medium text-destructive">
          Còn {Object.keys(errors).length} ô cần điền đúng trước khi lưu.
        </p>
      )}
    </form>
  )
}
