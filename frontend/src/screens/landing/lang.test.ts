import { expect, test } from 'vitest'
import { preferredLang } from './lang'

test('a first visit opens in Vietnamese when the browser ranks Vietnamese above English, else in English', () => {
  expect(preferredLang(['vi-VN', 'en-US'])).toBe('vi')
  expect(preferredLang(['fr-FR', 'vi'])).toBe('vi')
  expect(preferredLang(['en-US', 'vi-VN'])).toBe('en')
  expect(preferredLang(['ja-JP'])).toBe('en')
})
