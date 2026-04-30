import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { hash } from 'bcryptjs'

const tursoUrl =
  process.env.TURSO_DATABASE_URL ||
  process.env.DATABASE_URL?.replace(/^file:/, 'file:') ||
  'file:./prisma/dev.db'

const adapter = new PrismaLibSql({
  url: tursoUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const prisma = new PrismaClient({ adapter })

async function main() {
  const raw = process.env.ADMIN_EMAILS ?? ''
  const emails = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  if (emails.length === 0) {
    console.error('未配置 ADMIN_EMAILS，请在 .env.local 中以逗号分隔填写 3 个管理员邮箱')
    process.exit(1)
  }

  const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@2026'
  const passwordHash = await hash(defaultPassword, 10)

  console.log(`Seeding ${emails.length} admin user(s)...`)
  for (const email of emails) {
    const user = await prisma.user.upsert({
      where: { email },
      update: { role: 'ADMIN' },
      create: {
        email,
        passwordHash,
        role: 'ADMIN',
        name: email.split('@')[0],
      },
      select: { id: true, email: true, role: true, createdAt: true },
    })
    console.log(`  ✓ ${user.email}  [${user.role}]`)
  }

  console.log('')
  console.log(`管理员默认密码: ${defaultPassword}`)
  console.log('请在首次登录后立即在 /account 修改密码。')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
