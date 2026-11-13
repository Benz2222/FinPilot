import { useState } from 'react'
import { CircleCheck, X } from 'lucide-react'
import { Banner } from '@astryxdesign/core/Banner'
import { Icon } from '@astryxdesign/core/Icon'
import { IconButton } from '@astryxdesign/core/IconButton'
import { stockHref } from '@/app/routes'
import type { StockTask } from '@/app/routes'
import { useHashParams } from '@/app/use-hash'
import { useInventory } from '@/app/use-inventory'
import { ErrorState, Loading, PageHeader } from '@/components/page'
import { StatGrid, StatTile } from '@/components/readout'
import { stockSummary } from '@/lib/inventory/calc'
import { formatVnd } from '@/lib/money'
import { DocumentComposer } from './DocumentComposer'
import { DocumentList } from './DocumentList'
import { ProductBatch } from './ProductBatch'
import { StockList } from './StockList'
import { Stocktake } from './Stocktake'
import { KIND, KIND_OF_TASK } from './copy'
import type { Notice } from './notice'

const TASKS: StockTask[] = ['nhap', 'ban', 'xuat', 'kiem-ke']

/** The four things she does with stock, as big targets. */
function Shortcuts() {
  return (
    <ul aria-label="Việc thường làm" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {TASKS.map((task) => {
        const meta = KIND[KIND_OF_TASK[task]!]
        return (
          <li key={task}>
            <a href={stockHref(task)} className="fp-option">
              <Icon icon={meta.icon} />
              <span className="font-display text-lg font-bold">{meta.title}</span>
              <span className="text-sm text-secondary">{meta.hint}</span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}

/** What just happened and where it went; stays until she closes it. */
function NoticeBar({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  return (
    <div role="status">
      <Banner
        status="success"
        title={notice.title}
        icon={<CircleCheck aria-hidden="true" className="size-5" />}
        description={
          <>
            {notice.lines.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </>
        }
        endContent={<IconButton variant="ghost" size="sm" label="Đóng thông báo" icon={<Icon icon={X} />} onClick={onClose} />}
      >
        {notice.links.length > 0 && (
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
            {notice.links.map((l) => (
              <a key={l.href} href={l.href} className="underline underline-offset-4">
                {l.label}
              </a>
            ))}
          </p>
        )}
      </Banner>
    </div>
  )
}

export function InventoryScreen() {
  const { inventory, loadError, reload } = useInventory()
  const params = useHashParams()
  const [notice, setNotice] = useState<Notice | null>(null)
  const task = params.get('viec') as StockTask | null
  const documentId = params.get('phieu')

  const finish = (n: Notice) => {
    setNotice(n)
    window.location.hash = '#kho-hang'
  }

  if (loadError && !inventory) {
    return (
      <div className="grid gap-5">
        <PageHeader title="Kho hàng" />
        <div role="alert">
          <ErrorState title="Chưa mở được kho hàng" description={loadError} onRetry={reload} />
        </div>
      </div>
    )
  }
  if (!inventory) {
    return (
      <div className="grid gap-5">
        <PageHeader title="Kho hàng" />
        <Loading>Đang mở kho hàng…</Loading>
      </div>
    )
  }

  // A link to a document that is gone (deleted, stale) simply shows the list.
  const editing = documentId ? inventory.documents.find((d) => d.id === documentId) : undefined
  const kind = editing ? editing.kind : task ? KIND_OF_TASK[task] : undefined
  // Keyed so a form never carries one document's answers into another.
  if (kind === 'count') return <Stocktake key={editing?.id ?? 'new'} initial={editing} onSaved={finish} />
  if (kind) return <DocumentComposer key={`${kind}-${editing?.id ?? 'new'}`} kind={kind} initial={editing} onSaved={finish} />
  if (task === 'them-sp') return <ProductBatch onSaved={finish} />

  const summary = stockSummary(inventory.products)
  const need = summary.low + summary.out
  const empty = summary.count === 0 && inventory.products.length === 0

  return (
    <div className="grid gap-5 lg:gap-6">
      <PageHeader title="Kho hàng" />
      {notice && <NoticeBar notice={notice} onClose={() => setNotice(null)} />}

      {!empty && <Shortcuts />}

      {!empty && (
        <StatGrid className="sm:grid-cols-3">
          <StatTile label="Hàng trong kho trị giá" value={formatVnd(summary.value)} sub={summary.value === '0' && summary.count > 0 ? 'Chưa nhập hay đếm hàng' : undefined} />
          <StatTile label="Sản phẩm" value={String(summary.count)} />
          <StatTile
            label="Cần nhập thêm"
            value={need === 0 ? 'Chưa có' : `${need} sản phẩm`}
            negative={need > 0}
            numeric={need > 0}
            sub={need > 0 ? [summary.out > 0 && `${summary.out} hết hàng`, summary.low > 0 && `${summary.low} sắp hết`].filter(Boolean).join(' · ') : undefined}
          />
        </StatGrid>
      )}

      <StockList products={inventory.products} needCount={need} />

      <DocumentList documents={inventory.documents} products={inventory.products} />
    </div>
  )
}
