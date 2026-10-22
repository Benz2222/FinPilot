import type { BalanceSnapshot, Obligation, Scenario, ShopData } from '../shop'

export interface ImportCommit {
  fileSha256: string
  fileName: string
  obligations: Obligation[]
}

/** The same file (by SHA-256) was already committed once. */
export class DuplicateImportError extends Error {
  readonly committedAt: string
  constructor(committedAt: string) {
    super('File already imported')
    this.name = 'DuplicateImportError'
    this.committedAt = committedAt
  }
}

/** Reading or writing the shop's data failed (storage full, blocked, corrupt…). */
export class StoreError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StoreError'
  }
}

/**
 * Every read and write of the shop's data goes through this interface. Today it is backed by the browser
 * (see `local.ts`); a backend API can implement it later without UI changes. Each write resolves to the
 * full, updated shop.
 */
export interface ShopRepository {
  /** Where the data lives; the UI tells the user. */
  readonly location: 'browser' | 'server'
  load(): Promise<ShopData>
  setBalance(balance: BalanceSnapshot): Promise<ShopData>
  saveObligation(obligation: Obligation): Promise<ShopData>
  deleteObligation(id: string): Promise<ShopData>
  commitImport(batch: ImportCommit): Promise<ShopData>
  saveScenario(scenario: Scenario): Promise<ShopData>
  deleteScenario(id: string): Promise<ShopData>
  /** Replace everything (demo data, or wipe with an empty shop). */
  replaceAll(data: ShopData): Promise<ShopData>
}
