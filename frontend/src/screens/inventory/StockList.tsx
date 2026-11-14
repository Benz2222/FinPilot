import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { ArchiveRestore, PackageSearch, PencilLine, Plus, Search, Trash2 } from 'lucide-react'
import { Badge } from '@astryxdesign/core/Badge'
import { Button } from '@astryxdesign/core/Button'
import { Collapsible } from '@astryxdesign/core/Collapsible'
import { Icon } from '@astryxdesign/core/Icon'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { stockHref } from '@/app/routes'
import { useInventory } from '@/app/use-inventory'
import { MoneyInput } from '@/components/MoneyInput'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Field, FieldLabel, TextField } from '@/components/fields'
import { EmptyState, Panel } from '@/components/page'
import { RowMenu } from '@/components/RowMenu'
import type { RowAction } from '@/components/RowMenu'
import { matchesSearch, parseQuantity, stockLevel } from '@/lib/inventory/calc'
import type { Product } from '@/lib/inventory/types'
import { formatVnd, isZero } from '@/lib/money'
import { cn } from '@/lib/utils'

function byName(a: Product, b: Product) {
  return a.name.localeCompare(b.name, 'vi')
}

/** One product's details, changed in place under its row. */
function ProductEditForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const { saveProduct } = useInventory()
  const uid = useId()
  const [name, setName] = useState(product.name)
  const [code, setCode] = useState(product.code)
  const [unit, setUnit] = useState(product.unit)
  const [sale, setSale] = useState(product.salePrice)
  const [cost, setCost] = useState(product.costPrice)
  const [low, setLow] = useState(product.lowStockAt === null ? '' : String(product.lowStockAt))
  const [showErrors, setShowErrors] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const lowNumber = parseQuantity(low)
  const nameError = name.trim() ? undefined : 'Nhập tên sản phẩm'

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (nameError) return setShowErrors(true)
    setSaving(true)
    const message = await saveProduct({
      id: product.id,
      name: name.trim(),
      code: code.trim(),
      unit: unit.trim(),
      salePrice: sale || '0',
      costPrice: cost || '0',
      lowStockAt: lowNumber,
      archived: product.archived,
    })
    setSaving(false)
    if (message) setServerError(message)
    else onDone()
  }

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="@container fp-well grid gap-4 p-4">
      <div className="grid gap-4 @xl:grid-cols-2">
        <div className="@xl:col-span-2">
          <TextField id={`${uid}-name`} label="Tên sản phẩm" value={name} maxLength={200} autoComplete="off" onChange={setName} error={showErrors ? nameError : undefined} />
        </div>
        <div className="min-w-0">
          <FieldLabel htmlFor={`${uid}-sale`}>Giá bán</FieldLabel>
          <MoneyInput id={`${uid}-sale`} value={sale} onValueChange={setSale} placeholder="0" />
        </div>
        <div className="min-w-0">
          <FieldLabel htmlFor={`${uid}-cost`}>Giá nhập</FieldLabel>
          <MoneyInput id={`${uid}-cost`} value={cost} onValueChange={setCost} placeholder="0" />
        </div>
        <TextField id={`${uid}-unit`} label="Đơn vị" isOptional value={unit} maxLength={20} autoComplete="off" placeholder="cái, bộ, đôi…" onChange={setUnit} />
        <TextField id={`${uid}-code`} label="Mã sản phẩm" isOptional value={code} maxLength={40} autoComplete="off" onChange={setCode} />
        <Field id={`${uid}-low`} label="Báo sắp hết khi còn từ" hint="Để trống nếu không cần báo.">
          <input
            id={`${uid}-low`}
            inputMode="numeric"
            autoComplete="off"
            value={low}
            className="fp-input num"
            onChange={(e) => /^\d{0,7}$/.test(e.target.value) && setLow(e.target.value)}
          />
        </Field>
      </div>
      {serverError && (
        <p role="alert" className="text-sm font-medium text-shortage">
          {serverError}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="lg" label="Lưu thay đổi" isLoading={saving} />
        <Button type="button" variant="ghost" size="lg" label="Hủy" onClick={onDone} />
      </div>
    </form>
  )
}

