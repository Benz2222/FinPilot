import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { ArrowRight, Download, FileUp } from 'lucide-react'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Icon } from '@astryxdesign/core/Icon'
import { Spinner } from '@astryxdesign/core/Spinner'
import { Step, Stepper } from '@astryxdesign/core/Stepper'
import { Switch } from '@astryxdesign/core/Switch'
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table'
import { useShop } from '@/app/use-shop'
import { PageHeader, Panel } from '@/components/page'
import { ApiError, importTemplateUrl, previewImport } from '@/lib/api'
import { addDays } from '@/lib/date'
import { planImport, rowToObligation } from '@/lib/import'
import type { ImportPreview } from '@/lib/types'
import { DuplicateImportError } from '@/lib/store/repository'
import { cn } from '@/lib/utils'
import { ImportPreviewHeader, ImportPreviewRow } from './ImportPreviewRow'

const STEPS = ['Tải mẫu', 'Tải file', 'Kiểm tra', 'Xác nhận'] as const

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
    ? `Tệp này đã được nhập lúc ${new Date(previous.committedAt).toLocaleString('vi-VN')}. Muốn đổi gì, hãy sửa trong Lịch thu–chi hoặc dùng tệp mới.`
    : toAdd.length === 0
      ? errorRows.length > 0
        ? 'Không có dòng hợp lệ nào để thêm. Sửa tệp rồi tải lên lại.'
        : 'Không còn dòng nào để thêm.'
      : null
  const shown = errorsOnly ? planned.filter((p) => !p.valid) : planned
  // Zero-based for the Stepper; past the last step once committed.
  const step = preview ? 2 : committed ? 4 : 1

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
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader title="Nhập từ Excel / CSV" />

      <Stepper activeStep={step} label="Các bước nhập" density="compact" horizontalOptions={{ minimumStepWidth: 112, collapsedVariant: 'withLabel' }}>
        {STEPS.map((label, i) => (
          <Step key={label} step={i} label={label} />
        ))}
      </Stepper>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Panel title="Lấy tệp mẫu" titleId="template-title">
          <div className="flex flex-wrap gap-2">
            <Button label="Mẫu Excel (.xlsx)" icon={<Icon icon={Download} />} href={importTemplateUrl('xlsx')} {...({ download: true } as object)} />
            <Button variant="ghost" label="Mẫu CSV" icon={<Icon icon={Download} />} href={importTemplateUrl('csv')} {...({ download: true } as object)} />
          </div>
        </Panel>

        <Card padding={0} className="min-w-0">
          <label
            htmlFor="import-file"
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'm-2 grid h-[calc(100%-1rem)] min-h-48 cursor-pointer content-center justify-items-center gap-2 rounded-[var(--radius-element)] border-2 border-dashed p-6 text-center transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-[var(--color-accent)]',
              dragging ? 'border-[var(--color-border-emphasized)] bg-accent-muted' : 'border-border hover:border-[var(--color-border-emphasized)] hover:bg-accent-muted',
            )}
          >
            <span aria-hidden="true" className="mb-1 grid size-12 place-items-center rounded-full border-2 border-[var(--color-border-emphasized)] bg-surface">
              {loading ? <Spinner size="md" /> : <FileUp className="size-6" />}
            </span>
            <span className="font-bold">
              {loading ? (
                'Đang đọc tệp…'
              ) : (
                <>
                  <span className="text-accent underline underline-offset-4">Chọn tệp</span> hoặc kéo thả vào đây
                </>
              )}
            </span>
            <span className="text-sm text-secondary">.xlsx hoặc .csv, tối đa 1 MB</span>
            <input
              ref={inputRef}
              id="import-file"
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(e) => void read(e.target.files?.[0])}
            />
          </label>
        </Card>
      </div>

      <div aria-live="polite" className="grid gap-4 empty:hidden">
        {fileError && (
          <div role="alert">
            <Banner status="error" title="Không đọc được tệp" description={fileError} />
          </div>
        )}
        {committed && (
          <Banner
            status="success"
            title={`Đã thêm ${committed.count} khoản từ ${committed.fileName} vào Lịch thu–chi.`}
            description={committed.skipped > 0 ? `Bỏ qua ${committed.skipped} dòng lỗi` : undefined}
            endContent={<Button size="sm" label="Xem lịch" href="#lich" endContent={<Icon icon={ArrowRight} />} />}
          />
        )}
      </div>

      {preview && (
        <Panel
          flush
          titleId="check-title"
          title={<span className="break-all">{preview.fileName}</span>}
          action={
            errorRows.length > 0 && <Switch label={`Chỉ xem dòng lỗi (${errorRows.length})`} value={errorsOnly} onChange={(checked) => setErrorsOnly(checked)} />
          }
        >
          <p className="num px-4 pb-3 text-sm text-secondary sm:px-5">
            {preview.rows.length} dòng · {preview.validCount} hợp lệ · {preview.errorCount} lỗi
          </p>
          <ImportPreviewHeader />
          <ol className="divide-y border-t md:border-t-0">
            {shown.map((p) => (
              <li key={p.row.rowNumber}>
                <ImportPreviewRow
                  planned={p}
                  cutoff={cutoff}
                  included={include.has(p.row.rowNumber)}
                  onIncludeChange={(checked) => {
                    const next = new Set(include)
                    if (checked) next.add(p.row.rowNumber)
                    else next.delete(p.row.rowNumber)
                    setInclude(next)
                  }}
                />
              </li>
            ))}
          </ol>

          <div className="grid gap-3 border-t-2 border-[var(--color-border-emphasized)] px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <div className="text-sm">
                <p className="font-semibold">Sẽ thêm vào lịch</p>
                {errorRows.length > 0 && <p className="text-shortage">Bỏ qua {errorRows.length} dòng lỗi</p>}
                {duplicates.length > 0 && (
                  <p className="text-secondary">Bỏ qua {duplicates.length - duplicates.filter((d) => include.has(d.row.rowNumber)).length} dòng có thể trùng</p>
                )}
              </div>
              <p className="figure num text-3xl">{toAdd.length} dòng</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              {blockedReason && (
                <p id="commit-blocked" className="text-sm font-medium text-shortage sm:mr-auto">
                  {blockedReason}
                </p>
              )}
              {previous && <Button size="lg" label="Mở Lịch thu–chi" href="#lich" endContent={<Icon icon={ArrowRight} />} />}
              <Button
                variant="primary"
                size="lg"
                onClick={() => void commit()}
                isDisabled={Boolean(blockedReason)}
                aria-describedby={blockedReason ? 'commit-blocked' : undefined}
                label={errorRows.length > 0 ? `Nhập ${toAdd.length} dòng hợp lệ, bỏ ${errorRows.length} dòng lỗi` : `Nhập ${toAdd.length} dòng vào Lịch thu–chi`}
              />
            </div>
            {commitError && (
              <p role="alert" className="text-sm font-medium text-shortage sm:text-right">
                {commitError}
              </p>
            )}
          </div>
        </Panel>
      )}

      {data && data.imports.length > 0 && (
        <Panel title="Đã nhập" titleId="history-title" flush>
          <div className="border-t">
            <Table>
              <TableHeader>
                <TableRow isHeaderRow>
                  <TableHeaderCell>Tệp</TableHeaderCell>
                  <TableHeaderCell className="text-right">Số dòng</TableHeaderCell>
                  <TableHeaderCell className="text-right">Thời điểm</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...data.imports].reverse().map((r) => (
                  <TableRow key={r.fileSha256}>
                    <TableCell className="font-medium break-all">{r.fileName}</TableCell>
                    <TableCell className="num text-right">{r.lineCount}</TableCell>
                    <TableCell className="num text-right text-secondary">{new Date(r.committedAt).toLocaleString('vi-VN')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      )}
    </div>
  )
}
