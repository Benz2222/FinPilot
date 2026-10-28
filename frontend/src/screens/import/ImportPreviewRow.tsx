import { useState } from 'react'
import { Badge } from '@astryxdesign/core/Badge'
import { Button } from '@astryxdesign/core/Button'
import { Check, Edit3, EyeOff, RotateCcw, X } from 'lucide-react'
import { formatDate } from '@/lib/date'
import { validateImportRow } from '@/lib/import'
import type { PlannedRow } from '@/lib/import'
import { formatVnd } from '@/lib/money'
import type { Direction, ImportColumn, ImportRow } from '@/lib/types'
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
  isExcluded,
  onIncludeChange,
  onToggleExclude,
  onUpdateRow,
}: {
  planned: PlannedRow
  /** Balance cutoff: an unpaid row dated on or before it becomes overdue after import. */
  cutoff: string | null
  included: boolean
  isExcluded?: boolean
  onIncludeChange: (included: boolean) => void
  onToggleExclude: (rowNumber: number) => void
  onUpdateRow: (row: ImportRow) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ImportRow>(p.row)

  const errorCols = new Set(p.row.errors.map((e) => e.column))
  const beforeStart = p.valid && cutoff && p.row.date! <= cutoff && p.row.paid !== p.row.amount

  function handleSaveEdit() {
    const errors = validateImportRow(draft)
    const updated: ImportRow = {
      ...draft,
      errors,
    }
    onUpdateRow(updated)
    setEditing(false)
  }

  function handleCancelEdit() {
    setDraft(p.row)
    setEditing(false)
  }

  return (
    <div
      className={cn(
        'grid gap-x-4 gap-y-2 border-l-4 py-3.5 pr-4 pl-3 sm:pr-5 sm:pl-4 md:grid-cols-[6.5rem_minmax(0,1fr)]',
        isExcluded
          ? 'border-l-border bg-muted/40 opacity-70'
          : !p.valid
            ? 'border-l-[var(--color-error)] bg-error-subtle/10'
            : p.duplicateOf
              ? 'border-l-[var(--astryx-theme-neutral-color-status-fill-warning,#ffb020)]'
              : 'border-l-transparent',
      )}
    >
      <div className="flex flex-wrap items-center gap-2 md:grid md:content-start md:justify-items-start md:gap-1.5">
        <span className="num text-sm text-secondary">Dòng {p.row.rowNumber}</span>
        {isExcluded && <Badge variant="neutral" label="Đã bỏ qua" />}
        {!isExcluded && !p.valid && <Badge variant="error" label="Lỗi" />}
        {!isExcluded && p.valid && !p.duplicateOf && <Badge variant="success" label="Hợp lệ" />}
        {!isExcluded && p.duplicateOf && <Badge variant="warning" label="Có thể trùng" />}

        <div className="mt-1 flex gap-1">
          {!editing && !isExcluded && (
            <Button
              size="sm"
              variant="secondary"
              label="Sửa"
              icon={<Edit3 className="size-3.5" />}
              onClick={() => {
                setDraft(p.row)
                setEditing(true)
              }}
            />
          )}
          <Button
            size="sm"
            variant={isExcluded ? 'secondary' : 'ghost'}
            label={isExcluded ? 'Khôi phục' : 'Loại bỏ'}
            icon={isExcluded ? <RotateCcw className="size-3.5" /> : <EyeOff className="size-3.5" />}
            onClick={() => onToggleExclude(p.row.rowNumber)}
          />
        </div>
      </div>

      <div className="min-w-0">
        {editing ? (
          <div className="rounded-lg border bg-surface p-3 shadow-sm">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-secondary">Loại khoản</label>
                <select
                  aria-label="Loại khoản"
                  value={draft.direction ?? 'Out'}
                  onChange={(e) => setDraft({ ...draft, direction: e.target.value as Direction })}
                  className="mt-1 w-full rounded border bg-background px-2.5 py-1.5 text-sm"
                >
                  <option value="Out">Chi</option>
                  <option value="In">Thu</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary">Nội dung</label>
                <input
                  type="text"
                  aria-label="Nội dung"
                  value={draft.label ?? ''}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                  placeholder="Nhập nội dung..."
                  className="mt-1 w-full rounded border bg-background px-2.5 py-1.5 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary">Số tiền (VND)</label>
                <input
                  type="text"
                  aria-label="Số tiền"
                  value={draft.amount ?? ''}
                  onChange={(e) => setDraft({ ...draft, amount: e.target.value.replace(/\D/g, '') })}
                  placeholder="VD: 5000000"
                  className="mt-1 w-full rounded border bg-background px-2.5 py-1.5 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary">Ngày (YYYY-MM-DD)</label>
                <input
                  type="date"
                  aria-label="Ngày"
                  value={draft.date ?? ''}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                  className="mt-1 w-full rounded border bg-background px-2.5 py-1.5 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary">Đã thanh toán (VND)</label>
                <input
                  type="text"
                  aria-label="Đã thanh toán"
                  value={draft.paid ?? '0'}
                  onChange={(e) => setDraft({ ...draft, paid: e.target.value.replace(/\D/g, '') })}
                  placeholder="0"
                  className="mt-1 w-full rounded border bg-background px-2.5 py-1.5 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary">Ghi chú (tùy chọn)</label>
                <input
                  type="text"
                  aria-label="Ghi chú"
                  value={draft.note ?? ''}
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                  placeholder="Ghi chú..."
                  className="mt-1 w-full rounded border bg-background px-2.5 py-1.5 text-sm"
                />
              </div>
            </div>

            <div className="mt-3 flex justify-end gap-2 border-t pt-2">
              <Button size="sm" variant="secondary" label="Hủy" icon={<X className="size-4" />} onClick={handleCancelEdit} />
              <Button size="sm" variant="primary" label="Lưu sửa" icon={<Check className="size-4" />} onClick={handleSaveEdit} />
            </div>
          </div>
        ) : (
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
        )}

        {!editing && p.row.errors.length > 0 && !isExcluded && (
          <ul className="mt-2 grid gap-0.5 text-sm text-shortage">
            {p.row.errors.map((e, i) => (
              <li key={i}>
                <strong className="font-semibold">{COLUMNS.find((c) => c.key === e.column)?.label ?? e.column}:</strong> {e.message}
              </li>
            ))}
          </ul>
        )}

        {!editing && p.duplicateOf && !isExcluded && (
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

        {!editing && beforeStart && !isExcluded && (
          <p className="mt-1.5 text-sm font-medium text-caution">Ngày này đã tính trong số dư hiện có nên khoản sẽ thành quá hạn, cần đổi ngày sau khi nhập.</p>
        )}
      </div>
    </div>
  )
}
