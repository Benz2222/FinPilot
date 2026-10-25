import { Badge } from '@astryxdesign/core/Badge'
import { formatDate } from '@/lib/date'
import type { PlannedRow } from '@/lib/import'
import { formatVnd } from '@/lib/money'
import type { ImportColumn } from '@/lib/types'
import { cn } from '@/lib/utils'

const COLUMNS: { key: ImportColumn; label: string }[] = [
  { key: 'loai', label: 'Loại' },
  { key: 'noiDung', label: 'Nội dung' },
  { key: 'soTien', label: 'Số tiền' },
  { key: 'ngay', label: 'Ngày' },
  { key: 'daThanhToan', label: 'Đã thanh toán' },
  { key: 'ghiChu', label: 'Ghi chú' },
]

/** Column template shared by the header row and every preview row (from `md`). */
const PREVIEW_GRID = 'md:grid-cols-[6.5rem_4.5rem_minmax(0,1fr)_8.5rem_6.5rem_7.5rem]'

/** Column titles above the preview rows, from `md` (on a phone each row labels its own cells). */
export function ImportPreviewHeader() {
  return (
    <div aria-hidden="true" className={cn('hidden gap-x-4 border-y bg-muted px-5 py-2 text-sm font-medium text-secondary md:grid', PREVIEW_GRID)}>
      <span>Dòng</span>
      {COLUMNS.slice(0, 5).map((c) => (
        <span key={c.key} className={c.key === 'soTien' || c.key === 'daThanhToan' ? 'text-right' : undefined}>
          {c.label}
        </span>
      ))}
    </div>
  )
}

function cellText(p: PlannedRow, key: ImportColumn): string {
  const r = p.row
  switch (key) {
    case 'loai':
      return r.direction === 'In' ? 'Thu' : r.direction === 'Out' ? 'Chi' : '—'
    case 'noiDung':
      return r.label || '—'
    case 'soTien':
      return r.amount ? formatVnd(r.amount) : '—'
    case 'ngay':
      return r.date ? formatDate(r.date) : '—'
    case 'daThanhToan':
      return r.paid ? formatVnd(r.paid) : '—'
    case 'ghiChu':
      return r.note || ''
  }
}

/**
 * One line of an uploaded file before it is written: row number and its state (error, valid, possible duplicate),
 * the parsed cells (a bad cell is red and wavy-underlined), what is wrong, and for a possible duplicate the choice to
 * keep it. The state shows as a coloured left edge and a badge; the row itself stays white.
 */
export function ImportPreviewRow({
  planned: p,
  cutoff,
  included,
  onIncludeChange,
}: {
  planned: PlannedRow
  /** Balance cutoff: an unpaid row dated on or before it becomes overdue after import. */
  cutoff: string | null
  included: boolean
  onIncludeChange: (included: boolean) => void
}) {
  const errorCols = new Set(p.row.errors.map((e) => e.column))
  const beforeStart = p.valid && cutoff && p.row.date! <= cutoff && p.row.paid !== p.row.amount
  return (
    <div
      className={cn(
        'grid gap-x-4 gap-y-2 border-l-4 py-3.5 pr-4 pl-3 sm:pr-5 sm:pl-4 md:grid-cols-[6.5rem_minmax(0,1fr)]',
        !p.valid ? 'border-l-[var(--color-error)]' : p.duplicateOf ? 'border-l-[var(--astryx-theme-neutral-color-status-fill-warning,#ffb020)]' : 'border-l-transparent',
      )}
    >
      <div className="flex items-center gap-2 md:grid md:content-start md:justify-items-start md:gap-1">
        <span className="num text-sm text-secondary">Dòng {p.row.rowNumber}</span>
        {!p.valid && <Badge variant="error" label="Lỗi" />}
        {p.valid && !p.duplicateOf && <Badge variant="success" label="Hợp lệ" />}
        {p.duplicateOf && <Badge variant="warning" label="Có thể trùng" />}
      </div>
      <div className="min-w-0">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm md:grid-cols-[4.5rem_minmax(0,1fr)_8.5rem_6.5rem_7.5rem]">
          {COLUMNS.filter((c) => c.key !== 'ghiChu' || p.row.note).map((c) => {
            const money = c.key === 'soTien' || c.key === 'daThanhToan'
            return (
              <div key={c.key} className={cn('min-w-0', c.key === 'ghiChu' && 'col-span-full md:col-span-4 md:col-start-2')}>
                <dt className="text-xs text-secondary md:sr-only">{c.label}</dt>
                <dd
                  className={cn(
                    'break-words',
                    money && 'num font-semibold md:text-right',
                    c.key === 'ghiChu' && 'text-secondary',
                    errorCols.has(c.key) && 'font-semibold text-shortage underline decoration-wavy underline-offset-4',
                  )}
                >
                  {errorCols.has(c.key) && cellText(p, c.key) === '—' ? 'chưa hợp lệ' : cellText(p, c.key)}
                </dd>
              </div>
            )
          })}
        </dl>
        {p.row.errors.length > 0 && (
          <ul className="mt-2 grid gap-0.5 text-sm text-shortage">
            {p.row.errors.map((e, i) => (
              <li key={i}>
                <strong className="font-semibold">{COLUMNS.find((c) => c.key === e.column)?.label ?? e.column}:</strong> {e.message}
              </li>
            ))}
          </ul>
        )}
        {p.duplicateOf && (
          <label className="mt-2 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]"
              checked={included}
              onChange={(e) => onIncludeChange(e.target.checked)}
            />
            <span>
              Giống {p.duplicateOf.kind === 'existing' ? `khoản “${p.duplicateOf.label}” đã có trong lịch` : `dòng ${p.duplicateOf.rowNumber} của tệp này`}. Sẽ bỏ qua, trừ
              khi bạn đánh dấu đây là khoản khác.
            </span>
          </label>
        )}
        {beforeStart && <p className="mt-1.5 text-sm font-medium text-caution">Ngày này đã tính trong số dư hiện có nên khoản sẽ thành quá hạn, cần đổi ngày sau khi nhập.</p>}
      </div>
    </div>
  )
}
