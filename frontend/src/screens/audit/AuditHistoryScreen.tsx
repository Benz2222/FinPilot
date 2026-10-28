import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@astryxdesign/core/Badge'
import { Button } from '@astryxdesign/core/Button'
import { ChevronLeft, ChevronRight, Clock, FileText, Filter, RefreshCw } from 'lucide-react'
import { ErrorState, Loading, PageHeader, Panel } from '@/components/page'
import { fetchAudit } from '@/lib/api'
import type { AuditItem } from '@/lib/types'

const ENTITY_OPTIONS = [
  { value: '', label: 'Tất cả loại đối tượng' },
  { value: 'obligation', label: 'Khoản thu–chi' },
  { value: 'snapshot', label: 'Số dư chốt' },
  { value: 'scenario', label: 'Kịch bản' },
  { value: 'import', label: 'Nhập file' },
  { value: 'shop', label: 'Cửa hàng' },
]

const ACTION_OPTIONS = [
  { value: '', label: 'Tất cả hành động' },
  { value: 'create', label: 'Tạo mới' },
  { value: 'upsert', label: 'Thêm / Cập nhật' },
  { value: 'remove', label: 'Xóa' },
  { value: 'balance', label: 'Cập nhật số dư' },
  { value: 'import', label: 'Nhập theo đợt' },
  { value: 'replace', label: 'Thay thế dữ liệu' },
]

function actionBadgeVariant(action: string): 'success' | 'warning' | 'error' | 'neutral' {
  switch (action.toLowerCase()) {
    case 'create':
    case 'upsert':
    case 'import':
      return 'success'
    case 'remove':
      return 'error'
    case 'balance':
    case 'replace':
      return 'warning'
    default:
      return 'neutral'
  }
}

export function AuditHistoryScreen() {
  const [items, setItems] = useState<AuditItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 15
  const [entityType, setEntityType] = useState('')
  const [action, setAction] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<AuditItem | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchAudit({ page, pageSize, entityType: entityType || undefined, action: action || undefined })
      setItems(res.items)
      setTotal(res.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được lịch sử thay đổi.')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, entityType, action])

  useEffect(() => {
    void load()
  }, [load])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader
        title="Lịch sử thay đổi"
        actions={
          <Button variant="secondary" size="sm" icon={<RefreshCw className="size-4" />} label="Làm mới" onClick={() => void load()} />
        }
      />

      <Panel title="Bộ lọc tìm kiếm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-secondary">
            <Filter className="size-4" />
            <span>Lọc:</span>
          </div>

          <select
            aria-label="Lọc theo loại đối tượng"
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value)
              setPage(1)
            }}
            className="rounded border bg-background px-3 py-1.5 text-sm font-medium"
          >
            {ENTITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Lọc theo hành động"
            value={action}
            onChange={(e) => {
              setAction(e.target.value)
              setPage(1)
            }}
            className="rounded border bg-background px-3 py-1.5 text-sm font-medium"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {(entityType || action) && (
            <Button
              size="sm"
              variant="ghost"
              label="Bỏ lọc"
              onClick={() => {
                setEntityType('')
                setAction('')
                setPage(1)
              }}
            />
          )}
        </div>
      </Panel>

      {error ? (
        <ErrorState title="Chưa tải được lịch sử" description={error} onRetry={() => void load()} />
      ) : loading ? (
        <Loading>Đang tải nhật ký thay đổi…</Loading>
      ) : items.length === 0 ? (
        <Panel>
          <div className="grid place-items-center gap-2 py-12 text-center text-secondary">
            <Clock className="size-10 stroke-1" />
            <p className="font-semibold text-primary">Chưa có bản ghi lịch sử nào</p>
            <p className="text-sm">Mọi thao tác thay đổi số dư, nghĩa vụ thu–chi, kịch bản hoặc import sẽ được ghi lại tại đây.</p>
          </div>
        </Panel>
      ) : (
        <Panel flush title={`Nhật ký hoạt động (${total} sự kiện)`}>
          <div className="divide-y border-t">
            {items.map((item) => (
              <div key={item.id} className="grid gap-2 p-4 sm:flex sm:items-center sm:justify-between sm:px-5 hover:bg-muted/30">
                <div className="grid gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="num text-xs text-secondary">{new Date(item.occurredAt).toLocaleString('vi-VN')}</span>
                    <Badge variant={actionBadgeVariant(item.action)} label={item.action} />
                    <span className="text-xs font-semibold text-secondary uppercase tracking-wider">{item.entityType}</span>
                  </div>
                  <p className="text-sm font-medium text-primary">{item.summary}</p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<FileText className="size-3.5" />}
                    label="Chi tiết"
                    onClick={() => setSelectedItem(item)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 sm:px-5">
            <p className="text-xs text-secondary">
              Trang <span className="font-semibold text-primary">{page}</span> / {totalPages} (tổng số {total} bản ghi)
            </p>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                label="Trang trước"
                icon={<ChevronLeft className="size-4" />}
                isDisabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              />
              <Button
                size="sm"
                variant="secondary"
                label="Trang sau"
                icon={<ChevronRight className="size-4" />}
                isDisabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              />
            </div>
          </div>
        </Panel>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-3.5">
              <h3 className="font-semibold text-primary">Chi tiết thay đổi #{selectedItem.id.slice(0, 8)}</h3>
              <Button size="sm" variant="ghost" label="Đóng" onClick={() => setSelectedItem(null)} />
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-secondary">Thời điểm:</span>{' '}
                  <span className="font-semibold">{new Date(selectedItem.occurredAt).toLocaleString('vi-VN')}</span>
                </div>
                <div>
                  <span className="text-secondary">Hành động:</span> <span className="font-semibold">{selectedItem.action}</span>
                </div>
                <div>
                  <span className="text-secondary">Đối tượng:</span> <span className="font-semibold">{selectedItem.entityType}</span>
                </div>
                <div>
                  <span className="text-secondary">Entity ID:</span> <span className="num break-all">{selectedItem.entityId}</span>
                </div>
              </div>

              {selectedItem.beforeJson && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-secondary">Trước thay đổi:</p>
                  <pre className="max-h-48 overflow-auto rounded bg-muted p-2.5 text-xs text-primary">
                    {JSON.stringify(JSON.parse(selectedItem.beforeJson), null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <p className="mb-1 text-xs font-semibold text-secondary">Sau thay đổi:</p>
                <pre className="max-h-48 overflow-auto rounded bg-muted p-2.5 text-xs text-primary">
                  {JSON.stringify(JSON.parse(selectedItem.afterJson), null, 2)}
                </pre>
              </div>
            </div>

            <div className="border-t px-5 py-3 text-right">
              <Button size="sm" variant="primary" label="Xong" onClick={() => setSelectedItem(null)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
