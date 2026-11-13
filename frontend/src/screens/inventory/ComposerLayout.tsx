import type { FormEvent, ReactNode } from 'react'
import { ArrowLeft, Search } from 'lucide-react'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { TextField } from '@/components/fields'
import { PageHeader, Panel } from '@/components/page'
import { matchesSearch } from '@/lib/inventory/calc'
import type { Product } from '@/lib/inventory/types'

/**
 * The shape of every stock form. On a phone one column in the order it is filled: who and when, the products,
 * the money; the summary and save bar stays pinned above the tab bar. From lg the products take the wide column
 * and the rest rides along beside them.
 */
export function ComposerLayout({
  title,
  onSubmit,
  info,
  infoTitle,
  products,
  productsTitle,
  money,
  dock,
}: {
  title: string
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  infoTitle: string
  info: ReactNode
  productsTitle: string
  products: ReactNode
  /** The payment panel; absent for forms that move no money. */
  money?: ReactNode
  /** The summary, any error and the save button. */
  dock: ReactNode
}) {
  return (
    <div className="grid gap-5 lg:gap-6">
      <PageHeader title={title} actions={<Button variant="ghost" label="Kho hàng" href="#kho-hang" icon={<Icon icon={ArrowLeft} />} />} />
      <form
        onSubmit={(e) => {
          // Enter in the search box filters; it must not save the form.
          if (document.activeElement?.id === 'product-search') return e.preventDefault()
          onSubmit(e)
        }}
        noValidate
        className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[auto_auto_1fr] lg:items-start lg:gap-6"
      >
        <Panel title={infoTitle} titleId="info-title" className="lg:col-start-2 lg:row-start-1" bodyClassName="grid gap-4">
          {info}
        </Panel>
        <Panel title={productsTitle} titleId="products-title" flush className="lg:col-start-1 lg:row-span-3 lg:row-start-1">
          {products}
        </Panel>
        {money && (
          <Panel title="Tiền" titleId="money-title" className="lg:col-start-2 lg:row-start-2" bodyClassName="grid gap-4">
            {money}
          </Panel>
        )}
        <div className="fp-dock lg:col-start-2 lg:row-start-3 lg:self-stretch">
          <div className="fp-dock-card grid gap-3 p-4">{dock}</div>
        </div>
      </form>
    </div>
  )
}

/** Search box over a product list; shows the products that match and says so when none do. */
export function SearchableList({
  products,
  query,
  onQuery,
  empty,
  children,
}: {
  products: Product[]
  query: string
  onQuery: (q: string) => void
  empty: ReactNode
  children: (visible: Product[]) => ReactNode
}) {
  const visible = products.filter((p) => matchesSearch(p, query))
  return (
    <div className="border-t">
      {products.length > 6 && (
        <div className="flex items-center gap-2 border-b bg-muted px-4 py-3 sm:px-5">
          <Search aria-hidden="true" className="size-5 shrink-0 text-secondary" />
          <div className="min-w-0 flex-1">
            <TextField id="product-search" label="Tìm sản phẩm" isLabelHidden placeholder="Tìm theo tên hoặc mã…" value={query} onChange={onQuery} />
          </div>
        </div>
      )}
      {visible.length === 0 ? <div className="px-4 py-8 text-center text-secondary">{products.length === 0 ? empty : 'Không có sản phẩm nào khớp.'}</div> : children(visible)}
    </div>
  )
}
