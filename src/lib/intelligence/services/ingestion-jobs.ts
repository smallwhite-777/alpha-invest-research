import { prisma } from '@/lib/db'

export async function ensureSourceRecord(params: {
  code: string
  name: string
  type?: string
}) {
  return prisma.source.upsert({
    where: { code: params.code },
    update: {
      name: params.name,
      type: params.type || 'news',
      isEnabled: true,
    },
    create: {
      code: params.code,
      name: params.name,
      type: params.type || 'news',
      isEnabled: true,
    },
  })
}

export async function startIngestionJob(params: {
  sourceId: string
  jobType: string
  inputCursor?: string
}) {
  return prisma.ingestionJob.create({
    data: {
      sourceId: params.sourceId,
      jobType: params.jobType,
      status: 'running',
      inputCursor: params.inputCursor,
    },
  })
}

export async function finishIngestionJob(params: {
  jobId: string
  status: 'success' | 'failed' | 'partial'
  totalFetched: number
  totalNormalized: number
  totalInserted: number
  totalSkipped: number
  outputCursor?: string
  errorMessage?: string
}) {
  return prisma.ingestionJob.update({
    where: { id: params.jobId },
    data: {
      status: params.status,
      totalFetched: params.totalFetched,
      totalNormalized: params.totalNormalized,
      totalInserted: params.totalInserted,
      totalSkipped: params.totalSkipped,
      outputCursor: params.outputCursor,
      errorMessage: params.errorMessage,
      finishedAt: new Date(),
    },
  })
}

export async function listRecentIngestionJobs(limit = 20) {
  return prisma.ingestionJob.findMany({
    include: {
      source: {
        select: {
          code: true,
          name: true,
        },
      },
    },
    orderBy: { startedAt: 'desc' },
    take: limit,
  })
}
