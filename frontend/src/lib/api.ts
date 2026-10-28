import type { AuditHistoryResponse, ForecastRequest, ForecastResponse, ImportPreview, ProblemDetails } from './types'

/** Failure talking to the API. `status === 0` means the request never got an HTTP response. */
export class ApiError extends Error {
  readonly status: number
  readonly problem: ProblemDetails | null

  constructor(status: number, message: string, problem: ProblemDetails | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
  }
}

let onUnauthorized: () => void = () => {}

/** Called whenever a request that needs a session gets 401 (the session store switches to the login screen). */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

// The anti-forgery token lives in memory only; the matching cookie is set by the server.
let csrf: Promise<string> | null = null

/** Forget the token: it is tied to the signed-in user, so it must be fetched again after login and logout. */
export function resetCsrfToken(): void {
  csrf = null
}

function csrfToken(): Promise<string> {
  csrf ??= request<{ token: string }>('GET', '/api/csrf', {
    expect: (b): b is { token: string } => typeof (b as { token?: unknown } | null)?.token === 'string',
  }).then(
    (b) => b.token,
    (e: unknown) => {
      csrf = null
      throw e
    },
  )
  return csrf
}

async function readProblem(response: Response): Promise<ProblemDetails | null> {
  try {
    const text = await response.text()
    if (!text) return null
    const body: unknown = JSON.parse(text)
    return body && typeof body === 'object' ? (body as ProblemDetails) : null
  } catch {
    return null // empty body, HTML error page, proxy error…
  }
}

export interface RequestOptions<T> {
  /** JSON body (sent with Content-Type: application/json). */
  json?: unknown
  /** Raw body (e.g. FormData). */
  body?: BodyInit
  signal?: AbortSignal
  /** Shape check of the response body; without it the body is ignored. */
  expect?: (body: unknown) => body is T
  /** Send X-CSRF-TOKEN. Defaults to true for POST/PUT/DELETE. */
  csrf?: boolean
  /** A 401 here means "wrong credentials", not "session over" (login, me): don't trigger the login redirect. */
  authFailureIsExpected?: boolean
}

/** Every call to the backend: same-origin cookies, ProblemDetails errors, CSRF on writes, 401 → login. */
export async function request<T = void>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, options: RequestOptions<T> = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  let body = options.body
  if (options.json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.json)
  }
  if (options.csrf ?? method !== 'GET') headers['X-CSRF-TOKEN'] = await csrfToken()

  let response: Response
  try {
    response = await fetch(url, { method, credentials: 'same-origin', headers, body, signal: options.signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'Network error')
  }

  if (!response.ok) {
    const problem = await readProblem(response)
    if (response.status === 401 && !options.authFailureIsExpected) onUnauthorized()
    throw new ApiError(response.status, problem?.title ?? response.statusText, problem)
  }

  if (!options.expect) return undefined as T
  let parsed: unknown
  try {
    parsed = await response.json()
  } catch {
    throw new ApiError(response.status, 'Invalid JSON in response')
  }
  if (!options.expect(parsed)) throw new ApiError(response.status, 'Unexpected response shape')
  return parsed
}

function isForecastResponse(body: unknown): body is ForecastResponse {
  if (!body || typeof body !== 'object') return false
  const b = body as ForecastResponse
  return Array.isArray(b.days) && Array.isArray(b.unresolvedEvents) && Array.isArray(b.eventsAfterHorizon)
}

function isImportPreview(body: unknown): body is ImportPreview {
  if (!body || typeof body !== 'object') return false
  const b = body as ImportPreview
  return typeof b.fileSha256 === 'string' && Array.isArray(b.rows)
}

/** POST /api/forecast/preview: stateless, so no CSRF token is needed. */
export function previewForecast(forecast: ForecastRequest, signal?: AbortSignal): Promise<ForecastResponse> {
  return request('POST', '/api/forecast/preview', { json: forecast, signal, expect: isForecastResponse, csrf: false })
}

/** POST /api/import/preview: parses and validates a CSV/XLSX file; nothing is saved server-side. */
export function previewImport(file: File, signal?: AbortSignal): Promise<ImportPreview> {
  const form = new FormData()
  form.append('file', file)
  return request('POST', '/api/import/preview', { body: form, signal, expect: isImportPreview, csrf: false })
}

export function importTemplateUrl(format: 'csv' | 'xlsx'): string {
  return `/api/import/template?format=${format}`
}

function isAuditHistoryResponse(body: unknown): body is AuditHistoryResponse {
  if (!body || typeof body !== 'object') return false
  const b = body as AuditHistoryResponse
  return Array.isArray(b.items) && typeof b.total === 'number'
}

export function fetchAudit(
  params: { page?: number; pageSize?: number; entityType?: string; action?: string } = {},
  signal?: AbortSignal,
): Promise<AuditHistoryResponse> {
  const q = new URLSearchParams()
  if (params.page) q.set('page', params.page.toString())
  if (params.pageSize) q.set('pageSize', params.pageSize.toString())
  if (params.entityType) q.set('entityType', params.entityType)
  if (params.action) q.set('action', params.action)
  const qs = q.toString()
  return request('GET', `/api/shop/audit${qs ? `?${qs}` : ''}`, { signal, expect: isAuditHistoryResponse })
}
