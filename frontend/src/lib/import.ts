import { newId } from './id'
import { compareMoney, isZero } from './money'
import { duplicateKey } from './shop'
import type { Obligation } from './shop'
import { isValidIsoDate } from './date'
import type { ImportColumn, ImportPreview, ImportRow, IsoDate } from './types'

export interface PlannedRow {
  row: ImportRow
  valid: boolean
  /** An existing line, or an earlier row of this file, with the same direction, amount, date and label. */
  duplicateOf: { kind: 'existing'; label: string } | { kind: 'file'; rowNumber: number } | null
}

export function validateImportRow(row: Partial<ImportRow>): { column: ImportColumn; message: string }[] {
  const errors: { column: ImportColumn; message: string }[] = []

  if (row.direction !== 'In' && row.direction !== 'Out') {
    errors.push({ column: 'loai', message: 'Loại phải là Thu hoặc Chi.' })
  }

  const label = row.label?.trim() ?? ''
  if (label.length === 0 || label.length > 200) {
    errors.push({ column: 'noiDung', message: 'Nội dung là bắt buộc và không quá 200 ký tự.' })
  }

  const amount = row.amount?.trim() ?? ''
  if (!/^[1-9]\d*$/.test(amount)) {
    errors.push({ column: 'soTien', message: 'Số tiền phải là số nguyên VND lớn hơn 0, không có phần lẻ.' })
  }

  const date = row.date?.trim() ?? ''
  if (!isValidIsoDate(date)) {
    errors.push({ column: 'ngay', message: 'Ngày phải hợp lệ theo định dạng yyyy-MM-dd.' })
  }

  const paid = row.paid?.trim() ?? '0'
  if (paid !== '' && paid !== '0') {
    if (!/^\d+$/.test(paid)) {
      errors.push({ column: 'daThanhToan', message: 'Đã thanh toán phải là số nguyên VND.' })
    } else if (/^[1-9]\d*$/.test(amount) && compareMoney(paid, amount) > 0) {
      errors.push({ column: 'daThanhToan', message: 'Đã thanh toán không được lớn hơn Số tiền.' })
    }
  }

  const note = row.note?.trim() ?? ''
  if (note.length > 500) {
    errors.push({ column: 'ghiChu', message: 'Ghi chú không quá 500 ký tự.' })
  }

  return errors
}

function keyOf(row: ImportRow): string | null {
  if (!row.direction || !row.label || !row.amount || !row.date) return null
  return duplicateKey(row.direction, row.label, row.amount, row.date)
}

export function planImport(preview: ImportPreview, existing: readonly Obligation[]): PlannedRow[] {
  const existingKeys = new Map(existing.map((o) => [duplicateKey(o.direction, o.label, o.amount, o.date), o.label]))
  const seen = new Map<string, number>()
  return preview.rows.map((row) => {
    const valid = row.errors.length === 0 && keyOf(row) !== null
    const key = keyOf(row)
    let duplicateOf: PlannedRow['duplicateOf'] = null
    if (key) {
      const existingLabel = existingKeys.get(key)
      if (existingLabel !== undefined) duplicateOf = { kind: 'existing', label: existingLabel }
      else if (seen.has(key)) duplicateOf = { kind: 'file', rowNumber: seen.get(key)! }
      else seen.set(key, row.rowNumber)
    }
    return { row, valid, duplicateOf }
  })
}

/**
 * A valid row as a real obligation. The file's "Đã thanh toán" has no date, so it is recorded as paid on the
 * cutoff day: money already reflected in the confirmed balance.
 */
export function rowToObligation(row: ImportRow, fileSha256: string, paidOn: IsoDate): Obligation {
  const paid = row.paid ?? '0'
  const payments = isZero(paid) ? [] : [{ id: newId(), amount: paid, date: paidOn }]
  return {
    id: newId(),
    direction: row.direction!,
    label: row.label!.trim(),
    amount: row.amount!,
    date: row.date!,
    note: row.note ?? '',
    status: compareMoney(paid, row.amount!) >= 0 ? 'paid' : 'open',
    payments,
    importedFrom: fileSha256,
  }
}
