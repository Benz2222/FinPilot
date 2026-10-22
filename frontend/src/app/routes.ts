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

/** `#kich-ban?chia=<id>` → `URLSearchParams` of the part after `?`. */
export function routeParams(): URLSearchParams {
  return new URLSearchParams(window.location.hash.split('?')[1] ?? '')
}

/** Link that opens the scenario builder with a split of one real line pre-filled. */
export function splitScenarioHref(eventId: string): string {
  return `#kich-ban?chia=${encodeURIComponent(eventId)}`
}
