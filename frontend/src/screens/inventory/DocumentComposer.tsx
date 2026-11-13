import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarClock, CircleAlert, Wallet } from 'lucide-react'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { useInventory } from '@/app/use-inventory'
import { useShop } from '@/app/use-shop'
import { MoneyInput } from '@/components/MoneyInput'
import { QuantityStepper } from '@/components/QuantityStepper'
import { Chip, DateInput, Field, FieldError, FieldLabel, TextField } from '@/components/fields'
import { addDays, formatDate, formatDayMonth, isValidIsoDate } from '@/lib/date'
import { newId } from '@/lib/id'
import { documentTotal, lineTotal, parseQuantity, pickableProducts } from '@/lib/inventory/calc'
import type { DocLine, Product, StockDocument } from '@/lib/inventory/types'
import { formatVnd, isZero } from '@/lib/money'
import { stockHref } from '@/app/routes'
import { cn } from '@/lib/utils'
import { ComposerLayout, SearchableList } from './ComposerLayout'
import { KIND, OUT_REASONS, withUnit } from './copy'
import type { Notice } from './notice'

type Kind = 'in' | 'sale' | 'out'

/** The price offered for a product; empty when the owner never set one, so it has to be typed. */
function offeredPrice(kind: Kind, p: Product): string {
  const price = kind === 'in' ? p.costPrice : kind === 'sale' ? p.salePrice : '0'
  return isZero(price) ? '' : price
}

/** The date a purchase of a given kind lands in the schedule, in words: "Chi 3.200.000 ₫ ngày 21/11". */
function cashSentence(kind: Kind, total: string, settled: boolean, date: string): string {
  if (kind === 'in') return settled ? `Ghi là đã trả ${formatVnd(total)} ngày ${formatDate(date)}` : `Chi ${formatVnd(total)} · trả ngày ${formatDate(date)}`
  return settled ? `Ghi là đã nhận ${formatVnd(total)} ngày ${formatDate(date)}` : `Thu ${formatVnd(total)} · tiền về ngày ${formatDate(date)}`
}

/**
 * Nhập hàng, bán hàng or xuất khác: every product in one list, a quantity beside each, and the price only where a
 * quantity is typed. One save records the whole document; stock in and sales also land in Lịch thu–chi.
 */
