import { useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { ArrowLeft, CircleAlert, Plus, X } from 'lucide-react'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { IconButton } from '@astryxdesign/core/IconButton'
import { useInventory } from '@/app/use-inventory'
import { useShop } from '@/app/use-shop'
import { MoneyInput } from '@/components/MoneyInput'
import { FieldLabel } from '@/components/fields'
import { PageHeader, Panel } from '@/components/page'
import { parseQuantity } from '@/lib/inventory/calc'
import { newId } from '@/lib/id'
import type { Notice } from './notice'

type Field = 'name' | 'sale' | 'cost' | 'have'

interface Row {
  key: string
  name: string
  sale: string
  cost: string
  /** How many she has right now; empty when none or not worth counting. */
  have: string
}

const newRow = (): Row => ({ key: newId(), name: '', sale: '', cost: '', have: '' })
const START_ROWS = 3
/** A new product warns when this few are left; the owner can change it per product later. */
const DEFAULT_LOW_STOCK = 3
const DEFAULT_UNIT = 'cái'

/**
 * Several new products in one go: a row each with name, selling price and buying price. Enter moves on, and from the
 * last price it opens the next row, so a long list is typed without touching the screen. Rows left empty are ignored.
 */
export function ProductBatch({ onSaved }: { onSaved: (notice: Notice) => void }) {
  const { saveProduct, saveDocument } = useInventory()
  const { today } = useShop()
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: START_ROWS }, newRow))
  const [showErrors, setShowErrors] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)

  const filled = rows.filter((r) => r.name.trim() || r.sale || r.cost || r.have)
  const nameMissing = (r: Row) => !r.name.trim() && Boolean(r.sale || r.cost || r.have)
  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  function focusRow(index: number, field: Field) {
    const find = () => listRef.current?.querySelector<HTMLElement>(`[data-row="${index}"][data-field="${field}"]`)
    // Already on screen: focus now, so keys typed right after Enter land in the new box. A new row waits for its render.
    const box = find()
    if (box) box.focus()
    else requestAnimationFrame(() => find()?.focus())
  }

  function addRow(focus = true) {
    setRows((rs) => [...rs, newRow()])
    if (focus) focusRow(rows.length, 'name')
  }

  /** Enter: name → sale price → cost → how many she has → next row's name (adding a row after the last). */
  function onEnter(e: KeyboardEvent<HTMLElement>, index: number, field: Field) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (field === 'name') return focusRow(index, 'sale')
    if (field === 'sale') return focusRow(index, 'cost')
    if (field === 'cost') return focusRow(index, 'have')
    if (index === rows.length - 1) addRow()
    else focusRow(index + 1, 'name')
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError(null)
    if (filled.length === 0 || filled.some(nameMissing)) {
      setShowErrors(true)
      const form = e.currentTarget
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setSaving(true)
    let saved = 0
    const counted: { productId: string; quantity: number; unitPrice: string }[] = []
    for (const r of filled) {
      const id = newId()
      const message = await saveProduct({
        id,
        name: r.name.trim(),
        code: '',
        unit: DEFAULT_UNIT,
        salePrice: r.sale || '0',
        costPrice: r.cost || '0',
        lowStockAt: DEFAULT_LOW_STOCK,
        archived: false,
      })
      if (message) {
        // The ones before this are saved; keep only the rest on screen.
        const done = new Set(filled.slice(0, saved).map((x) => x.key))
        setRows((rs) => (rs.some((x) => !done.has(x.key)) ? rs.filter((x) => !done.has(x.key)) : [newRow()]))
        setServerError(`${saved > 0 ? `Đã lưu ${saved} sản phẩm đầu. ` : ''}Dừng ở “${r.name.trim()}”: ${message}`)
        setSaving(false)
        return
      }
      saved += 1
      const have = parseQuantity(r.have)
      if (have) counted.push({ productId: id, quantity: have, unitPrice: '0' })
    }
    // Hàng có sẵn is a count, not a purchase: it adds to the stock but puts nothing in the cash schedule.
    const countMessage = counted.length > 0 ? await saveDocument({ id: newId(), kind: 'count', date: today, party: '', note: 'Hàng có sẵn khi thêm sản phẩm', lines: counted, cash: null }) : null
    setSaving(false)
    const title = `Đã thêm ${saved} sản phẩm`
    if (countMessage) {
      onSaved({ title, lines: [`Chưa ghi được số hàng đang có: ${countMessage}`, 'Hãy ghi lại ở Kiểm kê.'], links: [{ label: 'Kiểm kê', href: '#kho-hang?viec=kiem-ke' }] })
    } else if (counted.length > 0) {
      onSaved({ title, lines: [`Đã ghi số hàng đang có của ${counted.length} sản phẩm.`], links: [] })
    } else {
      onSaved({ title, lines: ['Có hàng sẵn trong kho rồi? Điền “Đang có” hoặc kiểm kê để ghi số lượng.'], links: [{ label: 'Kiểm kê ngay', href: '#kho-hang?viec=kiem-ke' }] })
    }
  }

  return (
    <div className="grid gap-5 lg:gap-6">
      <PageHeader title="Thêm sản phẩm" actions={<Button variant="ghost" label="Kho hàng" href="#kho-hang" icon={<Icon icon={ArrowLeft} />} />} />
      <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-5">
        <Panel title="Gõ lần lượt từng món" titleId="batch-title" flush>
          <ul ref={listRef} className="divide-y border-t">
            {rows.map((r, i) => (
              <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_10rem_10rem_6rem_auto] sm:items-end sm:px-5">
                <div className="min-w-0">
                  <FieldLabel htmlFor={`name-${r.key}`}>{`Món ${i + 1}`}</FieldLabel>
                  <input
                    id={`name-${r.key}`}
                    data-row={i}
                    data-field="name"
                    value={r.name}
                    maxLength={200}
                    autoComplete="off"
                    enterKeyHint="next"
                    placeholder="Tên sản phẩm, VD: Áo sơ mi trắng"
                    aria-invalid={showErrors && nameMissing(r) ? true : undefined}
                    className="fp-input"
                    onChange={(e) => update(r.key, { name: e.target.value })}
                    onKeyDown={(e) => onEnter(e, i, 'name')}
                  />
                  {showErrors && nameMissing(r) && <p className="mt-1.5 text-sm text-shortage">Nhập tên sản phẩm</p>}
                </div>
                <div className="self-end sm:order-last">
                  <IconButton variant="ghost" label={`Bỏ dòng ${i + 1}`} icon={<Icon icon={X} />} isDisabled={rows.length === 1} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} />
                </div>
                <div className="col-span-full grid grid-cols-2 gap-3 sm:contents">
                  <div className="min-w-0">
                    <FieldLabel htmlFor={`sale-${r.key}`}>Giá bán</FieldLabel>
                    <MoneyInput id={`sale-${r.key}`} data-row={i} data-field="sale" enterKeyHint="next" value={r.sale} onValueChange={(sale) => update(r.key, { sale })} placeholder="0" onKeyDown={(e) => onEnter(e, i, 'sale')} />
                  </div>
                  <div className="min-w-0">
                    <FieldLabel htmlFor={`cost-${r.key}`}>Giá nhập</FieldLabel>
                    <MoneyInput id={`cost-${r.key}`} data-row={i} data-field="cost" enterKeyHint="next" value={r.cost} onValueChange={(cost) => update(r.key, { cost })} placeholder="0" onKeyDown={(e) => onEnter(e, i, 'cost')} />
                  </div>
                  <div className="min-w-0">
                    <FieldLabel htmlFor={`have-${r.key}`}>Đang có</FieldLabel>
                    <input
                      id={`have-${r.key}`}
                      data-row={i}
                      data-field="have"
                      value={r.have}
                      inputMode="numeric"
                      enterKeyHint="next"
                      autoComplete="off"
                      placeholder="0"
                      className="fp-input num"
                      onChange={(e) => {
                        const text = e.target.value.replace(/\s/g, '')
                        if (text === '' || /^\d{1,7}$/.test(text)) update(r.key, { have: text.replace(/^0+(?=\d)/, '') })
                      }}
                      onKeyDown={(e) => onEnter(e, i, 'have')}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t px-4 py-3 sm:px-5">
            <Button variant="secondary" label="Thêm một dòng" icon={<Icon icon={Plus} />} onClick={() => addRow()} />
          </div>
        </Panel>

        <div className="fp-dock">
          <div className="fp-dock-card grid gap-3 p-4">
            {serverError && (
              <div role="alert">
                <Banner status="error" title="Chưa lưu hết được" description={serverError} icon={<CircleAlert aria-hidden="true" className="size-5" />} />
              </div>
            )}
            {showErrors && filled.length === 0 && (
              <p role="alert" className="text-sm font-medium text-shortage">
                Nhập tên ít nhất một sản phẩm.
              </p>
            )}
            <Button type="submit" variant="primary" size="lg" label={filled.length > 0 ? `Lưu ${filled.length} sản phẩm` : 'Lưu sản phẩm'} isLoading={saving} />
          </div>
        </div>
      </form>
    </div>
  )
}
