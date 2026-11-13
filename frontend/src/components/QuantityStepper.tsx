import { Minus, Plus } from 'lucide-react'
import { parseQuantity } from '@/lib/inventory/calc'

/** Marks a quantity box so Enter can move to the next one in the list. */
const QTY_ATTR = 'data-qty'

/** Focus the quantity box after `current` (Enter on a phone keyboard = "next"). */
function focusNextQuantity(current: HTMLElement) {
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[${QTY_ATTR}]`))
  all[all.indexOf(current) + 1]?.focus()
}

/**
 * A whole-number quantity: − and + around a box you can also type in. Empty means "none". `name` is the product,
 * for the buttons' spoken labels. `min` is what − stops at (0 for a count, where 0 is a real answer).
 */
export function QuantityStepper({
  value,
  onChange,
  name,
  invalid = false,
  placeholder = '0',
  emptyOnZero = true,
}: {
  value: string
  onChange: (value: string) => void
  name: string
  invalid?: boolean
  placeholder?: string
  /** `−` at 1 clears the box (a sale line); off, it goes down to a typed 0 (a count). */
  emptyOnZero?: boolean
}) {
  const n = parseQuantity(value)
  const down = () => {
    if (n === null || n <= 0) return
    onChange(n === 1 && emptyOnZero ? '' : String(n - 1))
  }
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className="fp-step" aria-label={`Bớt một ${name}`} disabled={n === null || n <= 0} onClick={down}>
        <Minus aria-hidden="true" className="size-5" />
      </button>
      <input
        {...{ [QTY_ATTR]: '' }}
        type="text"
        inputMode="numeric"
        enterKeyHint="next"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        aria-label={`Số lượng ${name}`}
        aria-invalid={invalid || undefined}
        className="fp-qty num"
        onChange={(e) => {
          const text = e.target.value.replace(/\s/g, '')
          if (text === '' || /^\d{1,7}$/.test(text)) onChange(text.replace(/^0+(?=\d)/, ''))
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          focusNextQuantity(e.currentTarget)
        }}
        onFocus={(e) => e.currentTarget.select()}
      />
      <button type="button" className="fp-step" aria-label={`Thêm một ${name}`} onClick={() => onChange(String((n ?? 0) + 1))}>
        <Plus aria-hidden="true" className="size-5" />
      </button>
    </div>
  )
}
