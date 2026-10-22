import { emptyShop } from '../shop'
import type { ShopData } from '../shop'
import { DuplicateImportError, StoreError } from './repository'
import type { ShopRepository } from './repository'

export const STORAGE_KEY = 'finpilot.shop.v1'

/** Minimal slice of the Web Storage API, so tests can pass an in-memory map. */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function isShopData(value: unknown): value is ShopData {
  if (!value || typeof value !== 'object') return false
  const v = value as ShopData
  return v.version === 1 && Array.isArray(v.obligations) && Array.isArray(v.scenarios) && Array.isArray(v.imports)
}

/** Shop data in the browser's localStorage. Holds business data only, never credentials. */
export function createLocalRepository(storage: () => KeyValueStorage = () => window.localStorage): ShopRepository {
  function read(): ShopData {
    let text: string | null
    try {
      text = storage().getItem(STORAGE_KEY)
    } catch {
      throw new StoreError('Trình duyệt không cho đọc dữ liệu đã lưu (có thể đang ở chế độ riêng tư hoặc bị chặn lưu trữ).')
    }
    if (text === null) return emptyShop()
    try {
      const parsed: unknown = JSON.parse(text)
      if (isShopData(parsed)) return parsed
    } catch {
      // fall through
    }
    throw new StoreError('Dữ liệu đã lưu trên trình duyệt bị hỏng hoặc không đúng định dạng.')
  }

  function write(data: ShopData): ShopData {
    try {
      storage().setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      throw new StoreError('Không lưu được vào trình duyệt (bộ nhớ đầy hoặc bị chặn). Thay đổi vừa rồi chưa được lưu.')
    }
    return data
  }

  async function update(change: (data: ShopData) => ShopData): Promise<ShopData> {
    return write(change(read()))
  }

  return {
    location: 'browser',
    load: async () => read(),
    setBalance: (balance) => update((d) => ({ ...d, balance })),
    saveObligation: (o) =>
      update((d) => ({
        ...d,
        obligations: d.obligations.some((x) => x.id === o.id)
          ? d.obligations.map((x) => (x.id === o.id ? o : x))
          : [...d.obligations, o],
      })),
    deleteObligation: (id) => update((d) => ({ ...d, obligations: d.obligations.filter((x) => x.id !== id) })),
    commitImport: (batch) =>
      update((d) => {
        const previous = d.imports.find((r) => r.fileSha256 === batch.fileSha256)
        if (previous) throw new DuplicateImportError(previous.committedAt)
        return {
          ...d,
          obligations: [...d.obligations, ...batch.obligations],
          imports: [
            ...d.imports,
            {
              fileSha256: batch.fileSha256,
              fileName: batch.fileName,
              committedAt: new Date().toISOString(),
              lineCount: batch.obligations.length,
            },
          ],
        }
      }),
    saveScenario: (s) =>
      update((d) => ({
        ...d,
        scenarios: d.scenarios.some((x) => x.id === s.id)
          ? d.scenarios.map((x) => (x.id === s.id ? s : x))
          : [...d.scenarios, s],
      })),
    deleteScenario: (id) => update((d) => ({ ...d, scenarios: d.scenarios.filter((x) => x.id !== id) })),
    replaceAll: async (data) => write(data),
  }
}
