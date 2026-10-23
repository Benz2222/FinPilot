import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { ArrowRight, Check, CircleCheck, Download, FileSpreadsheet, FileUp, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useShop } from '@/app/use-shop'
import { PageHeader } from '@/components/page'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiError, importTemplateUrl, previewImport } from '@/lib/api'
import { addDays, formatDate } from '@/lib/date'
import { planImport, rowToObligation } from '@/lib/import'
import type { PlannedRow } from '@/lib/import'
import { formatVnd } from '@/lib/money'
import { DuplicateImportError } from '@/lib/store/repository'
import type { ImportColumn, ImportPreview } from '@/lib/types'

const STEPS = ['Tải mẫu', 'Tải file', 'Kiểm tra', 'Xác nhận'] as const

const COLUMNS: { key: ImportColumn; label: string }[] = [
  { key: 'loai', label: 'Loại' },
  { key: 'noiDung', label: 'Nội dung' },
  { key: 'soTien', label: 'Số tiền' },
  { key: 'ngay', label: 'Ngày' },
  { key: 'daThanhToan', label: 'Đã thanh toán' },
  { key: 'ghiChu', label: 'Ghi chú' },
]

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

function problemMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const messages = Object.values(e.problem?.errors ?? {}).flat()
    if (messages.length > 0) return messages.join(' ')
    if (e.status === 0) return 'Không kết nối được máy chủ để đọc tệp. Kiểm tra mạng rồi thử lại.'
    if (e.status >= 500) return 'Máy chủ gặp sự cố khi đọc tệp. Vui lòng thử lại sau.'
  }
  return 'Không đọc được tệp này.'
}