export function DocumentComposer({ kind, initial, onSaved }: { kind: Kind; initial?: StockDocument; onSaved: (notice: Notice) => void }) {
  const { inventory, saveDocument } = useInventory()
  const { today, data } = useShop()
  const uid = useId()
  const meta = KIND[kind]

  const [date, setDate] = useState(initial?.date ?? today)
  const [party, setParty] = useState(initial?.party ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [qty, setQty] = useState<Record<string, string>>(() => Object.fromEntries((initial?.lines ?? []).map((l) => [l.productId, String(l.quantity)])))
  const [prices, setPrices] = useState<Record<string, string>>(() => Object.fromEntries((initial?.lines ?? []).map((l) => [l.productId, l.unitPrice])))
  const [later, setLater] = useState(initial?.cash ? !initial.cash.settled : false)
  const [payDate, setPayDate] = useState(initial?.cash && !initial.cash.settled ? initial.cash.date : addDays(today, 7))
  const [query, setQuery] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!inventory) return null
  const used = new Set((initial?.lines ?? []).map((l) => l.productId))
  const products = pickableProducts(inventory.products, used).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  const before = new Map((initial?.lines ?? []).map((l) => [l.productId, l.quantity]))
  const priceOf = (p: Product) => (kind === 'out' ? '0' : (prices[p.id] ?? offeredPrice(kind, p)))
  // What can still leave: what is on hand, plus what this very document already took out.
  const available = (p: Product) => p.onHand + (kind === 'in' ? 0 : (before.get(p.id) ?? 0))

  const lines: DocLine[] = products.flatMap((p) => {
    const n = parseQuantity(qty[p.id] ?? '')
    return n ? [{ productId: p.id, quantity: n, unitPrice: priceOf(p) || '0' }] : []
  })
  const total = documentTotal(lines)
  const units = lines.reduce((sum, l) => sum + l.quantity, 0)
  const moneyMoves = kind !== 'out' && !isZero(total)
  const cashDate = later ? payDate : date

  const qtyErrors = new Map<string, string>()
  const priceErrors = new Map<string, string>()
  for (const p of products) {
    const n = parseQuantity(qty[p.id] ?? '')
    if (!n) continue
    if (kind !== 'in' && n > available(p)) qtyErrors.set(p.id, available(p) > 0 ? `Trong kho chỉ còn ${withUnit(available(p), p.unit)}` : 'Trong kho đã hết hàng')
    if (kind !== 'out' && !priceOf(p)) priceErrors.set(p.id, kind === 'in' ? 'Nhập giá nhập' : 'Nhập giá bán')
  }
  const badLines = new Set([...qtyErrors.keys(), ...priceErrors.keys()]).size
  const errors = {
    lines: lines.length === 0 ? 'Chọn ít nhất một sản phẩm và số lượng.' : badLines > 0 ? `Còn ${badLines} sản phẩm cần sửa (đã đánh dấu đỏ).` : undefined,
    date: !isValidIsoDate(date) ? 'Chọn ngày' : date > today ? 'Không chọn ngày sau hôm nay' : undefined,
    payDate: later && (!isValidIsoDate(payDate) ? 'Chọn ngày' : payDate < date ? 'Không trước ngày trên phiếu' : undefined),
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError(null)
    if (errors.lines || errors.date || errors.payDate) {
      setShowErrors(true)
      const form = e.currentTarget
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setSaving(true)
    const message = await saveDocument({
      id: initial?.id ?? newId(),
      kind,
      date,
      party: party.trim(),
      note: note.trim(),
      lines,
      cash: kind === 'out' ? null : { date: cashDate, settled: !later },
    })
    setSaving(false)
    if (message) return setServerError(message)
    onSaved(savedNotice())
  }

  function savedNotice(): Notice {
    const title = initial ? `Đã lưu lại phiếu ${meta.title.toLowerCase()}` : `Đã ghi phiếu ${meta.title.toLowerCase()}`
    const lines = [`${units} sản phẩm · ${formatVnd(total)}`]
    const links: Notice['links'] = []
    if (moneyMoves) {
      lines.push(
        later
          ? `Lịch thu–chi có thêm khoản ${kind === 'in' ? 'chi' : 'thu'} ${formatVnd(total)} ngày ${formatDate(payDate)}.`
          : `Lịch thu–chi đã ghi ${formatVnd(total)} ${kind === 'in' ? 'đã trả' : 'đã nhận'} ngày ${formatDate(date)}.`,
      )
      links.push({ label: 'Xem Lịch thu–chi', href: '#lich' })
      if (data?.balance) links.push({ label: 'Xem dự báo', href: '#du-bao' })
    }
    return { title, lines, links }
  }

  const dateShortcuts = [
    { label: 'Hôm nay', date: today },
    { label: 'Hôm qua', date: addDays(today, -1) },
  ]
  const dueShortcuts = [7, 14, 30].map((n) => ({ label: `+${n} ngày`, date: addDays(today, n) }))
  const paidWord = kind === 'in' ? 'trả' : 'nhận'

  return (
    <ComposerLayout
      title={initial ? `Sửa phiếu: ${meta.title.toLowerCase()}` : meta.title}
      onSubmit={(e) => void submit(e)}
      infoTitle={kind === 'in' ? 'Mua của ai, ngày nào' : kind === 'sale' ? 'Bán cho ai, ngày nào' : 'Vì sao, ngày nào'}
      info={
        <>
          <Field id={`${uid}-date`} label="Ngày" error={showErrors ? errors.date : undefined}>
            <DateInput id={`${uid}-date`} value={date} max={today} onChange={(e) => setDate(e.target.value)} invalid={showErrors && Boolean(errors.date)} describedBy={`${uid}-date-error`} />
          </Field>
          <div role="group" aria-label="Chọn nhanh ngày" className="-mt-2 flex flex-wrap gap-1.5">
            {dateShortcuts.map((s) => (
              <Chip key={s.label} pressed={date === s.date} onClick={() => setDate(s.date)}>
                {s.label} <span className="num font-normal text-secondary">{formatDayMonth(s.date)}</span>
              </Chip>
            ))}
          </div>
          {kind === 'out' ? (
            <div>
              <TextField id={`${uid}-note`} label="Lý do" value={note} maxLength={1000} autoComplete="off" placeholder="VD: hàng hỏng khi giặt" onChange={setNote} />
              <div role="group" aria-label="Gợi ý lý do" className="mt-2 flex flex-wrap gap-1.5">
                {OUT_REASONS.map((r) => (
                  <Chip key={r} pressed={note === r} onClick={() => setNote(r)}>
                    {r}
                  </Chip>
                ))}
              </div>
            </div>
          ) : (
            <TextField id={`${uid}-party`} label={meta.party} isOptional value={party} maxLength={200} autoComplete="off" placeholder={kind === 'in' ? 'VD: Xưởng may chị Lan' : 'VD: Shopee, TikTok Shop, khách quen'} onChange={setParty} />
          )}
        </>
      }
      productsTitle={kind === 'in' ? 'Nhập những món nào' : kind === 'sale' ? 'Bán những món nào' : 'Món nào, bao nhiêu'}
      products={
        <SearchableList
          products={products}
          query={query}
          onQuery={setQuery}
          empty={
            <>
              <p>Chưa có sản phẩm nào để chọn.</p>
              <p className="mt-3">
                <Button variant="primary" label="Thêm sản phẩm" href={stockHref('them-sp')} />
              </p>
            </>
          }
        >
          {(visible) => (
            <ul className="divide-y">
              {visible.map((p) => {
                const n = parseQuantity(qty[p.id] ?? '')
                const qtyError = showErrors ? qtyErrors.get(p.id) : undefined
                const priceError = showErrors ? priceErrors.get(p.id) : undefined
                return (
                  <li key={p.id} className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5', n && 'fp-picked')}>
                    <div className="min-w-0">
                      <p className="font-semibold break-words text-primary">{p.name}</p>
                      <p className="text-sm text-secondary">
                        {p.code && <>{p.code} · </>}
                        {p.archived ? 'Đã ẩn' : `Còn ${withUnit(p.onHand, p.unit)}`}
                      </p>
                    </div>
                    <QuantityStepper value={qty[p.id] ?? ''} onChange={(v) => setQty({ ...qty, [p.id]: v })} name={p.name} invalid={Boolean(qtyError)} />
                    {n && kind !== 'out' ? (
                      <div className="col-span-full flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                        <div className="flex items-center gap-2">
                          <FieldLabel htmlFor={`${uid}-price-${p.id}`} className="mb-0 whitespace-nowrap">
                            {kind === 'in' ? 'Giá nhập' : 'Giá bán'}
                          </FieldLabel>
                          <div className="w-44">
                            <MoneyInput
                              id={`${uid}-price-${p.id}`}
                              value={priceOf(p)}
                              onValueChange={(v) => setPrices({ ...prices, [p.id]: v })}
                              error={priceError}
                              aria-label={`${kind === 'in' ? 'Giá nhập' : 'Giá bán'} ${p.name}`}
                            />
                          </div>
                        </div>
                        <p className="num font-semibold">{formatVnd(lineTotal(n, priceOf(p) || '0'))}</p>
                      </div>
                    ) : null}
                    <div className="col-span-full empty:hidden">
                      <FieldError id={`${uid}-err-${p.id}`} message={qtyError} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </SearchableList>
      }
      money={
        kind === 'out' ? undefined : (
          <>
            <SegmentedControl
              label={kind === 'in' ? 'Đã trả tiền chưa' : 'Đã nhận tiền chưa'}
              layout="fill"
              size="lg"
              value={later ? 'later' : 'now'}
              onChange={(v) => setLater(v === 'later')}
            >
              <SegmentedControlItem value="now" label={`Đã ${paidWord}`} icon={<Wallet aria-hidden="true" className="size-4" />} />
              <SegmentedControlItem value="later" label={kind === 'in' ? 'Trả sau' : 'Nhận sau'} icon={<CalendarClock aria-hidden="true" className="size-4" />} />
            </SegmentedControl>
            {later && (
              <>
                <Field id={`${uid}-pay`} label={kind === 'in' ? 'Hạn trả tiền' : 'Ngày tiền về'} error={showErrors ? errors.payDate || undefined : undefined}>
                  <DateInput id={`${uid}-pay`} value={payDate} min={date} onChange={(e) => setPayDate(e.target.value)} invalid={showErrors && Boolean(errors.payDate)} describedBy={`${uid}-pay-error`} />
                </Field>
                <div role="group" aria-label="Chọn nhanh hạn" className="-mt-2 flex flex-wrap gap-1.5">
                  {dueShortcuts.map((s) => (
                    <Chip key={s.label} pressed={payDate === s.date} onClick={() => setPayDate(s.date)}>
                      {s.label} <span className="num font-normal text-secondary">{formatDayMonth(s.date)}</span>
                    </Chip>
                  ))}
                </div>
              </>
            )}
            {moneyMoves && (
              <p className="fp-well p-3 text-sm">
                <span className="font-bold">Vào Lịch thu–chi: </span>
                {cashSentence(kind, total, !later, cashDate)}
              </p>
            )}
          </>
        )
      }
      dock={
        <>
          {serverError && (
            <div role="alert">
              <Banner status="error" title="Chưa lưu được phiếu" description={serverError} icon={<CircleAlert aria-hidden="true" className="size-5" />} />
            </div>
          )}
          {showErrors && errors.lines && (
            <p role="alert" className="text-sm font-medium text-shortage">
              {errors.lines}
            </p>
          )}
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-secondary">{units > 0 ? `${lines.length} sản phẩm · ${units} cái` : 'Chưa chọn món nào'}</p>
            {kind !== 'out' && <p className="figure num text-xl whitespace-nowrap">{formatVnd(total)}</p>}
          </div>
          <Button type="submit" variant="primary" size="lg" label={initial ? 'Lưu thay đổi' : `Lưu phiếu ${meta.title.toLowerCase()}`} isLoading={saving} />
        </>
      }
    />
  )
}
