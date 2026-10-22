import { expect, test } from 'vitest'
import { createLocalRepository } from './local'
import { DuplicateImportError } from './repository'
import type { Obligation } from '../shop'

function memory() {
  const map = new Map<string, string>()
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) }
}

const line: Obligation = {
  id: 'a', direction: 'In', label: 'Tiền sàn', amount: '35000000', date: '2026-11-05', note: '', status: 'open', payments: [],
}

test('committing the same file twice is blocked and adds nothing the second time', async () => {
  const storage = memory()
  const repo = createLocalRepository(() => storage)
  const first = await repo.commitImport({ fileSha256: 'abc', fileName: 'mau.csv', obligations: [line] })
  expect(first.obligations).toHaveLength(1)

  await expect(repo.commitImport({ fileSha256: 'abc', fileName: 'copy.csv', obligations: [{ ...line, id: 'b' }] }))
    .rejects.toBeInstanceOf(DuplicateImportError)
  expect((await repo.load()).obligations).toHaveLength(1)
})
