import { useState } from 'react'
import { ChevronDown, PencilLine, Trash2 } from 'lucide-react'
import { Badge } from '@astryxdesign/core/Badge'
import { Button } from '@astryxdesign/core/Button'
import { stockHref } from '@/app/routes'
import { useInventory } from '@/app/use-inventory'
import { useShop } from '@/app/use-shop'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Panel } from '@/components/page'
import { RowMenu } from '@/components/RowMenu'
import { formatDate } from '@/lib/date'
import { valueOfChange } from '@/lib/inventory/calc'
import type { Product, StockDocument } from '@/lib/inventory/types'
import { formatVnd, isZero } from '@/lib/money'
import { cn } from '@/lib/utils'
import { KIND, withUnit } from './copy'

const SHOWN = 8

/** Where a document's money went, in the schedule's own words. */
function cashLine(d: StockDocument): { text: string; settled: boolean } | null {
  if (!d.cash || isZero(d.total)) return null
  const word = d.kind === 'in' ? (d.cash.settled ? 'Đã trả' : 'Chi') : d.cash.settled ? 'Đã nhận' : 'Thu'
  return { text: `${word} ${formatVnd(d.total)} · ${d.cash.settled ? '' : 'hạn '}${formatDate(d.cash.date)}`, settled: d.cash.settled }
}

function DocumentRow({ doc, products }: { doc: StockDocument; products: Map<string, Product> }) {
  const { deleteDocument } = useInventory()
  const { data } = useShop()
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const meta = KIND[doc.kind]
  const Icon = meta.icon
  const cash = cashLine(doc)
  const inSchedule = doc.obligationId !== null && (data?.obligations.some((o) => o.id === doc.obligationId) ?? false)
  const units = doc.lines.reduce((sum, l) => sum + l.quantity, 0)
  const summary =
    doc.kind === 'count'
      ? `Đếm ${doc.lines.length} sản phẩm · ${doc.lines.filter((l) => l.difference).length} lệch`
      : `${doc.lines.length} sản phẩm · ${units} cái`

  return (
    <article className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-4 py-3.5 sm:px-5">
      <div className="flex min-w-0 gap-3">
        <span aria-hidden="true" className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border-2 border-[var(--color-border-emphasized)] bg-surface text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-primary">
            {meta.title}
            {doc.party && <span className="font-normal break-words text-secondary">· {doc.party}</span>}
          </h4>
          <p className="num text-sm text-secondary">
            {formatDate(doc.date)} · {summary}
          </p>
          {doc.kind === 'out' && doc.note && <p className="text-sm break-words text-secondary">{doc.note}</p>}
        </div>
      </div>
      <div className="flex items-start gap-0.5">
        {(doc.kind === 'in' || doc.kind === 'sale') && (
          <p className={cn('num pt-1.5 text-right font-semibold whitespace-nowrap', doc.kind === 'sale' ? 'text-ok' : 'text-primary')}>
            <span aria-hidden="true">{doc.kind === 'sale' ? '+' : '−'}</span>
            {formatVnd(doc.total)}
          </p>
        )}
        <RowMenu
          label={`Thao tác với phiếu ${meta.title.toLowerCase()} ngày ${formatDate(doc.date)}`}
          actions={[
            { label: 'Sửa phiếu', icon: PencilLine, onClick: () => (window.location.hash = stockHref(undefined, doc.id)) },
            { label: 'Xóa phiếu', icon: Trash2, onClick: () => setConfirmDelete(true), destructive: true },
          ]}
        />
      </div>

      <div className="col-span-full flex flex-wrap items-center gap-x-3 gap-y-1 pl-11">
        {cash && (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={cash.settled ? 'success' : 'info'} label={cash.settled ? 'Đã vào lịch' : 'Vào Lịch thu–chi'} />
            <span className="num text-secondary">{cash.text}</span>
            {inSchedule && (
              <a href="#lich" className="font-semibold underline underline-offset-4">
                Xem trong lịch
              </a>
            )}
          </p>
        )}
        <button
          type="button"
          aria-expanded={open}
          className="inline-flex min-h-9 items-center gap-1 rounded-md px-1 text-sm font-semibold text-secondary hover:bg-overlay-hover"
          onClick={() => setOpen(!open)}
        >
          Chi tiết
          <ChevronDown aria-hidden="true" className={cn('size-4 transition-transform', open && 'rotate-180')} />
        </button>
      </div>

      {open && (
        <ul className="fp-well col-span-full grid gap-1 p-3 text-sm sm:ml-11">
          {doc.lines.map((l) => {
            const p = products.get(l.productId)
            return (
              <li key={l.productId} className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="min-w-0 break-words">{p?.name ?? 'Sản phẩm đã xóa'}</span>
                <span className="num whitespace-nowrap text-secondary">
                  {doc.kind === 'count'
                    ? `đếm ${withUnit(l.quantity, p?.unit ?? '')}${l.difference ? ` (${l.difference > 0 ? '+' : '−'}${Math.abs(l.difference)}${l.unitCost ? ` · ${formatVnd(valueOfChange(l.difference, l.unitCost))}` : ''})` : ' (khớp)'}`
                    : doc.kind === 'out'
                      ? withUnit(l.quantity, p?.unit ?? '')
                      : `${l.quantity} × ${formatVnd(l.unitPrice)}`}
                </span>
              </li>
            )
          })}
          {doc.note && doc.kind !== 'out' && <li className="mt-1 text-secondary">Ghi chú: {doc.note}</li>}
        </ul>
      )}

      {error && (
        <p role="alert" className="col-span-full text-sm font-medium text-shortage">
          {error}
        </p>
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Xóa phiếu này?"
        description={`Phiếu ${meta.title.toLowerCase()} ngày ${formatDate(doc.date)} sẽ bị xóa và số hàng trong kho được tính lại${doc.obligationId ? `. Khoản ${doc.kind === 'in' ? 'chi' : 'thu'} tương ứng cũng mất khỏi Lịch thu–chi` : ''}.`}
        confirmLabel="Xóa phiếu"
        onConfirm={() => void deleteDocument(doc.id).then(setError)}
      />
    </article>
  )
}

/** The documents recorded so far, newest first. */
export function DocumentList({ documents, products }: { documents: StockDocument[]; products: Product[] }) {
  const [all, setAll] = useState(false)
  const byId = new Map(products.map((p) => [p.id, p]))
  if (documents.length === 0) return null
  const shown = all ? documents : documents.slice(0, SHOWN)
  return (
    <Panel title="Phiếu đã ghi" titleId="docs-title" flush>
      <ul className="divide-y border-t">
        {shown.map((d) => (
          <li key={d.id}>
            <DocumentRow doc={d} products={byId} />
          </li>
        ))}
      </ul>
      {documents.length > SHOWN && !all && (
        <div className="border-t px-4 py-3 sm:px-5">
          <Button variant="secondary" label={`Xem tất cả ${documents.length} phiếu`} onClick={() => setAll(true)} />
        </div>
      )}
    </Panel>
  )
}
