import { ApiError, request } from '../api'
import type { IsoDate } from '../types'
import type { InventoryResponse, ProductInput, ReportGroup, SalesReport, StockDocumentInput } from './types'

/** A failed inventory call as a sentence the owner can act on. */
export class InventoryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InventoryError'
  }
}

function isInventory(body: unknown): body is InventoryResponse {
  if (!body || typeof body !== 'object') return false
  const b = body as InventoryResponse
  return Array.isArray(b.products) && Array.isArray(b.documents)
}

function isReport(body: unknown): body is SalesReport {
  if (!body || typeof body !== 'object') return false
  const b = body as SalesReport
  return Array.isArray(b.periods) && Array.isArray(b.products) && typeof b.totals === 'object' && b.totals !== null
}

/** The server's reason for a 400, as it wrote it (it names the product); the screen puts its own lead-in before it. */
function toInventoryError(e: unknown, saving: boolean): InventoryError {
  const unsaved = saving ? ' Chưa lưu gì cả.' : ''
  if (!(e instanceof ApiError)) return new InventoryError(`Đã có lỗi không mong muốn.${unsaved}`)
  if (e.status === 0) return new InventoryError(`Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.${unsaved}`)
  if (e.status === 401) return new InventoryError('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.')
  if (e.status === 403) return new InventoryError('Tài khoản này không có quyền với dữ liệu của shop.')
  if (e.status === 404) return new InventoryError('Không tìm thấy mục này. Có thể nó đã được xóa, hãy tải lại trang.')
  if (e.status >= 500) return new InventoryError(`Máy chủ gặp sự cố, vui lòng thử lại sau ít phút.${unsaved}`)
  const details = Object.values(e.problem?.errors ?? {}).flat()
  const reason = (details.length > 0 ? details.join(' ') : (e.problem?.detail ?? e.problem?.title ?? '')).trim()
  return new InventoryError(reason ? `${/[.!?]$/.test(reason) ? reason : `${reason}.`}${unsaved}` : `Máy chủ không nhận dữ liệu này.${unsaved}`)
}

async function call(method: 'GET' | 'PUT' | 'DELETE', url: string, json?: unknown): Promise<InventoryResponse> {
  try {
    return await request(method, url, { json, expect: isInventory })
  } catch (e) {
    throw toInventoryError(e, method !== 'GET')
  }
}

const id = (value: string) => encodeURIComponent(value)
const BASE = '/api/shop/inventory'

export const inventoryApi = {
  load: () => call('GET', BASE),
  saveProduct: (p: ProductInput) => call('PUT', `${BASE}/products/${id(p.id)}`, p),
  deleteProduct: (productId: string) => call('DELETE', `${BASE}/products/${id(productId)}`),
  saveDocument: (d: StockDocumentInput) => call('PUT', `${BASE}/documents/${id(d.id)}`, d),
  deleteDocument: (documentId: string) => call('DELETE', `${BASE}/documents/${id(documentId)}`),
  async report(from: IsoDate, to: IsoDate, group: ReportGroup, signal?: AbortSignal): Promise<SalesReport> {
    try {
      return await request('GET', `${BASE}/report?from=${from}&to=${to}&group=${group}`, { expect: isReport, signal })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') throw e
      throw toInventoryError(e, false)
    }
  },
}
