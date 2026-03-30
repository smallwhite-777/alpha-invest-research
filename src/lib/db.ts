import { PrismaClient } from '../generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

// Turso云数据库配置
// 注意：PrismaLibSql adapter需要https://格式的URL
const tursoUrl = process.env.TURSO_DATABASE_URL || 'https://alpha-invest-research-smallwhite-777.aws-ap-northeast-1.turso.io'
const tursoToken = process.env.TURSO_AUTH_TOKEN

if (!tursoToken) {
  console.warn('TURSO_AUTH_TOKEN not configured - database operations will fail')
}

const adapter = new PrismaLibSql({
  url: tursoUrl,
  authToken: tursoToken,
})

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma