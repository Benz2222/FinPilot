import { beforeEach, expect, test, vi } from 'vitest'

type Reply = { status: number; body?: unknown }
let replies: Record<string, (() => Promise<Reply>)[]>
let storage: Map<string, string>

const respond = (r: Reply) =>
  new Response(r.body === undefined ? null : JSON.stringify(r.body), { status: r.status, headers: { 'Content-Type': 'application/json' } })

beforeEach(() => {
  vi.resetModules()
  replies = { 'GET /api/csrf': [async () => ({ status: 200, body: { token: 't' } })] }
  vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
    const key = `${init.method ?? 'GET'} ${url.split('?')[0]}`
    const queue = replies[key] ?? []
    const next = queue.length > 1 ? queue.shift()! : queue[0]
    return respond(await next())
  })
  storage = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
    removeItem: (k: string) => void storage.delete(k),
  })
})

test('a sign-in made while a slow first check runs is not undone when that check answers 401', async () => {
  const session = await import('./session')
  let answerFirst!: (r: Reply) => void
  replies['GET /api/auth/me'] = [
    () => new Promise<Reply>((resolve) => (answerFirst = resolve)),
    async () => ({ status: 200, body: { email: 'thu@shop.vn' } }),
  ]
  replies['POST /api/auth/login'] = [async () => ({ status: 200 })]

  const first = session.checkSession()
  await session.signIn({ email: 'thu@shop.vn', password: 'x' })
  answerFirst({ status: 401 })
  await first

  expect(session.getSession()).toEqual({ status: 'signed-in', email: 'thu@shop.vn' })
})

test('the device hint follows the session and blocked storage counts as no hint', async () => {
  const session = await import('./session')
  const me = async () => ({ status: 200, body: { email: 'thu@shop.vn' } })
  replies['GET /api/auth/me'] = [me, async () => ({ status: 401 }), me]
  replies['POST /api/auth/logout'] = [async () => ({ status: 200 })]

  await session.checkSession()
  expect(session.hadSession()).toBe(true)
  await session.checkSession() // the cookie expired
  expect(session.hadSession()).toBe(false)
  await session.checkSession()
  await session.signOut()
  expect(session.hadSession()).toBe(false)

  vi.stubGlobal('localStorage', {
    getItem: () => {
      throw new DOMException('blocked', 'SecurityError')
    },
  })
  expect(session.hadSession()).toBe(false)
})
