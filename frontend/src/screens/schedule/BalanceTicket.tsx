import { useState } from 'react'
import type { FormEvent } from 'react'
import { PencilLine } from 'lucide-react'
import { useShop } from '@/app/use-shop'
import { demoShop } from '@/lib/demo'
import { MoneyInput } from '@/components/MoneyInput'
import { FieldError } from '@/components/fields'
import { addDays, formatDate, formatWeekday, isValidIsoDate } from '@/lib/date'
import { formatVnd } from '@/lib/money'

/** The confirmed closing balance, drawn as a stamped bank slip. Editing turns the slip into its own form. */
export function BalanceTicket() {
  const { data, write, today } = useShop()
  const balance = data?.balance ?? null
  const [editing, setEditing] = useState(false)
  const [amount, setAmount] = useState('')
  const [cutoff, setCutoff] = useState(() => addDays(today, -1))
  const [showErrors, setShowErrors] = useState(false)

  const open = editing || !balance
  const errors = {
    amount: /^\d+$/.test(amount) ? undefined : 'Nhập số dư (có thể là 0)',
    cutoff: !isValidIsoDate(cutoff) ? 'Chọn ngày chốt' : cutoff > today ? 'Ngày chốt không được sau hôm nay' : undefined,
  }

  function start() {
    setAmount(balance?.amount ?? '')
    setCutoff(balance?.cutoff ?? addDays(today, -1))
    setShowErrors(false)
    setEditing(true)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (errors.amount || errors.cutoff) {
      setShowErrors(true)
      return
    }
    if (await write((r) => r.setBalance({ amount, cutoff }))) setEditing(false)
  }

  if (!open && balance) {
    return (
      <section aria-labelledby="balance-title" className="relative">
        <div className="perforated relative overflow-hidden rounded-xl bg-ink px-5 pt-7 pb-5 text-paper shadow-[0_24px_60px_-30px_rgb(16_27_51/0.7)] sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div className="min-w-0">
              <h2 id="balance-title" className="eyebrow text-paper/75!">
                Số dư đã xác nhận · cuối ngày {formatDate(balance.cutoff)}
              </h2>
              <p className="figure mt-1 text-5xl leading-none font-bold break-all sm:text-6xl">{formatVnd(balance.amount)}</p>
              <p className="mt-3 max-w-xl text-sm text-paper/80">
                Đã gồm mọi khoản thu/chi đến hết {formatWeekday(balance.cutoff).toLowerCase()} {formatDate(balance.cutoff)}. Dự báo
                bắt đầu từ <strong className="text-paper">{formatDate(addDays(balance.cutoff, 1))}</strong>; khoản nào còn mở trước
                ngày đó cần ngày mới.
              </p>
            </div>
            <button
              type="button"
              onClick={start}
              className="inline-flex items-center gap-2 rounded-md border border-paper/40 px-3 py-2 text-sm font-semibold hover:bg-paper/10"
            >
              <PencilLine aria-hidden="true" className="size-4" />
              Cập nhật số dư
            </button>
          </div>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-4 right-5 hidden rotate-[-8deg] rounded border-2 border-[#ff6ab5]/70 px-2 py-0.5 font-display text-sm font-bold tracking-[0.2em] text-[#ff8cc4] uppercase sm:block"
          >
            Đã chốt {formatDate(balance.cutoff).slice(0, 5)}
          </span>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="balance-form-title" className="rounded-xl border-2 border-dashed border-ink/30 bg-card p-5 sm:p-7">
      <p className="eyebrow">{balance ? 'Cập nhật số dư' : 'Bắt đầu ở đây'}</p>
      <h2 id="balance-form-title" className="mt-1 font-display text-3xl font-bold">
        {balance ? 'Số dư đã xác nhận' : 'Nhập số dư hôm nay'}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">
        Cộng tiền ngân hàng và tiền mặt <strong>đã về</strong>, tính đến cuối ngày hôm qua (tức đầu ngày hôm nay). Không tính tiền sàn,
        COD còn đang chờ: những khoản đó nhập ở dưới như khoản sắp thu.
      </p>
      <form onSubmit={submit} noValidate className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-start">
        <div>
          <label htmlFor="balance-amount" className="mb-1.5 block text-sm font-semibold">
            Số dư cuối ngày chốt
          </label>
          <MoneyInput
            id="balance-amount"
            value={amount}
            onValueChange={setAmount}
            error={showErrors ? errors.amount : undefined}
            placeholder="VD: 50.000.000"
            className="h-12 bg-card text-xl font-semibold"
          />
        </div>
        <div>
          <label htmlFor="balance-cutoff" className="mb-1.5 block text-sm font-semibold">
            Ngày chốt
          </label>
          <input
            id="balance-cutoff"
            type="date"
            value={cutoff}
            max={today}
            onChange={(e) => setCutoff(e.target.value)}
            aria-invalid={showErrors && errors.cutoff ? true : undefined}
            aria-describedby={showErrors && errors.cutoff ? 'balance-cutoff-error' : undefined}
            className="h-12 w-full rounded-md border border-input bg-card px-3 text-base aria-invalid:border-destructive"
          />
          <FieldError id="balance-cutoff-error" message={showErrors ? errors.cutoff : undefined} />
        </div>
        <div className="flex gap-2 sm:pt-7">
          <button type="submit" className="h-12 rounded-md bg-ink px-5 font-semibold text-paper hover:bg-ink-2">
            Lưu số dư
          </button>
          {balance && (
            <button type="button" onClick={() => setEditing(false)} className="h-12 rounded-md px-3 font-medium text-ink-2 hover:bg-paper-2">
              Hủy
            </button>
          )}
        </div>
      </form>
      {!balance && (
        <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-dashed border-ink/25 pt-4 text-sm text-ink-2">
          Chưa sẵn số liệu?
          <button
            type="button"
            onClick={() => void write((r) => r.replaceAll(demoShop(today)))}
            className="rounded-md border border-ink/25 bg-paper px-3 py-1.5 font-semibold text-ink hover:border-ink"
          >
            Xem ví dụ shop mẫu
          </button>
          <a href="#nhap-file" className="rounded-md border border-ink/25 bg-paper px-3 py-1.5 font-semibold text-ink hover:border-ink">
            Nhập từ file Excel/CSV
          </a>
        </p>
      )}
    </section>
  )
}
