import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

import { createClient } from '@libsql/client'
import { readFileSync } from 'node:fs'

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN
const schemaPath = process.argv[2] || '/tmp/full-schema.sql'

if (!url || !authToken) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN')
  process.exit(1)
}

const client = createClient({ url, authToken })

function splitStatements(sql: string): string[] {
  // very small SQL splitter: rely on newline + ");"-style boundaries.
  // sqlite .schema output puts every statement on its own block ending with `;`.
  const lines = sql.split('\n')
  const statements: string[] = []
  let buf: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed === 'BEGIN TRANSACTION;' || trimmed === 'COMMIT;') continue
    if (trimmed.startsWith('-- ')) continue
    buf.push(line)
    if (trimmed.endsWith(';')) {
      const stmt = buf.join('\n').trim()
      if (stmt) statements.push(stmt)
      buf = []
    }
  }
  if (buf.length) {
    const stmt = buf.join('\n').trim()
    if (stmt) statements.push(stmt)
  }
  return statements
}

async function main() {
  const raw = readFileSync(schemaPath, 'utf-8')
  const stmts = splitStatements(raw)
  console.log(`→ Loaded ${stmts.length} statements from ${schemaPath}`)
  console.log('→ Connecting to Turso:', url)

  const before = await client.execute(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
  console.log('  before:', before.rows.map((r: any) => r.name).join(', ') || '(none)')

  let ok = 0
  let skipped = 0
  for (const stmt of stmts) {
    // CREATE TABLE / CREATE INDEX — wrap with IF NOT EXISTS by patching the prefix
    let sql = stmt
    if (/^CREATE TABLE\s+(?!IF NOT EXISTS)/i.test(sql)) {
      sql = sql.replace(/^CREATE TABLE\s+/i, 'CREATE TABLE IF NOT EXISTS ')
    } else if (/^CREATE UNIQUE INDEX\s+(?!IF NOT EXISTS)/i.test(sql)) {
      sql = sql.replace(/^CREATE UNIQUE INDEX\s+/i, 'CREATE UNIQUE INDEX IF NOT EXISTS ')
    } else if (/^CREATE INDEX\s+(?!IF NOT EXISTS)/i.test(sql)) {
      sql = sql.replace(/^CREATE INDEX\s+/i, 'CREATE INDEX IF NOT EXISTS ')
    }

    try {
      await client.execute(sql)
      ok++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('already exists')) {
        skipped++
        continue
      }
      console.error('✗ Failed:', sql.slice(0, 80).replace(/\s+/g, ' '))
      console.error('   →', msg)
      throw err
    }
  }

  console.log(`✓ Applied ${ok} statements (${skipped} already-exists skipped)`)

  const after = await client.execute(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
  console.log('  after:', after.rows.map((r: any) => r.name).join(', '))
}

main()
  .catch((e) => {
    console.error('Sync failed:', e)
    process.exit(1)
  })
  .finally(() => client.close())
