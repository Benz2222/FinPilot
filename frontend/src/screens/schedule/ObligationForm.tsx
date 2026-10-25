import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { useShop } from '@/app/use-shop'
import { MoneyInput } from '@/components/MoneyInput'
import { Button } from '@astryxdesign/core/Button'
import { Chip, DateInput, DirectionToggle, Field, FieldLabel, TextField } from '@/components/fields'
import { addDays, formatDayMonth, isValidIsoDate } from '@/lib/date'
import { MAX_MONEY_DIGITS } from '@/lib/money'
import { validateDraft } from '@/lib/shop'
import type { ObligationDraft } from '@/lib/shop'

const NAME_CHIPS = {
  Out: ['Nhập hàng', 'Lương', 'Thuê mặt bằng', 'Quảng cáo', 'Phí ship'],
  In: ['Tiền sàn', 'COD', 'Khách trả nợ'],
} as const

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
                className="fp-input-lg"
              />
            </div>
            <Button
              type="button"
              size="lg"
              label="000"
              tooltip="Thêm ba số 0"
              aria-label="Thêm ba số 0"
              isDisabled={!draft.amount || draft.amount.length + 3 > MAX_MONEY_DIGITS}
              onClick={() => setDraft({ ...draft, amount: `${draft.amount}000` })}
              className="num"
            />
          </div>
        </div>

        <div className="min-w-0">
          <TextField
            id={id('label')}
            label="Nội dung"
            value={draft.label}
            maxLength={200}
            autoComplete="off"
            placeholder="VD: Nhập hàng, lương, tiền sàn…"
            onChange={(label) => setDraft({ ...draft, label })}
            error={visible.label}
          />
          {chips.length > 0 && (
            <div role="group" aria-label="Gợi ý nội dung" className="mt-2 flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <Chip key={c} pressed={draft.label === c} onClick={() => setDraft({ ...draft, label: c })}>
                  {c}
                </Chip>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <Field id={id('date')} label="Ngày dự kiến" error={visible.date}>
            <DateInput
              id={id('date')}
              value={draft.date}
              min={minDate}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              invalid={Boolean(visible.date)}
              describedBy={`${id('date')}-error`}
            />
          </Field>
          <div role="group" aria-label="Chọn nhanh ngày" className="mt-2 flex flex-wrap gap-1.5">
            {shortcuts.map((s) => (
              <Chip key={s.label} pressed={draft.date === s.date} onClick={() => setDraft({ ...draft, date: s.date })}>
                {s.label} <span className="num font-normal text-secondary">{formatDayMonth(s.date)}</span>
              </Chip>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <TextField id={id('note')} label="Ghi chú" isOptional value={draft.note} maxLength={500} autoComplete="off" onChange={(note) => setDraft({ ...draft, note })} />
        </div>

        {showErrors && Object.keys(errors).length > 0 && (
          <p role="alert" className="text-sm font-medium text-shortage @xl:col-span-2">
            Còn {Object.keys(errors).length} ô cần điền đúng trước khi lưu.
          </p>
        )}

        <div className="flex gap-2 @xl:col-span-2 @xl:justify-end">
          {onCancel && <Button type="button" variant="secondary" size="lg" label="Hủy" onClick={onCancel} />}
          <Button type="submit" variant="primary" size="lg" label={submitLabel} className="flex-1 @xl:flex-none" />
        </div>
      </div>
    </form>
  )
}
