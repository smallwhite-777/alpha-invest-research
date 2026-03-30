import { PrismaClient } from '../generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

// Turso云数据库配置
const tursoUrl = process.env.TURSO_DATABASE_URL || 'libsql://alpha-invest-research-smallwhite-777.aws-ap-northeast-1.turso.io'
const tursoToken = process.env.TURSO_AUTH_TOKEN

const adapter = new PrismaLibSql({
  url: tursoUrl,
  authToken: tursoToken,
})

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma