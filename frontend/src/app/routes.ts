export type Route = 'lich' | 'du-bao' | 'kich-ban' | 'nhap-file' | 'lich-su' | 'kho-hang' | 'doanh-thu'

/** `tab`: a tab on the phone bar. `more`: behind its "Khác" tab (a phone bar fits five). */
export const ROUTES: { id: Route; label: string; short: string; group: 'tien' | 'hang'; phone: 'tab' | 'more' }[] = [
  { id: 'lich', label: 'Lịch thu–chi', short: 'Lịch', group: 'tien', phone: 'tab' },
  { id: 'du-bao', label: 'Dự báo', short: 'Dự báo', group: 'tien', phone: 'tab' },
  { id: 'kich-ban', label: 'Kịch bản', short: 'Kịch bản', group: 'tien', phone: 'more' },
  { id: 'nhap-file', label: 'Nhập từ file', short: 'Nhập file', group: 'tien', phone: 'more' },
  { id: 'lich-su', label: 'Lịch sử thay đổi', short: 'Lịch sử', group: 'tien', phone: 'more' },
  { id: 'kho-hang', label: 'Kho hàng', short: 'Kho hàng', group: 'hang', phone: 'tab' },
  { id: 'doanh-thu', label: 'Doanh thu', short: 'Doanh thu', group: 'hang', phone: 'tab' },
]

export function readRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0]
  return ROUTES.find((r) => r.id === hash)?.id ?? 'lich'
}

/** Sections of the landing page. Its nav scrolls without touching the hash, but a shared `/#pricing` lands there too. */
export const LANDING_SECTIONS = ['board', 'checklist', 'case', 'pricing', 'faq'] as const
export type LandingSection = (typeof LANDING_SECTIONS)[number]

/** The bare site address or one of its sections: signed-out visitors see the landing page there. */
export function isLandingHash(): boolean {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return hash === '' || (LANDING_SECTIONS as readonly string[]).includes(hash)
}

/** Screens shown before sign-in. Any other hash (e.g. `#du-bao`) shows login and is kept for after it. */
export type AuthView = 'dang-nhap' | 'dang-ky' | 'quen-mat-khau'

export function readAuthView(): AuthView {
  const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0]
  return hash === 'dang-ky' || hash === 'quen-mat-khau' ? hash : 'dang-nhap'
}

/** `#kich-ban?chia=<id>` → `URLSearchParams` of the part after `?`. */
export function routeParams(): URLSearchParams {
  return new URLSearchParams(window.location.hash.split('?')[1] ?? '')
}

/** Link that opens the scenario builder with a split of one real line pre-filled. */
export function splitScenarioHref(eventId: string): string {
  return `#kich-ban?chia=${encodeURIComponent(eventId)}`
}

/** What the Kho hàng screen is doing, from `#kho-hang?viec=…`. No `viec` is the stock list. */
export type StockTask = 'nhap' | 'ban' | 'xuat' | 'kiem-ke' | 'them-sp'

export function stockHref(task?: StockTask, documentId?: string): string {
  const query = new URLSearchParams()
  if (task) query.set('viec', task)
  if (documentId) query.set('phieu', documentId)
  const text = query.toString()
  return `#kho-hang${text ? `?${text}` : ''}`
}
