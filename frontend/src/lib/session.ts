import { ApiError, request, resetCsrfToken, setUnauthorizedHandler } from './api'

export type Session =
  | { status: 'checking' }
  /** `expired`: the server ended a session that was open in this tab. */
  | { status: 'anonymous'; expired?: boolean }
  /** `confirmationSent`: the account was just registered, and the server mailed a confirmation link. */
  | { status: 'signed-in'; email: string; confirmationSent?: boolean }

let state: Session = { status: 'checking' }
const listeners = new Set<() => void>()

/*
 * "This device was signed in last time." Without it the signed-out pages show while the first session check is
 * still running (a cold API can take a minute); with it the app waits, so a returning owner never sees them flash.
 * Blocked storage counts as no hint.
 */
const HINT = 'fp.hadSession'

export function hadSession(): boolean {
  try {
    return localStorage.getItem(HINT) === '1'
  } catch {
    return false
  }
}

function setHint(on: boolean) {
  try {
    if (on) localStorage.setItem(HINT, '1')
    else localStorage.removeItem(HINT)
  } catch {
    // Storage blocked: behave as a device without the hint.
  }
}

function set(next: Session) {
  state = next
  if (next.status !== 'checking') setHint(next.status === 'signed-in')
  for (const l of listeners) l()
}

export function getSession(): Session {
  return state
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Any 401 outside the login calls means the cookie is gone: back to the login screen.
setUnauthorizedHandler(() => {
  if (state.status !== 'anonymous') set({ status: 'anonymous', expired: state.status === 'signed-in' })
})

const isMe = (b: unknown): b is { email: string } => typeof (b as { email?: unknown } | null)?.email === 'string'

let latestCheck = 0

/**
 * GET /api/auth/me: who is signed in (401 → anonymous). Other failures are thrown so the caller can offer a retry.
 * Only the latest check counts: a slow first check must not undo a sign-in made while it was running.
 */
export async function checkSession(): Promise<void> {
  const check = ++latestCheck
  try {
    const me = await request('GET', '/api/auth/me', { expect: isMe, authFailureIsExpected: true })
    if (check === latestCheck) set({ status: 'signed-in', email: me.email })
  } catch (e) {
    if (check !== latestCheck) return
    if (e instanceof ApiError && e.status === 401) set({ status: 'anonymous' })
    else throw e
  }
}

export interface Credentials {
  email: string
  password: string
}

export async function signIn(credentials: Credentials, { justRegistered = false } = {}): Promise<void> {
  await request('POST', '/api/auth/login', { json: credentials, authFailureIsExpected: true })
  resetCsrfToken()
  await checkSession()
  if (justRegistered && state.status === 'signed-in') set({ ...state, confirmationSent: true })
}

export async function register(credentials: Credentials): Promise<void> {
  await request('POST', '/api/auth/register', { json: credentials, authFailureIsExpected: true })
}

export async function signOut(): Promise<void> {
  try {
    await request('POST', '/api/auth/logout', { authFailureIsExpected: true })
  } finally {
    resetCsrfToken()
    set({ status: 'anonymous' })
  }
}

export async function forgotPassword(email: string): Promise<void> {
  await request('POST', '/api/auth/forgotPassword', { json: { email }, authFailureIsExpected: true })
}

export async function resetPassword(email: string, resetCode: string, newPassword: string): Promise<void> {
  await request('POST', '/api/auth/resetPassword', { json: { email, resetCode, newPassword }, authFailureIsExpected: true })
}

/** The link from the confirmation mail: passes its query string (`userId`, `code`, sometimes `changedEmail`) on as is. */
export async function confirmEmail(query: string): Promise<void> {
  await request('GET', `/api/auth/confirmEmail${query}`, { authFailureIsExpected: true })
}

/** Sends a new confirmation link. The API answers the same whether or not the address has an account. */
export async function resendConfirmationEmail(email: string): Promise<void> {
  await request('POST', '/api/auth/resendConfirmationEmail', { json: { email }, authFailureIsExpected: true })
}
