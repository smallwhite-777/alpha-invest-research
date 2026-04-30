import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

import { createClient } from '@libsql/client'

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url || !authToken) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN')
  process.exit(1)
}

const client = createClient({ url, authToken })

async function tableExists(name: string): Promise<boolean> {
  const r = await client.execute({
    sql: `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    args: [name],
  })
  return r.rows.length > 0
}

async function columnExists(table: string, column: string): Promise<boolean> {
  if (!(await tableExists(table))) return false
  const r = await client.execute(`PRAGMA table_info("${table}")`)
  return r.rows.some((row: any) => row.name === column)
}

async function exec(sql: string, label: string) {
  try {
    await client.execute(sql)
    console.log('  ✓', label)
  } catch (err) {
    console.error('  ✗', label, '—', err instanceof Error ? err.message : err)
    throw err
  }
}

async function main() {
  console.log('→ Connecting:', url)
  console.log('→ Listing existing tables…')
  const all = await client.execute(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
  console.log('  existing:', all.rows.map((r: any) => r.name).join(', ') || '(none)')

  console.log('\n→ Creating User table (if missing)…')
  await exec(
    `CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "emailVerified" DATETIME,
      "name" TEXT,
      "image" TEXT,
      "passwordHash" TEXT,
      "phone" TEXT,
      "role" TEXT NOT NULL DEFAULT 'USER',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`,
    'CREATE TABLE User'
  )
  await exec(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`, 'idx User.email unique')
  await exec(`CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email")`, 'idx User.email')
  await exec(`CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role")`, 'idx User.role')

  console.log('\n→ Creating Account table…')
  await exec(
    `CREATE TABLE IF NOT EXISTS "Account" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "provider" TEXT NOT NULL,
      "providerAccountId" TEXT NOT NULL,
      "refresh_token" TEXT,
      "access_token" TEXT,
      "expires_at" INTEGER,
      "token_type" TEXT,
      "scope" TEXT,
      "id_token" TEXT,
      "session_state" TEXT,
      CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
    )`,
    'CREATE TABLE Account'
  )
  await exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider","providerAccountId")`,
    'idx Account composite unique'
  )
  await exec(`CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId")`, 'idx Account.userId')

  console.log('\n→ Creating Session table…')
  await exec(
    `CREATE TABLE IF NOT EXISTS "Session" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "sessionToken" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "expires" DATETIME NOT NULL,
      CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
    )`,
    'CREATE TABLE Session'
  )
  await exec(`CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken")`, 'idx Session.sessionToken unique')
  await exec(`CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId")`, 'idx Session.userId')

  console.log('\n→ Creating VerificationToken table…')
  await exec(
    `CREATE TABLE IF NOT EXISTS "VerificationToken" (
      "identifier" TEXT NOT NULL,
      "token" TEXT NOT NULL,
      "expires" DATETIME NOT NULL
    )`,
    'CREATE TABLE VerificationToken'
  )
  await exec(`CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "VerificationToken"("token")`, 'idx VT.token unique')
  await exec(`CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier","token")`, 'idx VT composite unique')

  console.log('\n→ Creating GuestUsage table…')
  await exec(
    `CREATE TABLE IF NOT EXISTS "GuestUsage" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "guestId" TEXT NOT NULL,
      "kind" TEXT NOT NULL,
      "date" TEXT NOT NULL,
      "count" INTEGER NOT NULL DEFAULT 0,
      "updatedAt" DATETIME NOT NULL
    )`,
    'CREATE TABLE GuestUsage'
  )
  await exec(`CREATE UNIQUE INDEX IF NOT EXISTS "GuestUsage_guestId_kind_date_key" ON "GuestUsage"("guestId","kind","date")`, 'idx GU composite unique')
  await exec(`CREATE INDEX IF NOT EXISTS "GuestUsage_date_idx" ON "GuestUsage"("date")`, 'idx GU.date')

  console.log('\n→ Patching Intelligence (if exists)…')
  if (await tableExists('Intelligence')) {
    if (!(await columnExists('Intelligence', 'isExclusive'))) {
      await exec(`ALTER TABLE "Intelligence" ADD COLUMN "isExclusive" BOOLEAN NOT NULL DEFAULT 0`, 'ALTER add isExclusive')
    } else {
      console.log('  · Intelligence.isExclusive already present')
    }
    if (!(await columnExists('Intelligence', 'authorId'))) {
      await exec(`ALTER TABLE "Intelligence" ADD COLUMN "authorId" TEXT`, 'ALTER add authorId')
    } else {
      console.log('  · Intelligence.authorId already present')
    }
    await exec(`CREATE INDEX IF NOT EXISTS "Intelligence_isExclusive_idx" ON "Intelligence"("isExclusive")`, 'idx Intelligence.isExclusive')
    await exec(`CREATE INDEX IF NOT EXISTS "Intelligence_authorId_idx" ON "Intelligence"("authorId")`, 'idx Intelligence.authorId')
  } else {
    console.log('  ! Intelligence table not found in Turso — skipping (this is a fresh DB; Intelligence will be created when /api/intelligence runs)')
  }

  console.log('\n→ Final table list:')
  const after = await client.execute(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
  console.log('  ', after.rows.map((r: any) => r.name).join(', '))

  console.log('\n✓ Schema push complete')
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    client.close()
  })
