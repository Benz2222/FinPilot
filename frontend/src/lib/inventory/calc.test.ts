import { describe, expect, test } from 'vitest'
import { documentTotal, matchesSearch, stockLevel, valueOfChange } from './calc'

describe('document and stocktake money', () => {
  test('totals stay exact past the safe-integer range', () => {
    expect(documentTotal([{ quantity: 3, unitPrice: '9007199254740993' }, { quantity: 2, unitPrice: '250000' }])).toBe((3n * 9007199254740993n + 500000n).toString())
  })

  test('a shortfall is negative money and a surplus positive', () => {
    expect(valueOfChange(-3, '120000')).toBe('-360000')
    expect(valueOfChange(2, '120000')).toBe('240000')
  })
})

describe('what is running low', () => {
  test('out at 0, low at or under the product threshold, never low without a threshold', () => {
    expect(stockLevel({ onHand: 0, lowStockAt: 3 })).toBe('out')
    expect(stockLevel({ onHand: 3, lowStockAt: 3 })).toBe('low')
    expect(stockLevel({ onHand: 4, lowStockAt: 3 })).toBe('ok')
    expect(stockLevel({ onHand: 1, lowStockAt: null })).toBe('ok')
  })
})

describe('product search', () => {
  test('finds Vietnamese names typed without accents, including đ', () => {
    expect(matchesSearch({ name: 'Áo sơ mi trắng', code: '' }, 'ao so mi')).toBe(true)
    expect(matchesSearch({ name: 'Đầm lụa', code: 'DL01' }, 'dam')).toBe(true)
    expect(matchesSearch({ name: 'Đầm lụa', code: 'DL01' }, 'dl01')).toBe(true)
    expect(matchesSearch({ name: 'Đầm lụa', code: '' }, 'quan')).toBe(false)
  })
})
