import { ApiError, request } from '../api'
import type { ShopData } from '../shop'
import { DuplicateImportError, NoShopError, StoreError } from './repository'
import type { Shop, ShopRepository } from './repository'

function isShop(body: unknown): body is Shop {
  if (!body || typeof body !== 'object') return false
  const b = body as Shop
  return (
    b.version === 1 &&
    typeof b.name === 'string' &&
    Array.isArray(b.obligations) &&
    Array.isArray(b.scenarios) &&
    Array.isArray(b.imports)
  )
}

/** A failed call as a message the owner can act on. 401 has already sent the app to the login screen. */
function toStoreError(e: unknown, saving: boolean): StoreError {
  const unsaved = saving ? ' Thay đổi vừa rồi chưa được lưu.' : ''
  if (!(e instanceof ApiError)) return new StoreError(`Đã có lỗi không mong muốn.${unsaved}`)
  if (e.status === 0) return new StoreError(`Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.${unsaved}`)
  if (e.status === 401) return new StoreError('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.')
  if (e.status === 403) return new StoreError('Tài khoản này không có quyền với dữ liệu của shop.')
  if (e.status >= 500) return new StoreError(`Máy chủ gặp sự cố, vui lòng thử lại sau ít phút.${unsaved}`)
  const details = Object.values(e.problem?.errors ?? {}).flat()
  const reason = details.length > 0 ? details.join(' ') : (e.problem?.detail ?? e.problem?.title ?? `HTTP ${e.status}`)
  return new StoreError(`Máy chủ không nhận dữ liệu này: ${reason}.${unsaved}`)
}

async function call(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, json?: unknown): Promise<Shop> {
  try {
    return await request(method, url, { json, expect: isShop })
  } catch (e) {
    throw toStoreError(e, method !== 'GET')
  }
}

const id = (value: string) => encodeURIComponent(value)

/** The shop's data on the FinPilot API (cookie session, one shop per account). */
export function createServerRepository(): ShopRepository {
  return {
    location: 'server',
    async load() {
      try {
        return await request('GET', '/api/shop', { expect: isShop })
      } catch (e) {
        if (e instanceof ApiError && e.status === 404 && e.problem?.type?.endsWith('no-shop')) throw new NoShopError()
        throw toStoreError(e, false)
      }
    },
    createShop: (name) => call('POST', '/api/shop', { name }),
    setBalance: (balance) => call('PUT', '/api/shop/balance', balance),
    saveObligation: (o) => call('PUT', `/api/shop/obligations/${id(o.id)}`, o),
    deleteObligation: (obligationId) => call('DELETE', `/api/shop/obligations/${id(obligationId)}`),
    async commitImport(batch) {
      try {
        return await request('POST', '/api/shop/imports', { json: batch, expect: isShop })
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          const committedAt = (e.problem as { committedAt?: unknown } | null)?.committedAt
          throw new DuplicateImportError(typeof committedAt === 'string' ? committedAt : '')
        }
        throw toStoreError(e, true)
      }
    },
    saveScenario: (s) => call('PUT', `/api/shop/scenarios/${id(s.id)}`, s),
    deleteScenario: (scenarioId) => call('DELETE', `/api/shop/scenarios/${id(scenarioId)}`),
    replaceAll: (data: ShopData) => call('PUT', '/api/shop/data', data),
  }
}
