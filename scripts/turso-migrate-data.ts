import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

import { createClient, type Client, type Row } from '@libsql/client'

const oldUrl = process.env.OLD_TURSO_DATABASE_URL
const oldToken = process.env.OLD_TURSO_AUTH_TOKEN
const newUrl = process.env.TURSO_DATABASE_URL
const newToken = process.env.TURSO_AUTH_TOKEN

if (!oldUrl || !oldToken) {
  console.error('Missing OLD_TURSO_DATABASE_URL / OLD_TURSO_AUTH_TOKEN in env')
  console.error('Set them in .env.local before running, e.g.:')
  console.error('  OLD_TURSO_DATABASE_URL=libsql://alpha-invest-research-smallwhite-777...turso.io')
  console.error('  OLD_TURSO_AUTH_TOKEN=eyJ...')
  process.exit(1)
}
if (!newUrl || !newToken) {
  console.error('Missing TURSO_DATABASE_URL / TURSO_AUTH_TOKEN (target/new DB)')
  process.exit(1)
}
if (oldUrl === newUrl) {
  console.error('Refusing to copy: old and new DB URLs are identical')
  process.exit(1)
}

const dryRun = process.argv.includes('--dry-run')
const truncateNew = process.argv.includes('--truncate')

// 数据表按 FK 依赖顺序排列（被依赖的在前）
const TABLES_IN_ORDER: string[] = [
  // 独立表
  'Source',
  'Stock',
  'Tag',
  'Entity',
  'MacroIndicator',
  'IntelligenceEvent',
  'Intelligence',
  // 一级依赖
  'IngestionJob',
  'Attachment',
  'IntelligenceTag',
  'IntelligenceSector',
  'IntelligenceStock',
  'FinancialData',
  'ValuationData',
  'WatchlistItem',
  'MacroDataPoint',
  // 二级依赖
  'RawDocument',
  'IntelligenceDocument',
  'DocumentTag',
  'DocumentSector',
  'DocumentEntity',
]

// 不迁移的表：Auth 体系的表保留新库的版本
const SKIP_TABLES = new Set(['User', 'Account', 'Session', 'VerificationToken', 'GuestUsage'])

interface ColumnInfo {
  name: string
  type: string
  notnull: number
  pk: number
}

async function getColumns(client: Client, table: string): Promise<ColumnInfo[]> {
  const r = await client.execute(`PRAGMA table_info("${table}")`)
  return r.rows.map((row) => ({
    name: String(row.name),
    type: String(row.type),
    notnull: Number(row.notnull),
    pk: Number(row.pk),
  }))
}

async function tableExists(client: Client, table: string): Promise<boolean> {
  const r = await client.execute({
    sql: `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    args: [table],
  })
  return r.rows.length > 0
}

async function rowCount(client: Client, table: string): Promise<number> {
  const r = await client.execute(`SELECT COUNT(*) AS c FROM "${table}"`)
  const first = r.rows[0]
  if (!first) return 0
  const value = first.c
  return typeof value === 'number' ? value : Number(value)
}

function placeholders(n: number): string {
  return Array.from({ length: n }, () => '?').join(', ')
}

async function copyTable(
  oldClient: Client,
  newClient: Client,
  table: string,
  options: { dryRun: boolean; truncate: boolean }
) {
  if (!(await tableExists(oldClient, table))) {
    console.log(`  · ${table}: skip (does not exist in source)`)
    return { copied: 0, skipped: 0 }
  }
  if (!(await tableExists(newClient, table))) {
    console.log(`  ! ${table}: skip (does not exist in target — run schema sync first)`)
    return { copied: 0, skipped: 0 }
  }

  const sourceCount = await rowCount(oldClient, table)
  if (sourceCount === 0) {
    console.log(`  · ${table}: 0 rows in source, nothing to copy`)
    return { copied: 0, skipped: 0 }
  }

  const targetColsInfo = await getColumns(newClient, table)
  const sourceColsInfo = await getColumns(oldClient, table)
  const targetColNames = new Set(targetColsInfo.map((c) => c.name))
  const commonCols = sourceColsInfo
    .map((c) => c.name)
    .filter((name) => targetColNames.has(name))

  if (commonCols.length === 0) {
    console.log(`  ! ${table}: no overlapping columns between source and target — skip`)
    return { copied: 0, skipped: sourceCount }
  }

  if (options.truncate) {
    if (options.dryRun) {
      console.log(`  · ${table}: would TRUNCATE target (${await rowCount(newClient, table)} rows)`)
    } else {
      const before = await rowCount(newClient, table)
      await newClient.execute(`DELETE FROM "${table}"`)
      console.log(`  ↺ ${table}: cleared ${before} target rows`)
    }
  }

  const colList = commonCols.map((c) => `"${c}"`).join(', ')
  const selectSql = `SELECT ${colList} FROM "${table}"`
  const insertSql = `INSERT OR REPLACE INTO "${table}" (${colList}) VALUES (${placeholders(commonCols.length)})`

  const pageSize = 500
  let offset = 0
  let copied = 0

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const page = await oldClient.execute(`${selectSql} LIMIT ${pageSize} OFFSET ${offset}`)
    if (page.rows.length === 0) break

    if (options.dryRun) {
      copied += page.rows.length
      offset += page.rows.length
      if (page.rows.length < pageSize) break
      continue
    }

    const tx = await newClient.transaction('write')
    try {
      for (const row of page.rows as Row[]) {
        const args = commonCols.map((c) => {
          const v = (row as unknown as Record<string, unknown>)[c]
          return v === undefined ? null : (v as string | number | bigint | ArrayBuffer | null)
        })
        await tx.execute({ sql: insertSql, args })
      }
      await tx.commit()
    } catch (err) {
      await tx.rollback()
      throw err
    }

    copied += page.rows.length
    offset += page.rows.length
    if (page.rows.length < pageSize) break
  }

  console.log(`  ✓ ${table}: copied ${copied} / ${sourceCount} rows`)
  return { copied, skipped: 0 }
}

async function main() {
  console.log('====================')
  console.log(' Turso data migration')
  console.log('====================')
  console.log('  source:', oldUrl)
  console.log('  target:', newUrl)
  console.log('  mode:  ', dryRun ? 'DRY RUN' : 'WRITE')
  console.log('  truncate target tables first:', truncateNew)
  console.log()

  const oldClient = createClient({ url: oldUrl!, authToken: oldToken! })
  const newClient = createClient({ url: newUrl!, authToken: newToken! })

  let totalCopied = 0
  for (const table of TABLES_IN_ORDER) {
    if (SKIP_TABLES.has(table)) continue
    try {
      const r = await copyTable(oldClient, newClient, table, { dryRun, truncate: truncateNew })
      totalCopied += r.copied
    } catch (err) {
      console.error(`  ✗ ${table} FAILED:`, err instanceof Error ? err.message : err)
      throw err
    }
  }

  console.log()
  console.log(`Done. ${dryRun ? 'Would copy' : 'Copied'} ${totalCopied} rows total.`)

  oldClient.close()
  newClient.close()
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
