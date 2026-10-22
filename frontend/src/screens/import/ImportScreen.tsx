import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { ArrowRight, Check, CircleCheck, Download, FileUp, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useShop } from '@/app/use-shop'
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
    ? `Tệp này đã được nhập lúc ${new Date(previous.committedAt).toLocaleString('vi-VN')}. Nhập lại sẽ nhân đôi các khoản.`
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
      if (e instanceof DuplicateImportError) setCommitError('Tệp này đã được nhập trước đó; không thêm lần nữa.')
      else throw e
    }
  }

  return (
    <div className="grid gap-10">
      <header className="grid gap-2">
        <h1 id="screen-title" tabIndex={-1} className="font-display text-4xl font-bold tracking-tight outline-none sm:text-5xl">
          Nhập từ Excel / CSV
        </h1>
        <p className="max-w-2xl text-ink-2">
          Điền các khoản vào tệp mẫu, tải lên, kiểm từng dòng rồi mới ghi vào Lịch thu–chi. Mỗi tệp chỉ ghi được một lần.
        </p>
      </header>

      <ol aria-label="Các bước nhập" className="-mt-4 flex flex-wrap items-center gap-x-1 gap-y-2 font-mono text-xs tracking-[0.08em] uppercase">
        {STEPS.map((label, i) => {
          const n = i + 1
          const state = n < step || (n === 4 && committed && !preview) ? 'done' : n === step ? 'current' : 'todo'
          return (
            <li key={label} aria-current={state === 'current' ? 'step' : undefined} className="flex items-center gap-1">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
                  state === 'current' ? 'border-magenta bg-magenta text-white' : state === 'done' ? 'border-ink bg-ink text-paper' : 'border-ink/30 text-ink-2'
                }`}
              >
                {state === 'done' ? <Check aria-hidden="true" className="size-3.5" /> : <span aria-hidden="true">{n}</span>}
                {label}
                {state === 'done' && <span className="sr-only"> (xong)</span>}
              </span>
              {n < STEPS.length && <span aria-hidden="true" className="h-px w-3 bg-ink/40 sm:w-6" />}
            </li>
          )
        })}
      </ol>

      <ol className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
        <li className="grid content-start gap-3 rounded-xl bg-ink p-5 text-paper">
          <p className="font-mono text-xs tracking-[0.16em] text-paper/70 uppercase">Bước 1 · Lấy tệp mẫu</p>
          <p className="text-sm text-paper/85">
            Sáu cột: Loại (Thu/Chi), Nội dung, Số tiền, Ngày, Đã thanh toán, Ghi chú. Số tiền là số nguyên đồng; ngày dạng 2026-10-29 hoặc 29/10/2026.
          </p>
          <div className="flex flex-wrap gap-2">
            <a href={importTemplateUrl('xlsx')} download className="inline-flex items-center gap-2 rounded-md bg-paper px-4 py-2 font-semibold text-ink">
              <Download aria-hidden="true" className="size-4" /> Mẫu Excel (.xlsx)
            </a>
            <a href={importTemplateUrl('csv')} download className="inline-flex items-center gap-2 rounded-md border border-paper/50 px-4 py-2 font-semibold">
              <Download aria-hidden="true" className="size-4" /> Mẫu CSV
            </a>
          </div>
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
            className={`grid h-full cursor-pointer content-center justify-items-center gap-2 rounded-xl border-[3px] border-dashed p-6 text-center transition-colors has-focus-visible:outline-3 has-focus-visible:outline-magenta ${
              dragging ? 'border-magenta bg-magenta/5' : 'border-ink/35 bg-card hover:border-ink'
            }`}
          >
            <span className="font-mono text-xs tracking-[0.16em] text-ink-3 uppercase">Bước 2 · Tải tệp lên</span>
            {loading ? <LoaderCircle aria-hidden="true" className="size-8 motion-safe:animate-spin" /> : <FileUp aria-hidden="true" className="size-8 text-magenta" />}
            <span className="font-display text-2xl font-bold">{loading ? 'Đang đọc tệp…' : 'Chọn tệp hoặc kéo thả vào đây'}</span>
            <span className="text-sm text-ink-3">.xlsx hoặc .csv, tối đa 1 MB</span>
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

      <div aria-live="polite" className="grid gap-4">
        {fileError && (
          <p role="alert" className="flex gap-2 rounded-lg border-2 border-destructive/60 bg-card p-4 font-medium text-destructive">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" /> {fileError}
          </p>
        )}
        {committed && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-jade p-5 text-white">
            <CircleCheck aria-hidden="true" className="size-6" />
            <p className="min-w-0 flex-1 basis-60 font-semibold">
              Đã thêm {committed.count} khoản từ {committed.fileName} vào Lịch thu–chi.
              {committed.skipped > 0 && ` Bỏ qua ${committed.skipped} dòng lỗi; sửa trong tệp và nhập riêng nếu cần.`}
            </p>
            <a href="#lich" className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 font-semibold text-jade">
              Xem lịch <ArrowRight aria-hidden="true" className="size-4" />
            </a>
          </div>
        )}
      </div>

      {preview && (
        <section aria-labelledby="check-title" className="mx-auto grid w-full max-w-3xl gap-4">
          <div className="receipt bg-card px-4 shadow-[0_30px_60px_-36px_rgb(16_27_51/0.6)] sm:px-8">
            <div className="border-b-2 border-dashed border-ink/30 pb-3 text-center">
              <p className="font-mono text-xs tracking-[0.16em] text-ink-3 uppercase">Bước 3 · Phiếu kiểm</p>
              <h2 id="check-title" className="mt-1 font-display text-2xl font-bold break-all">{preview.fileName}</h2>
              <p className="mt-1 font-mono text-xs text-ink-3">
                {preview.rows.length} dòng · {preview.validCount} hợp lệ · {preview.errorCount} lỗi · mã {preview.fileSha256.slice(0, 10)}
              </p>
              <p className="mt-1 text-sm text-ink-2">Chưa có gì được ghi vào lịch cho đến khi bạn bấm nút ở cuối phiếu.</p>
              {errorRows.length > 0 && (
                <label className="mt-3 inline-flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" className="size-4 accent-ink" checked={errorsOnly} onChange={(e) => setErrorsOnly(e.target.checked)} />
                  Chỉ xem dòng lỗi ({errorRows.length})
                </label>
              )}
            </div>

            <div aria-hidden="true" className="hidden grid-cols-[3rem_minmax(0,1fr)_8.5rem_6rem_7.5rem] gap-x-4 pt-3 font-mono text-[0.68rem] tracking-[0.1em] text-ink-3 uppercase sm:grid">
              {COLUMNS.slice(0, 5).map((c) => (
                <span key={c.key}>{c.label}</span>
              ))}
            </div>
            <ol className="divide-y divide-dashed divide-ink/25">
              {shown.map((p) => {
                const errorCols = new Set(p.row.errors.map((e) => e.column))
                const beforeStart = p.valid && cutoff && p.row.date! <= cutoff && p.row.paid !== p.row.amount
                return (
                  <li key={p.row.rowNumber} className={`py-3 ${!p.valid ? 'bg-destructive/[0.05]' : p.duplicateOf ? 'bg-[#fff6d6]' : ''} -mx-2 px-2`}>
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-xs text-ink-3">Dòng {p.row.rowNumber}</span>
                      {!p.valid && <span className="text-xs font-bold text-destructive uppercase">Lỗi</span>}
                      {p.valid && !p.duplicateOf && <span className="text-xs font-bold text-jade uppercase">Hợp lệ</span>}
                      {p.duplicateOf && <span className="text-xs font-bold text-[#7a4a00] uppercase">Có thể trùng</span>}
                    </div>
                    <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-[3rem_minmax(0,1fr)_8.5rem_6rem_7.5rem]">
                      {COLUMNS.filter((c) => c.key !== 'ghiChu' || p.row.note).map((c) => (
                        <div key={c.key} className={`min-w-0 ${c.key === 'ghiChu' ? 'col-span-full' : ''}`}>
                          <dt className="text-[0.68rem] text-ink-3 sm:sr-only">{c.label}</dt>
                          <dd className={`break-words ${c.key === 'soTien' || c.key === 'daThanhToan' ? 'figure text-base font-semibold' : ''} ${errorCols.has(c.key) ? 'font-semibold text-destructive underline decoration-wavy decoration-destructive underline-offset-4' : ''}`}>
                            {errorCols.has(c.key) && cellText(p, c.key) === '—' ? 'chưa hợp lệ' : cellText(p, c.key)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    {p.row.errors.length > 0 && (
                      <ul className="mt-2 grid gap-0.5 text-sm text-destructive">
                        {p.row.errors.map((e, i) => (
                          <li key={i}>
                            <strong>{COLUMNS.find((c) => c.key === e.column)?.label ?? e.column}:</strong> {e.message}
                          </li>
                        ))}
                      </ul>
                    )}
                    {p.duplicateOf && (
                      <label className="mt-2 flex items-start gap-2 text-sm text-[#5c3a00]">
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 accent-ink"
                          checked={include.has(p.row.rowNumber)}
                          onChange={(e) => {
                            const next = new Set(include)
                            if (e.target.checked) next.add(p.row.rowNumber)
                            else next.delete(p.row.rowNumber)
                            setInclude(next)
                          }}
                        />
                        <span>
                          Giống {p.duplicateOf.kind === 'existing' ? `khoản “${p.duplicateOf.label}” đã có trong lịch` : `dòng ${p.duplicateOf.rowNumber} của tệp này`} (cùng loại, số tiền, ngày, nội dung).
                          Mặc định bỏ qua; đánh dấu nếu đây là khoản khác thật.
                        </span>
                      </label>
                    )}
                    {beforeStart && (
                      <p className="mt-1 text-xs text-ink-2">Ngày này không sau ngày chốt {formatDate(cutoff)}: sẽ hiện là khoản quá hạn cần ngày mới.</p>
                    )}
                  </li>
                )
              })}
            </ol>

            <div className="mt-2 border-t-2 border-dashed border-ink/30 pt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-sm">
                <span>Sẽ thêm vào lịch</span>
                <span className="figure text-2xl font-bold">{toAdd.length} dòng</span>
              </div>
              {errorRows.length > 0 && <p className="font-mono text-xs text-destructive">Bỏ qua {errorRows.length} dòng lỗi</p>}
              {duplicates.length > 0 && (
                <p className="font-mono text-xs text-ink-3">
                  Bỏ qua {duplicates.length - duplicates.filter((d) => include.has(d.row.rowNumber)).length} dòng có thể trùng
                </p>
              )}
              {planned.some((p) => p.valid && p.row.paid && p.row.paid !== '0') && (
                <p className="mt-2 text-xs text-ink-2">
                  Số “Đã thanh toán” được coi là đã nằm trong số dư chốt; chỉ phần còn lại được đưa vào dự báo.
                </p>
              )}
              <button
                type="button"
                onClick={() => void commit()}
                disabled={Boolean(blockedReason)}
                aria-describedby={blockedReason ? 'commit-blocked' : undefined}
                className="mt-4 h-12 w-full rounded-md bg-magenta font-semibold text-white hover:bg-[#951c5b] disabled:cursor-not-allowed disabled:bg-ink/30 disabled:text-ink"
              >
                {errorRows.length > 0 ? `Nhập ${toAdd.length} dòng hợp lệ, bỏ ${errorRows.length} dòng lỗi` : `Nhập ${toAdd.length} dòng vào Lịch thu–chi`}
              </button>
              {blockedReason && (
                <p id="commit-blocked" className="mt-2 text-sm font-semibold text-destructive">
                  {blockedReason}
                </p>
              )}
              {commitError && (
                <p role="alert" className="mt-2 text-sm font-semibold text-destructive">
                  {commitError}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {data && data.imports.length > 0 && (
        <section aria-labelledby="history-title">
          <h2 id="history-title" className="eyebrow">Đã nhập</h2>
          <ul className="mt-2 grid gap-1 text-sm text-ink-2">
            {[...data.imports].reverse().map((r) => (
              <li key={r.fileSha256} className="flex flex-wrap gap-x-3">
                <span className="font-semibold break-all text-ink">{r.fileName}</span>
                <span>{r.lineCount} dòng</span>
                <span>{new Date(r.committedAt).toLocaleString('vi-VN')}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
