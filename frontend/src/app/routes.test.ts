import { afterEach, expect, test, vi } from 'vitest'
import { isLandingHash } from './routes'

afterEach(() => vi.unstubAllGlobals())

test('the landing page owns the bare address and its section anchors; sign-in, sign-up and app hashes do not', () => {
  const landing = (hash: string) => {
    vi.stubGlobal('window', { location: { hash } })
    return isLandingHash()
  }
  for (const hash of ['', '#', '#pricing', '#faq', '#board']) expect(landing(hash), hash).toBe(true)
  for (const hash of ['#dang-nhap', '#dang-ky', '#quen-mat-khau', '#du-bao', '#kich-ban?chia=x', '#pricingx']) expect(landing(hash), hash).toBe(false)
})
