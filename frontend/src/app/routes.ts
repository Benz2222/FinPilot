export type Route = 'lich' | 'du-bao' | 'kich-ban' | 'nhap-file'

export const ROUTES: { id: Route; label: string; short: string }[] = [
  { id: 'lich', label: 'Lịch thu–chi', short: 'Lịch' },
  { id: 'du-bao', label: 'Dự báo', short: 'Dự báo' },
  { id: 'kich-ban', label: 'Kịch bản', short: 'Kịch bản' },
  { id: 'nhap-file', label: 'Nhập từ file', short: 'Nhập file' },
]

export function readRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0]
  return ROUTES.find((r) => r.id === hash)?.id ?? 'lich'
}

/** The bare site address, no hash: signed-out visitors see the landing page there. */
export function isLandingHash(): boolean {
  return window.location.hash.replace(/^#\/?/, '') === ''
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
