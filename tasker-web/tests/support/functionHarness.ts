import { readFileSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import type { D1Database, D1Value } from '../../functions/_shared/db.ts'

const projectRoot = fileURLToPath(new URL('../../', import.meta.url))

export function readProjectFile(path: string) {
  return readFileSync(resolve(projectRoot, path), 'utf8')
}

// Pages uses extensionless TypeScript imports. Load the real handlers in memory
// without rewriting their imports or replacing their SQL with mocks.
export function loadFunction<T>(path: string): T {
  const cache = new Map<string, Record<string, unknown>>()
  function load(filename: string): Record<string, unknown> {
    const file = extname(filename) ? filename : `${filename}.ts`
    const cached = cache.get(file)
    if (cached) return cached
    const exports = {}
    cache.set(file, exports)
    const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
    })
    runInNewContext(outputText, {
      exports, Response, Request, URL, Date, Error, crypto, Intl,
      require: (name: string) => {
        if (!name.startsWith('.')) throw new Error(`Unexpected external import: ${name}`)
        return load(resolve(dirname(file), name))
      },
    })
    return exports
  }
  return load(resolve(projectRoot, path)) as T
}

export function sqliteBinding(sqlite: DatabaseSync): D1Database {
  // Execute statements synchronously inside a batch, as one D1 transaction.
  const execute = new WeakMap<object, () => { results: unknown[]; meta: { changes: number } }>()
  return {
    prepare(query) {
      let values: D1Value[] = []
      const statement = {
        bind(...input) { values = input; return this },
        async all<T>() {
          return { results: sqlite.prepare(query).all(...values) as T[], meta: {} }
        },
        async first<T>() {
          return (sqlite.prepare(query).get(...values) ?? null) as T | null
        },
        async run() {
          const result = sqlite.prepare(query).run(...values)
          return { results: [], meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } }
        },
      }
      execute.set(statement, () => {
        const rows = sqlite.prepare(query).all(...values)
        return { results: rows, meta: { changes: Number(sqlite.prepare('SELECT changes() n').get()?.n) } }
      })
      return statement
    },
    async batch<T>(statements: ReturnType<D1Database['prepare']>[]) {
      sqlite.exec('BEGIN')
      try {
        const result = statements.map(statement => execute.get(statement)!() as { results: T[]; meta: {changes: number} })
        sqlite.exec('COMMIT')
        return result
      } catch (error) {
        sqlite.exec('ROLLBACK')
        throw error
      }
    },
  }
}
