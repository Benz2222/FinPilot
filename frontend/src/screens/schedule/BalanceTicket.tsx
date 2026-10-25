import { useState } from 'react'
import type { FormEvent } from 'react'
import { FileSpreadsheet, PencilLine, Sparkles } from 'lucide-react'
import { useShop } from '@/app/use-shop'
import { demoShop } from '@/lib/demo'
import { MoneyInput } from '@/components/MoneyInput'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { DateInput, Field, FieldLabel } from '@/components/fields'
import { Panel } from '@/components/page'
import { StatGrid, StatTile } from '@/components/readout'
import { addDays, formatDate, isValidIsoDate } from '@/lib/date'
import { formatVnd, isNegative } from '@/lib/money'
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
      <section aria-labelledby="balance-title">
        <h2 id="balance-title" className="sr-only">
          Số dư và các khoản sắp tới
        </h2>
        <StatGrid className="sm:grid-cols-3">
          <StatTile
            label="Số dư hiện có"
            value={formatVnd(balance.amount)}
            negative={isNegative(balance.amount)}
            sub={`Tính đến hết ngày ${formatDate(balance.cutoff)}`}
            action={<Button variant="secondary" size="sm" label="Cập nhật số dư" icon={<Icon icon={PencilLine} />} onClick={start} />}
          />
          <StatTile label="Sắp thu" value={countIn ? `+${formatVnd(totalIn)}` : formatVnd(totalIn)} sub={countIn > 0 && `${countIn} khoản chưa thu`} />
          <StatTile label="Sắp chi" value={countOut ? `−${formatVnd(totalOut)}` : formatVnd(totalOut)} sub={countOut > 0 && `${countOut} khoản chưa trả`} />
        </StatGrid>
      </section>
    )
  }

  return (
    <Panel title={balance ? 'Cập nhật số dư hiện có' : 'Nhập số dư hôm nay'} titleId="balance-form-title">
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_13rem_auto] sm:items-start">
        <div className="min-w-0">
          <FieldLabel htmlFor="balance-amount">Số dư hiện có (ngân hàng + tiền mặt)</FieldLabel>
          <MoneyInput
            id="balance-amount"
            value={amount}
            onValueChange={setAmount}
            error={showErrors ? errors.amount : undefined}
            placeholder="VD: 50.000.000"
            className="fp-input-lg"
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
          />
        </Field>
        <div className="flex gap-2 sm:pt-7">
          <Button type="submit" variant="primary" size="lg" label="Lưu số dư" className="flex-1 sm:flex-none" />
          {balance && <Button type="button" variant="ghost" size="lg" label="Hủy" onClick={() => setEditing(false)} />}
        </div>
      </form>
      {!balance && (
        <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
          <Button size="sm" label="Xem ví dụ shop mẫu" icon={<Icon icon={Sparkles} />} onClick={() => void write((r) => r.replaceAll(demoShop(today)))} />
          <Button size="sm" label="Nhập từ file Excel/CSV" icon={<Icon icon={FileSpreadsheet} />} href="#nhap-file" />
        </div>
      )}
    </Panel>
  )
}
