import { useState } from 'react'
import type { FormEvent } from 'react'
import { FileSpreadsheet, PencilLine, Sparkles } from 'lucide-react'
import { useShop } from '@/app/use-shop'
import { demoShop } from '@/lib/demo'
import { MoneyInput } from '@/components/MoneyInput'
import { DateInput, Field, FieldLabel } from '@/components/fields'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Readout, ReadoutPanel } from '@/components/readout'
import { addDays, formatDate, isValidIsoDate } from '@/lib/date'
import { formatVnd } from '@/lib/money'
import type { Money } from '@/lib/types'

/**
 * The confirmed closing balance next to what is still to come in and go out. Editing (or having no balance yet)
 * turns it into the balance form.
 */
export function BalanceTicket({ totalIn, totalOut, countIn, countOut }: { totalIn: Money; totalOut: Money; countIn: number; countOut: number }) {
  const { data, write, today } = useShop()
  const balance = data?.balance ?? null
  const [editing, setEditing] = useState(false)
  const [amount, setAmount] = useState('')
  const [cutoff, setCutoff] = useState(() => addDays(today, -1))
  const [showErrors, setShowErrors] = useState(false)

  const open = editing || !balance
  const errors = {
    amount: /^\d+$/.test(amount) ? undefined : 'Nhập số dư (có thể là 0)',
    cutoff: !isValidIsoDate(cutoff) ? 'Chọn ngày' : cutoff > today ? 'Không chọn ngày sau hôm nay' : undefined,
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
      <section aria-labelledby="balance-title" className="grid gap-2">
        <h2 id="balance-title" className="sr-only">
          Số dư và các khoản sắp tới
        </h2>
        <ReadoutPanel className="sm:grid-cols-3">
          <Readout
            label="Số dư hiện có"
            signal="info"
            value={formatVnd(balance.amount)}
            sub={`Tính đến hết ngày ${formatDate(balance.cutoff)}`}
            action={
              <Button variant="ghost" size="sm" className="-my-2 -mr-2 text-primary hover:text-primary" onClick={start}>
                <PencilLine aria-hidden="true" />
                Cập nhật số dư
              </Button>
            }
          />
          <Readout label="Sắp thu" signal={countIn ? 'ok' : 'idle'} value={countIn ? `+${formatVnd(totalIn)}` : formatVnd(totalIn)} valueClassName={countIn ? 'text-ok' : undefined} sub={`${countIn} khoản chưa thu`} />
          <Readout label="Sắp chi" signal="idle" value={countOut ? `−${formatVnd(totalOut)}` : formatVnd(totalOut)} sub={`${countOut} khoản chưa trả`} />
        </ReadoutPanel>
        <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
          Số dư này đã gồm mọi khoản thu, chi đến hết ngày {formatDate(balance.cutoff)}. Dự báo tính từ{' '}
          <span className="num font-medium text-foreground">{formatDate(addDays(balance.cutoff, 1))}</span>; khoản nào hẹn trước ngày đó mà chưa xong sẽ cần ngày mới.
        </p>
      </section>
    )
  }

  return (
    <Card>
      <section aria-labelledby="balance-form-title" className="p-4 sm:p-6">
        <p className="placard text-primary">{balance ? 'Số dư' : 'Bước 1 / 2'}</p>
        <h2 id="balance-form-title" className="mt-2 text-lg font-semibold">
          {balance ? 'Cập nhật số dư hiện có' : 'Bắt đầu: nhập số dư hôm nay'}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Cộng tiền ngân hàng và tiền mặt <strong className="font-medium text-foreground">đã về</strong>, tính đến cuối ngày hôm qua (tức đầu ngày hôm nay).
          Không tính tiền sàn, COD còn đang chờ: những khoản đó nhập ở dưới như khoản sắp thu.
        </p>
        <form onSubmit={submit} noValidate className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_13rem_auto] sm:items-start">
          <div className="min-w-0">
            <FieldLabel htmlFor="balance-amount">Số dư hiện có (ngân hàng + tiền mặt)</FieldLabel>
            <MoneyInput
              id="balance-amount"
              value={amount}
              onValueChange={setAmount}
              error={showErrors ? errors.amount : undefined}
              placeholder="VD: 50.000.000"
              className="h-12 text-lg font-semibold sm:h-12 sm:text-lg"
            />
          </div>
          <Field id="balance-cutoff" label="Tính đến hết ngày" error={showErrors ? errors.cutoff : undefined}>
            <DateInput
              id="balance-cutoff"
              value={cutoff}
              max={today}
              onChange={(e) => setCutoff(e.target.value)}
              invalid={showErrors && Boolean(errors.cutoff)}
              describedBy="balance-cutoff-error"
              className="h-12 sm:h-12"
            />
          </Field>
          <div className="flex gap-2 sm:pt-7">
            <Button type="submit" size="lg" className="flex-1 sm:flex-none">
              Lưu số dư
            </Button>
            {balance && (
              <Button type="button" variant="ghost" size="lg" onClick={() => setEditing(false)}>
                Hủy
              </Button>
            )}
          </div>
        </form>
        {!balance && (
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-4 text-sm text-muted-foreground">
            Chưa sẵn số liệu?
            <Button type="button" variant="outline" size="sm" onClick={() => void write((r) => r.replaceAll(demoShop(today)))}>
              <Sparkles aria-hidden="true" />
              Xem ví dụ shop mẫu
            </Button>
            <a href="#nhap-file" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <FileSpreadsheet aria-hidden="true" />
              Nhập từ file Excel/CSV
            </a>
          </div>
        )}
      </section>
    </Card>
  )
}
