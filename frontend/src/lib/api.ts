import type { ForecastRequest, ForecastResponse, ImportPreview, ProblemDetails } from './types'

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

/** POST /api/forecast/preview. Auth is the backend's HttpOnly cookie, so nothing is stored client-side. */
export async function previewForecast(
  request: ForecastRequest,
  signal?: AbortSignal,
): Promise<ForecastResponse> {
  return send(
    '/api/forecast/preview',
    { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) },
    isForecastResponse,
    signal,
  )
}

/** POST /api/import/preview: parses and validates a CSV/XLSX file; nothing is saved server-side. */
export async function previewImport(file: File, signal?: AbortSignal): Promise<ImportPreview> {
  const form = new FormData()
  form.append('file', file)
  return send('/api/import/preview', { body: form }, isImportPreview, signal)
}

export function importTemplateUrl(format: 'csv' | 'xlsx'): string {
  return `/api/import/template?format=${format}`
}

async function send<T>(
  url: string,
  init: { headers?: Record<string, string>; body: BodyInit },
  isExpected: (body: unknown) => body is T,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...init.headers },
      body: init.body,
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'Network error')
  }

  if (!response.ok) {
    const problem = await readProblem(response)
    throw new ApiError(response.status, problem?.title ?? response.statusText, problem)
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new ApiError(response.status, 'Invalid JSON in response')
  }
  if (!isExpected(body)) throw new ApiError(response.status, 'Unexpected response shape')
  return body
}
