import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { CircleAlert } from 'lucide-react'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { stockHref } from '@/app/routes'
import { useInventory } from '@/app/use-inventory'
import { useShop } from '@/app/use-shop'
import { QuantityStepper } from '@/components/QuantityStepper'
import { Chip, DateInput, Field, TextField } from '@/components/fields'
import { PageHeader, Panel } from '@/components/page'
import { addDays, formatDayMonth, isValidIsoDate } from '@/lib/date'
import { newId } from '@/lib/id'
import { parseQuantity, pickableProducts, valueOfChange } from '@/lib/inventory/calc'
import type { Product, StockDocument } from '@/lib/inventory/types'
import { absMoney, addMoney, formatVnd, isZero } from '@/lib/money'
import { cn } from '@/lib/utils'
import { ComposerLayout, SearchableList } from './ComposerLayout'
import { withUnit } from './copy'
import type { Notice } from './notice'

/** "+3", "−2" or "Khớp". */
function differenceText(diff: number): string {
  return diff === 0 ? 'Khớp' : `${diff > 0 ? '+' : '−'}${Math.abs(diff)}`
}

/**
 * Kiểm kê: count what is on the shelf, then look at every difference before confirming. Products left empty are
 * not counted and stay as they are.
 */
export function Stocktake({ initial, onSaved }: { initial?: StockDocument; onSaved: (notice: Notice) => void }) {
  const { inventory, saveDocument } = useInventory()
  const { today } = useShop()
  const uid = useId()
  const [date, setDate] = useState(initial?.date ?? today)
  const [note, setNote] = useState(initial?.note ?? '')
  const [counted, setCounted] = useState<Record<string, string>>(() => Object.fromEntries((initial?.lines ?? []).map((l) => [l.productId, String(l.quantity)])))
  const [query, setQuery] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!inventory) return null
  const used = new Set((initial?.lines ?? []).map((l) => l.productId))
  const products = pickableProducts(inventory.products, used).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  // What the books say just before this count: today's stock, or for a saved count the number it was compared with.
  const bookOf = (p: Product) => {
    const line = initial?.lines.find((l) => l.productId === p.id)
    return line && line.difference !== undefined ? line.quantity - line.difference : p.onHand
  }

  const rows = products.flatMap((p) => {
    const n = parseQuantity(counted[p.id] ?? '')
    if (n === null) return []
    const book = bookOf(p)
    const diff = n - book
    // Stock counted onto an empty shelf is valued at the product's cost price, as the server does.
    return [{ p, n, book, diff, value: valueOfChange(diff, book === 0 ? p.costPrice : p.averageCost) }]
  })
  const differing = rows.filter((r) => r.diff !== 0)
  const shortfall = differing.filter((r) => r.diff < 0)
  const surplus = differing.filter((r) => r.diff > 0)
  const dateError = !isValidIsoDate(date) ? 'Chọn ngày' : date > today ? 'Không chọn ngày sau hôm nay' : undefined

  async function confirm() {
    setServerError(null)
    setSaving(true)
    const message = await saveDocument({
      id: initial?.id ?? newId(),
      kind: 'count',
      date,
      party: '',
      note: note.trim(),
      lines: rows.map((r) => ({ productId: r.p.id, quantity: r.n, unitPrice: '0' })),
      cash: null,
    })
    setSaving(false)
    if (message) return setServerError(message)
    onSaved({
      title: 'Đã chốt kiểm kê',
      lines: [differing.length === 0 ? `Đếm ${rows.length} sản phẩm, số hàng khớp với số đang ghi.` : `Đếm ${rows.length} sản phẩm, ${differing.length} sản phẩm lệch. Số hàng trong kho đã sửa theo số đếm.`],
      links: [],
    })
  }

  function review(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (rows.length === 0 || dateError) {
      setShowErrors(true)
      return
    }
    setReviewing(true)
    window.scrollTo({ top: 0 })
  }

  if (reviewing) {
    const lossValue = addMoney('0', ...shortfall.map((r) => r.value))
    return (
      <div className="grid gap-5 lg:gap-6">
        <PageHeader title="Xem lại chênh lệch" />
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
          <Panel title={differing.length === 0 ? 'Số đếm khớp với sổ' : `${differing.length} sản phẩm lệch`} titleId="diff-title" flush>
            {differing.length === 0 ? (
              <p className="border-t px-4 py-6 text-secondary sm:px-5">Đếm {rows.length} sản phẩm, không có sản phẩm nào lệch. Chốt để lưu lần kiểm kê này.</p>
            ) : (
              <ul className="divide-y border-t">
                {differing.map((r) => (
                  <li key={r.p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 sm:px-5">
                    <div className="min-w-0">
                      <p className="font-semibold break-words text-primary">{r.p.name}</p>
                      <p className="num text-sm text-secondary">
                        Đang ghi {withUnit(r.book, r.p.unit)} → đếm được {withUnit(r.n, r.p.unit)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn('figure num text-xl', r.diff < 0 ? 'text-shortage' : 'text-ok')}>{differenceText(r.diff)}</p>
                      {!isZero(r.value) && <p className="num text-sm text-secondary">{formatVnd(r.value)}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <div className="fp-dock lg:self-stretch">
            <div className="fp-dock-card grid gap-3 p-4">
              {serverError && (
                <div role="alert">
                  <Banner status="error" title="Chưa chốt được kiểm kê" description={serverError} icon={<CircleAlert aria-hidden="true" className="size-5" />} />
                </div>
              )}
              {differing.length > 0 && (
                <p className="text-sm">
                  {shortfall.length > 0 && (
                    <>
                      Thiếu <b>{shortfall.reduce((s, r) => s - r.diff, 0)}</b> cái{!isZero(lossValue) && <>, trị giá <b className="num">{formatVnd(absMoney(lossValue))}</b></>}.{' '}
                    </>
                  )}
                  {surplus.length > 0 && (
                    <>
                      Thừa <b>{surplus.reduce((s, r) => s + r.diff, 0)}</b> cái.
                    </>
                  )}
                </p>
              )}
              <Button variant="primary" size="lg" label="Chốt kiểm kê" isLoading={saving} onClick={() => void confirm()} />
              <Button variant="secondary" size="lg" label="Sửa lại số đếm" onClick={() => setReviewing(false)} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const dateShortcuts = [
    { label: 'Hôm nay', date: today },
    { label: 'Hôm qua', date: addDays(today, -1) },
  ]

  return (
    <ComposerLayout
      title={initial ? 'Sửa phiếu kiểm kê' : 'Kiểm kê'}
      onSubmit={review}
      infoTitle="Ngày đếm"
      info={
        <>
          <Field id={`${uid}-date`} label="Ngày" error={showErrors ? dateError : undefined}>
            <DateInput id={`${uid}-date`} value={date} max={today} onChange={(e) => setDate(e.target.value)} invalid={showErrors && Boolean(dateError)} describedBy={`${uid}-date-error`} />
          </Field>
          <div role="group" aria-label="Chọn nhanh ngày" className="-mt-2 flex flex-wrap gap-1.5">
            {dateShortcuts.map((s) => (
              <Chip key={s.label} pressed={date === s.date} onClick={() => setDate(s.date)}>
                {s.label} <span className="num font-normal text-secondary">{formatDayMonth(s.date)}</span>
              </Chip>
            ))}
          </div>
          <TextField id={`${uid}-note`} label="Ghi chú" isOptional value={note} maxLength={1000} autoComplete="off" onChange={setNote} />
        </>
      }
      productsTitle="Đếm được bao nhiêu"
      products={
        <SearchableList
          products={products}
          query={query}
          onQuery={setQuery}
          empty={
            <>
              <p>Chưa có sản phẩm nào để đếm.</p>
              <p className="mt-3">
                <Button variant="primary" label="Thêm sản phẩm" href={stockHref('them-sp')} />
              </p>
            </>
          }
        >
          {(visible) => (
            <ul className="divide-y">
              {visible.map((p) => {
                const n = parseQuantity(counted[p.id] ?? '')
                const diff = n === null ? null : n - bookOf(p)
                return (
                  <li key={p.id} className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 sm:px-5', n !== null && 'fp-picked')}>
                    <div className="min-w-0">
                      <p className="font-semibold break-words text-primary">{p.name}</p>
                      <p className="num text-sm text-secondary">
                        {p.code && <>{p.code} · </>}Đang ghi {withUnit(bookOf(p), p.unit)}
                      </p>
                    </div>
                    <QuantityStepper value={counted[p.id] ?? ''} onChange={(v) => setCounted({ ...counted, [p.id]: v })} name={p.name} placeholder="—" emptyOnZero={false} />
                    {diff !== null && (
                      <p className={cn('num col-span-full text-sm font-semibold', diff < 0 ? 'text-shortage' : diff > 0 ? 'text-ok' : 'text-secondary')}>{diff === 0 ? 'Khớp với sổ' : `Lệch ${differenceText(diff)}`}</p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </SearchableList>
      }
      dock={
        <>
          {showErrors && rows.length === 0 && (
            <p role="alert" className="text-sm font-medium text-shortage">
              Nhập số đếm được cho ít nhất một sản phẩm.
            </p>
          )}
          <p className="text-sm text-secondary">{rows.length > 0 ? `Đã đếm ${rows.length} / ${products.length} sản phẩm${differing.length > 0 ? ` · ${differing.length} lệch` : ''}` : 'Chưa đếm sản phẩm nào'}</p>
          <Button type="submit" variant="primary" size="lg" label="Xem chênh lệch" />
        </>
      }
    />
  )
}