export function ImportScreen() {
  const { data, write, today } = useShop()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [include, setInclude] = useState<Set<number>>(new Set())
  const [committed, setCommitted] = useState<{ count: number; fileName: string; skipped: number } | null>(null)
  const [commitError, setCommitError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [errorsOnly, setErrorsOnly] = useState(false)

  async function read(file: File | undefined) {
    if (!file) return
    setLoading(true)
    setFileError(null)
    setCommitted(null)
    setCommitError(null)
    setPreview(null)
    setInclude(new Set())
    setErrorsOnly(false)
    try {
      setPreview(await previewImport(file))
    } catch (e) {
      setFileError(problemMessage(e))
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    void read(e.dataTransfer.files[0])
  }

  const planned = preview && data ? planImport(preview, data.obligations) : []
  const previous = preview ? data?.imports.find((r) => r.fileSha256 === preview.fileSha256) : undefined
  const errorRows = planned.filter((p) => !p.valid)
  const toAdd = planned.filter((p) => p.valid && (!p.duplicateOf || include.has(p.row.rowNumber)))
  const duplicates = planned.filter((p) => p.valid && p.duplicateOf)
  const cutoff = data?.balance?.cutoff ?? null
  const blockedReason = previous
    ? `Tệp này đã được nhập lúc ${new Date(previous.committedAt).toLocaleString('vi-VN')}. Không nhập lại được tệp này; hãy sửa các khoản trong Lịch thu–chi hoặc dùng một tệp mới.`
    : toAdd.length === 0
      ? errorRows.length > 0
        ? 'Không có dòng hợp lệ nào để thêm. Sửa tệp rồi tải lên lại.'
        : 'Không còn dòng nào để thêm.'
      : null
  const shown = errorsOnly ? planned.filter((p) => !p.valid) : planned
  const step = preview ? 3 : committed ? 4 : 1

  async function commit() {
    if (!preview || blockedReason) return
    const paidOn = cutoff ?? addDays(today, -1)
    const obligations = toAdd.map((p) => rowToObligation(p.row, preview.fileSha256, paidOn))
    try {
      const ok = await write((r) => r.commitImport({ fileSha256: preview.fileSha256, fileName: preview.fileName, obligations }))
      if (ok) {
        setCommitted({ count: obligations.length, fileName: preview.fileName, skipped: errorRows.length })
        setPreview(null)
      }
    } catch (e) {
      if (e instanceof DuplicateImportError) {
        const at = e.committedAt ? ` lúc ${new Date(e.committedAt).toLocaleString('vi-VN')}` : ' trước đó'
        setCommitError(`Tệp này đã được nhập${at}; không thêm lần nữa.`)
      }
      else throw e
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Nhập từ Excel / CSV"
        description="Điền các khoản vào tệp mẫu, tải lên, kiểm từng dòng rồi mới ghi vào Lịch thu–chi. Mỗi tệp chỉ ghi được một lần."
      />

      <ol aria-label="Các bước nhập" className="flex flex-wrap items-center gap-2 text-sm">
        {STEPS.map((label, i) => {
          const n = i + 1
          const state = n < step || (n === 4 && committed && !preview) ? 'done' : n === step ? 'current' : 'todo'
          return (
            <li key={label} aria-current={state === 'current' ? 'step' : undefined} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`num grid size-6 place-items-center rounded-full text-xs font-semibold ${
                  state === 'current'
                    ? 'bg-primary text-primary-foreground'
                    : state === 'done'
                      ? 'bg-ok-soft text-ok ring-1 ring-ok-line'
                      : 'bg-card text-muted-foreground ring-1 ring-border'
                }`}
              >
                {state === 'done' ? <Check className="size-3.5" /> : n}
              </span>
              <span className={state === 'todo' ? 'text-muted-foreground' : 'font-medium text-foreground'}>
                {label}
                {state === 'done' && <span className="sr-only"> (xong)</span>}
              </span>
              {n < STEPS.length && <span aria-hidden="true" className="h-px w-4 bg-border sm:w-8" />}
            </li>
          )
        })}
      </ol>

      <ol className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <li>
          <Card className="grid h-full content-start gap-3 p-4 sm:p-5">
            <div aria-hidden="true" className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Bước 1</p>
              <h2 className="text-base font-semibold">Lấy tệp mẫu</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Sáu cột: Loại (Thu/Chi), Nội dung, Số tiền, Ngày, Đã thanh toán, Ghi chú. Số tiền là số nguyên đồng; ngày dạng 2026-10-29 hoặc 29/10/2026.
            </p>
            <div className="flex flex-wrap gap-2">
              <a href={importTemplateUrl('xlsx')} download className={buttonVariants({ variant: 'outline' })}>
                <Download aria-hidden="true" /> Mẫu Excel (.xlsx)
              </a>
              <a href={importTemplateUrl('csv')} download className={buttonVariants({ variant: 'ghost' })}>
                <Download aria-hidden="true" /> Mẫu CSV
              </a>
            </div>
          </Card>
        </li>
        <li>
          <label
            htmlFor="import-file"
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`grid h-full min-h-48 cursor-pointer content-center justify-items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring ${
              dragging ? 'border-primary bg-primary-soft' : 'border-input bg-card hover:border-primary/50 hover:bg-primary-soft/40'
            }`}
          >
            <span className="text-xs font-medium text-muted-foreground">Bước 2 · Tải tệp lên</span>
            <span aria-hidden="true" className="grid size-11 place-items-center rounded-full bg-muted text-primary">
              {loading ? <LoaderCircle className="size-5 motion-safe:animate-spin" /> : <FileUp className="size-5" />}
            </span>
            <span className="font-semibold">
              {loading ? (
                'Đang đọc tệp…'
              ) : (
                <>
                  <span className="text-primary">Chọn tệp</span> hoặc kéo thả vào đây
                </>
              )}
            </span>
            <span className="text-sm text-muted-foreground">.xlsx hoặc .csv, tối đa 1 MB</span>
            <input
              ref={inputRef}
              id="import-file"
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(e) => void read(e.target.files?.[0])}
            />
          </label>
        </li>
      </ol>

      <div aria-live="polite" className="grid gap-4 empty:hidden">
        {fileError && (
          <Alert variant="danger" role="alert">
            <TriangleAlert aria-hidden="true" />
            <AlertTitle>Không đọc được tệp</AlertTitle>
            <AlertDescription>{fileError}</AlertDescription>
          </Alert>
        )}
        {committed && (
          <Alert variant="success">
            <CircleCheck aria-hidden="true" />
            <AlertTitle>
              Đã thêm {committed.count} khoản từ {committed.fileName} vào Lịch thu–chi.
            </AlertTitle>
            <AlertDescription>
              {committed.skipped > 0 && <p>Bỏ qua {committed.skipped} dòng lỗi; sửa trong tệp và nhập riêng nếu cần.</p>}
              <a href="#lich" className={`${buttonVariants({ size: 'sm' })} mt-2`}>
                Xem lịch <ArrowRight aria-hidden="true" />
              </a>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {preview && (
        <Card className="overflow-hidden">
          <section aria-labelledby="check-title">
            <CardHeader className="pb-4 sm:pb-4">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Bước 3 · Kiểm tra</p>
                <CardTitle id="check-title" className="break-all">
                  {preview.fileName}
                </CardTitle>
                <CardDescription className="num">
                  {preview.rows.length} dòng · {preview.validCount} hợp lệ · {preview.errorCount} lỗi · mã {preview.fileSha256.slice(0, 10)}
                </CardDescription>
                <p className="mt-1 text-sm text-muted-foreground">Chưa có gì được ghi vào lịch cho đến khi bạn bấm nút ở cuối.</p>
              </div>
              {errorRows.length > 0 && (
                <label className="inline-flex shrink-0 items-center gap-2 text-sm font-medium">
                  <input type="checkbox" className="size-4 accent-primary" checked={errorsOnly} onChange={(e) => setErrorsOnly(e.target.checked)} />
                  Chỉ xem dòng lỗi ({errorRows.length})
                </label>
              )}
            </CardHeader>

            <div
              aria-hidden="true"
              className="hidden grid-cols-[5.5rem_5.5rem_minmax(0,1fr)_8.5rem_6rem_7.5rem] gap-x-4 border-y bg-muted/60 px-5 py-2 text-xs font-medium text-muted-foreground md:grid"
            >
              <span>Dòng</span>
              {COLUMNS.slice(0, 5).map((c) => (
                <span key={c.key} className={c.key === 'soTien' || c.key === 'daThanhToan' ? 'text-right' : undefined}>
                  {c.label}
                </span>
              ))}
            </div>
            <ol className="divide-y border-t md:border-t-0">
              {shown.map((p) => {
                const errorCols = new Set(p.row.errors.map((e) => e.column))
                const beforeStart = p.valid && cutoff && p.row.date! <= cutoff && p.row.paid !== p.row.amount
                return (
                  <li key={p.row.rowNumber} className={`px-4 py-3 sm:px-5 ${!p.valid ? 'bg-shortage-soft/60' : p.duplicateOf ? 'bg-caution-soft/70' : ''}`}>
                    <div className="grid gap-x-4 gap-y-2 md:grid-cols-[5.5rem_minmax(0,1fr)]">
                      <div className="flex items-center gap-2 md:grid md:content-start md:justify-items-start md:gap-1">
                        <span className="num text-xs text-muted-foreground">Dòng {p.row.rowNumber}</span>
                        {!p.valid && <Badge variant="danger">Lỗi</Badge>}
                        {p.valid && !p.duplicateOf && <Badge variant="success">Hợp lệ</Badge>}
                        {p.duplicateOf && <Badge variant="warning">Có thể trùng</Badge>}
                      </div>
                      <div className="min-w-0">
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm md:grid-cols-[5.5rem_minmax(0,1fr)_8.5rem_6rem_7.5rem]">
                          {COLUMNS.filter((c) => c.key !== 'ghiChu' || p.row.note).map((c) => {
                            const money = c.key === 'soTien' || c.key === 'daThanhToan'
                            return (
                              <div key={c.key} className={`min-w-0 ${c.key === 'ghiChu' ? 'col-span-full md:col-span-4 md:col-start-2' : ''}`}>
                                <dt className="text-xs text-muted-foreground md:sr-only">{c.label}</dt>
                                <dd
                                  className={`break-words ${money ? 'num font-medium md:text-right' : ''} ${c.key === 'ghiChu' ? 'text-muted-foreground' : ''} ${
                                    errorCols.has(c.key) ? 'font-medium text-shortage underline decoration-shortage decoration-wavy underline-offset-4' : ''
                                  }`}
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
                          <label className="mt-2 flex items-start gap-2 text-sm text-secondary-foreground">
                            <input
                              type="checkbox"
                              className="mt-0.5 size-4 shrink-0 accent-primary"
                              checked={include.has(p.row.rowNumber)}
                              onChange={(e) => {
                                const next = new Set(include)
                                if (e.target.checked) next.add(p.row.rowNumber)
                                else next.delete(p.row.rowNumber)
                                setInclude(next)
                              }}
                            />
                            <span>
                              Giống {p.duplicateOf.kind === 'existing' ? `khoản “${p.duplicateOf.label}” đã có trong lịch` : `dòng ${p.duplicateOf.rowNumber} của tệp này`} (cùng
                              loại, số tiền, ngày, nội dung). Mặc định bỏ qua; đánh dấu nếu đây là khoản khác thật.
                            </span>
                          </label>
                        )}
                        {beforeStart && (
                          <p className="mt-1 text-xs text-caution">Ngày này không sau ngày chốt {formatDate(cutoff)}: sẽ hiện là khoản quá hạn cần ngày mới.</p>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>

            <div className="grid gap-3 border-t bg-muted/40 px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="text-sm">
                  <p className="font-medium">Sẽ thêm vào lịch</p>
                  {errorRows.length > 0 && <p className="text-shortage">Bỏ qua {errorRows.length} dòng lỗi</p>}
                  {duplicates.length > 0 && (
                    <p className="text-muted-foreground">Bỏ qua {duplicates.length - duplicates.filter((d) => include.has(d.row.rowNumber)).length} dòng có thể trùng</p>
                  )}
                </div>
                <p className="num text-2xl font-semibold tracking-tight">{toAdd.length} dòng</p>
              </div>
              {planned.some((p) => p.valid && p.row.paid && p.row.paid !== '0') && (
                <p className="text-xs text-muted-foreground">Số “Đã thanh toán” được coi là đã nằm trong số dư chốt; chỉ phần còn lại được đưa vào dự báo.</p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                {blockedReason && (
                  <p id="commit-blocked" className="text-sm font-medium text-shortage sm:mr-auto">
                    {blockedReason}
                  </p>
                )}
                <Button
                  size="lg"
                  onClick={() => void commit()}
                  disabled={Boolean(blockedReason)}
                  aria-describedby={blockedReason ? 'commit-blocked' : undefined}
                  className="h-auto min-h-11 w-full whitespace-normal sm:w-auto"
                >
                  {errorRows.length > 0 ? `Nhập ${toAdd.length} dòng hợp lệ, bỏ ${errorRows.length} dòng lỗi` : `Nhập ${toAdd.length} dòng vào Lịch thu–chi`}
                </Button>
              </div>
              {commitError && (
                <p role="alert" className="text-sm font-medium text-shortage sm:text-right">
                  {commitError}
                </p>
              )}
            </div>
          </section>
        </Card>
      )}

      {data && data.imports.length > 0 && (
        <Card className="overflow-hidden">
          <section aria-labelledby="history-title">
            <CardHeader className="pb-3 sm:pb-3">
              <CardTitle id="history-title">Đã nhập</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tệp</TableHead>
                  <TableHead className="text-right">Số dòng</TableHead>
                  <TableHead className="text-right">Thời điểm</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...data.imports].reverse().map((r) => (
                  <TableRow key={r.fileSha256}>
                    <TableCell className="font-medium break-all whitespace-normal">{r.fileName}</TableCell>
                    <TableCell className="num text-right">{r.lineCount}</TableCell>
                    <TableCell className="num text-right text-muted-foreground">{new Date(r.committedAt).toLocaleString('vi-VN')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </Card>
      )}
    </div>
  )
}
