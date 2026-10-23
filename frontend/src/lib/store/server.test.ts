import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { resetCsrfToken } from '../api'
import { checkSession, getSession } from '../session'
import { emptyShop } from '../shop'
import type { Obligation } from '../shop'
import { DuplicateImportError, StoreError } from './repository'
import { createServerRepository } from './server'

const shop = { ...emptyShop(), name: 'Shop Thu', dataVersion: 3 }
const line: Obligation = {
  id: 'a', direction: 'In', label: 'Tiền sàn', amount: '35000000', date: '2026-11-05', note: '', status: 'open', payments: [],
}

type Reply = { status: number; body?: unknown }
let routes: Record<string, Reply>
let calls: { method: string; url: string; headers: Record<string, string> }[]

function json(reply: Reply): Response {
  return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
    status: reply.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  resetCsrfToken()
  calls = []
  routes = { 'GET /api/csrf': { status: 200, body: { token: 'tok-1' } } }
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    const method = init.method ?? 'GET'
    calls.push({ method, url, headers: init.headers as Record<string, string> })
    return json(routes[`${method} ${url}`] ?? { status: 500 })
  })
})

afterEach(() => vi.unstubAllGlobals())

test('every write sends the CSRF token; reads do not', async () => {
  routes['GET /api/shop'] = { status: 200, body: shop }
  routes['PUT /api/shop/obligations/a'] = { status: 200, body: shop }
  routes['DELETE /api/shop/scenarios/s1'] = { status: 200, body: shop }
  routes['PUT /api/shop/data'] = { status: 200, body: shop }
  const repo = createServerRepository()

  await repo.load()
  await repo.saveObligation(line)
  await repo.deleteScenario('s1')
  await repo.replaceAll(emptyShop())

  const writes = calls.filter((c) => c.method !== 'GET')
  expect(writes).toHaveLength(3)
  for (const w of writes) expect(w.headers['X-CSRF-TOKEN']).toBe('tok-1')
  expect(calls.find((c) => c.url === '/api/shop')!.headers['X-CSRF-TOKEN']).toBeUndefined()
})

test('a 409 on import becomes DuplicateImportError with the first commit time', async () => {
  routes['POST /api/shop/imports'] = {
    status: 409,
    body: { title: 'Conflict', status: 409, committedAt: '2026-10-20T08:00:00Z' },
  }
  const error = await createServerRepository()
    .commitImport({ fileSha256: 'a'.repeat(64), fileName: 'mau.csv', obligations: [line] })
    .catch((e: unknown) => e)
  expect(error).toBeInstanceOf(DuplicateImportError)
  expect((error as DuplicateImportError).committedAt).toBe('2026-10-20T08:00:00Z')
})

test('a 401 from the shop API ends the session and shows the login screen', async () => {
  routes['GET /api/auth/me'] = { status: 200, body: { email: 'chu@shop.vn' } }
  await checkSession()
  expect(getSession()).toEqual({ status: 'signed-in', email: 'chu@shop.vn' })

  routes['PUT /api/shop/balance'] = { status: 401 }
  await expect(createServerRepository().setBalance({ amount: '1', cutoff: '2026-10-21' })).rejects.toBeInstanceOf(StoreError)
  expect(getSession()).toEqual({ status: 'anonymous', expired: true })
})