function ProductRow({ product: p }: { product: Product }) {
  const { saveProduct, deleteProduct } = useInventory()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const level = stockLevel(p)

  async function restore() {
    const { onHand: _onHand, averageCost: _averageCost, stockValue: _stockValue, ...input } = p
    setActionError(await saveProduct({ ...input, archived: false }))
  }

  const actions: RowAction[] = [
    { label: 'Sửa sản phẩm', icon: PencilLine, onClick: () => setEditing(true) },
    ...(p.archived ? [{ label: 'Hiện lại', icon: ArchiveRestore, onClick: () => void restore() }] : []),
    ...(p.archived ? [] : [{ label: 'Xóa sản phẩm', icon: Trash2, onClick: () => setConfirmDelete(true), destructive: true }]),
  ]

  if (editing) {
    return (
      <div className="px-4 py-4 sm:px-5">
        <ProductEditForm product={p} onDone={() => setEditing(false)} />
      </div>
    )
  }

  return (
    <article aria-label={p.name} className={cn('grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-4 py-3.5 sm:px-5', p.archived && 'text-secondary')}>
      <div className="min-w-0">
        <h4 className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold break-words text-primary">
          {p.name}
          {level === 'out' && !p.archived && <Badge variant="error" label="Hết hàng" />}
          {level === 'low' && <Badge variant="warning" label="Sắp hết" />}
          {p.archived && <Badge variant="neutral" label="Đã ẩn" />}
        </h4>
        <p className="num text-sm text-secondary">
          {p.code && <>{p.code} · </>}
          {isZero(p.salePrice) ? 'Chưa có giá bán' : `Bán ${formatVnd(p.salePrice)}`}
        </p>
      </div>
      <div className="flex items-start gap-0.5">
        <div className="pt-0.5 text-right">
          <p className={cn('figure num text-xl', level !== 'ok' && !p.archived && 'text-shortage')}>
            {p.onHand}
            {p.unit && <span className="ml-1 font-sans text-sm font-medium text-secondary">{p.unit}</span>}
          </p>
          {!isZero(p.stockValue) && <p className="num text-sm text-secondary">{formatVnd(p.stockValue)}</p>}
        </div>
        <RowMenu label={`Thao tác với “${p.name}”`} actions={actions} />
      </div>
      {actionError && (
        <p role="alert" className="col-span-full mt-2 text-sm font-medium text-shortage">
          {actionError}
        </p>
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Xóa sản phẩm này?"
        description={`“${p.name}” sẽ bị xóa khỏi danh sách. Nếu đã có phiếu nhập hay bán, sản phẩm chỉ được ẩn đi và lịch sử vẫn giữ nguyên.`}
        confirmLabel="Xóa sản phẩm"
        onConfirm={() => void deleteProduct(p.id).then(setActionError)}
      />
    </article>
  )
}

/** Every product with what is on hand: searchable, with a one-tap view of what needs ordering. */
export function StockList({ products, needCount }: { products: Product[]; needCount: number }) {
  const [filter, setFilter] = useState<'all' | 'need'>('all')
  const [query, setQuery] = useState('')
  const [showHidden, setShowHidden] = useState(false)
  const active = products.filter((p) => !p.archived).sort(byName)
  const hidden = products.filter((p) => p.archived).sort(byName)
  const shown = active.filter((p) => matchesSearch(p, query) && (filter === 'all' || stockLevel(p) !== 'ok'))
  const add = <Button size="sm" variant="secondary" label="Thêm sản phẩm" href={stockHref('them-sp')} icon={<Icon icon={Plus} />} />

  if (active.length === 0 && hidden.length === 0) {
    return (
      <EmptyState
        icon={<PackageSearch />}
        title="Chưa có sản phẩm nào"
        action={<Button variant="primary" label="Thêm sản phẩm đầu tiên" href={stockHref('them-sp')} icon={<Icon icon={Plus} />} />}
      />
    )
  }

  return (
    <Panel title="Hàng trong kho" titleId="stock-title" flush action={add}>
      {(active.length > 6 || needCount > 0) && (
        <div className="grid gap-3 border-t bg-muted px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
          {active.length > 6 && (
            <div className="flex min-w-0 items-center gap-2">
              <Search aria-hidden="true" className="size-5 shrink-0 text-secondary" />
              <div className="min-w-0 flex-1">
                <TextField id="stock-search" label="Tìm sản phẩm" isLabelHidden placeholder="Tìm theo tên hoặc mã…" value={query} onChange={setQuery} />
              </div>
            </div>
          )}
          {needCount > 0 && (
            <SegmentedControl label="Lọc sản phẩm" size="md" value={filter} onChange={(v) => setFilter(v as 'all' | 'need')}>
              <SegmentedControlItem value="all" label="Tất cả" />
              <SegmentedControlItem value="need" label={`Cần nhập thêm (${needCount})`} />
            </SegmentedControl>
          )}
        </div>
      )}
      {shown.length === 0 ? (
        <p className="border-t px-4 py-8 text-center text-secondary">{filter === 'need' && !query ? 'Không có sản phẩm nào sắp hết.' : 'Không có sản phẩm nào khớp.'}</p>
      ) : (
        <ul className="divide-y border-t">
          {shown.map((p) => (
            <li key={p.id}>
              <ProductRow product={p} />
            </li>
          ))}
        </ul>
      )}
      {hidden.length > 0 && (
        <div className="day-toggle border-t">
          <Collapsible isOpen={showHidden} onOpenChange={setShowHidden} chevronPosition="start" trigger={<span className="block font-semibold text-secondary">Sản phẩm đã ẩn ({hidden.length})</span>}>
            <ul className="divide-y border-t">
              {hidden.map((p) => (
                <li key={p.id}>
                  <ProductRow product={p} />
                </li>
              ))}
            </ul>
          </Collapsible>
        </div>
      )}
    </Panel>
  )
}
