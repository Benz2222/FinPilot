import type { BalanceSnapshot, Obligation, Scenario, ShopData } from '../shop'

export interface ImportCommit {
  fileSha256: string
  fileName: string
  obligations: Obligation[]
}

/** The shop as the server returns it after every read and write. */
export interface Shop extends ShopData {
  name: string
  dataVersion: number
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

/** The signed-in account has no shop yet: the app asks for its name. */
export class NoShopError extends Error {
  constructor() {
    super('No shop')
    this.name = 'NoShopError'
  }
}

/** Reading or writing the shop's data failed; `message` is ready to show to the owner. */
export class StoreError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StoreError'
  }
}

/** Every read and write of the shop's data goes through this interface. Each write resolves to the full, updated shop. */
export interface ShopRepository {
  /** Where the data lives; the UI tells the user. */
  readonly location: 'server'
  /** Rejects with NoShopError when the account has no shop yet. */
  load(): Promise<Shop>
  createShop(name: string): Promise<Shop>
  setBalance(balance: BalanceSnapshot): Promise<Shop>
  saveObligation(obligation: Obligation): Promise<Shop>
  deleteObligation(id: string): Promise<Shop>
  commitImport(batch: ImportCommit): Promise<Shop>
  saveScenario(scenario: Scenario): Promise<Shop>
  deleteScenario(id: string): Promise<Shop>
  /** Replace everything (demo data, or wipe with an empty shop). */
  replaceAll(data: ShopData): Promise<Shop>
}
