import { describe, expect, it } from 'vitest'
import { planImport, validateImportRow } from './import'
import type { ImportPreview, ImportRow } from './types'

describe('validateImportRow', () => {
  it('validates a correct row with zero errors', () => {
    const row: Partial<ImportRow> = {
      direction: 'Out',
      label: 'Nhập hàng đợt 1',
      amount: '15000000',
      date: '2026-11-01',
      paid: '5000000',
      note: 'Ghi chú',
    }
    const errors = validateImportRow(row)
    expect(errors).toHaveLength(0)
  })

  it('detects invalid direction, amount, and date', () => {
    const row: Partial<ImportRow> = {
      direction: null,
      label: '',
      amount: '0',
      date: '2026-02-31',
    }
    const errors = validateImportRow(row)
    expect(errors.map((e) => e.column)).toEqual(expect.arrayContaining(['loai', 'noiDung', 'soTien', 'ngay']))
  })

  it('detects paid greater than amount', () => {
    const row: Partial<ImportRow> = {
      direction: 'In',
      label: 'Tiền sàn về',
      amount: '10000000',
      date: '2026-11-05',
      paid: '12000000',
    }
    const errors = validateImportRow(row)
    expect(errors.some((e) => e.column === 'daThanhToan')).toBe(true)
  })
})

describe('planImport with edited row', () => {
  it('marks row valid when errors are cleared', () => {
    const preview: ImportPreview = {
      fileName: 'test.xlsx',
      fileSha256: 'abc123',
      rows: [
        {
          rowNumber: 2,
          direction: 'Out',
          label: 'Nhập áo phông',
          amount: '10000000',
          date: '2026-11-02',
          paid: '0',
          note: '',
          errors: [],
        },
      ],
      validCount: 1,
      errorCount: 0,
    }

    const planned = planImport(preview, [])
    expect(planned[0].valid).toBe(true)
    expect(planned[0].duplicateOf).toBeNull()
  })
})
