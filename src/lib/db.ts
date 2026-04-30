import { PrismaClient } from '../generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const tursoUrl = process.env.TURSO_DATABASE_URL
const tursoToken = process.env.TURSO_AUTH_TOKEN

const useTurso = Boolean(tursoUrl && tursoToken)

const localUrl = (() => {
  const raw = process.env.DATABASE_URL || 'file:./dev.db'
  if (raw.startsWith('file:')) return raw
  return `file:${raw}`
})()

const adapter = new PrismaLibSql(
  useTurso
    ? { url: tursoUrl as string, authToken: tursoToken }
    : { url: localUrl }
)

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
