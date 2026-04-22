import { prisma } from '@/lib/db'
import { ensureSourceRecord } from '@/lib/intelligence/services/ingestion-jobs'
import type { NormalizedIntelligenceDocument } from './types'

export interface UpsertNormalizedDocumentResult {
  documentId: string
  legacyDocumentId?: string
  inserted: boolean
  skipped: boolean
}

async function ensureTagRelations(tagNames: string[]) {
  return Promise.all(
    tagNames.map(async tagName => {
      const tag = await prisma.tag.upsert({
        where: { name: tagName },
        update: {},
        create: { name: tagName },
      })
      return { tagId: tag.id }
    })
  )
}

async function ensureRawDocument(sourceId: string, document: NormalizedIntelligenceDocument, jobId?: string) {
  const payload = JSON.stringify(document.metadata ?? {})
  return prisma.rawDocument.upsert({
    where: {
      sourceId_externalId: {
        sourceId,
        externalId: document.externalId,
      },
    },
    update: {
      publishedAt: document.publishedAt ? new Date(document.publishedAt) : null,
      capturedAt: new Date(document.capturedAt),
      jobId,
      titleRaw: document.title,
      summaryRaw: document.summary,
      contentRaw: document.content,
      authorRaw: document.authorName,
      languageRaw: document.language,
      rawPayload: payload,
      parseStatus: 'normalized',
    },
    create: {
      sourceId,
      externalId: document.externalId,
      externalUrl: document.externalUrl,
      publishedAt: document.publishedAt ? new Date(document.publishedAt) : null,
      capturedAt: new Date(document.capturedAt),
      jobId,
      titleRaw: document.title,
      summaryRaw: document.summary,
      contentRaw: document.content,
      authorRaw: document.authorName,
      languageRaw: document.language,
      rawPayload: payload,
      parseStatus: 'normalized',
    },
  })
}

async function ensureEntity(entity: NormalizedIntelligenceDocument['entities'][number]) {
  const normalizedName = entity.name.trim().toLowerCase()
  const existing = await prisma.entity.findFirst({
    where: {
      type: entity.type,
      normalizedName,
      ticker: entity.ticker ?? null,
    },
  })

  if (existing) return existing

  return prisma.entity.create({
    data: {
      type: entity.type,
      name: entity.name,
      normalizedName,
      ticker: entity.ticker,
    },
  })
}

async function syncNewDocumentRelations(documentId: string, document: NormalizedIntelligenceDocument) {
  await prisma.documentTag.deleteMany({ where: { documentId } })
  await prisma.documentSector.deleteMany({ where: { documentId } })
  await prisma.documentEntity.deleteMany({ where: { documentId } })

  if (document.tags.length) {
    const tagRelations = await ensureTagRelations(document.tags)
    for (const relation of tagRelations) {
      await prisma.documentTag.create({
        data: {
          documentId,
          tagId: relation.tagId,
        },
      })
    }
  }

  for (const sector of document.sectors) {
    await prisma.documentSector.create({
      data: {
        documentId,
        sectorCode: sector.code,
        sectorName: sector.name,
      },
    })
  }

  for (const entity of document.entities) {
    const createdEntity = await ensureEntity(entity)
    await prisma.documentEntity.create({
      data: {
        documentId,
        entityId: createdEntity.id,
      },
    })
  }
}

export async function upsertNormalizedDocument(
  document: NormalizedIntelligenceDocument,
  dryRun = false,
  jobId?: string
): Promise<UpsertNormalizedDocumentResult> {
  if (dryRun) {
    return {
      documentId: `dry-run:new:${document.externalId}`,
      legacyDocumentId: `dry-run:legacy:${document.externalId}`,
      inserted: true,
      skipped: false,
    }
  }

  const source = await ensureSourceRecord({
    code: document.sourceCode,
    name: document.sourceName,
    type: 'news',
  })

  const rawDocument = await ensureRawDocument(source.id, document, jobId)

  const existing = await prisma.intelligenceDocument.findFirst({
    where: document.dedupeKey
      ? {
          OR: [
            { rawDocumentId: rawDocument.id },
            { dedupeKey: document.dedupeKey },
          ],
        }
      : { rawDocumentId: rawDocument.id },
    select: { id: true },
  })

  let documentId = existing?.id

  if (!documentId) {
    const created = await prisma.intelligenceDocument.create({
      data: {
        sourceId: source.id,
        rawDocumentId: rawDocument.id,
        title: document.title,
        summary: document.summary,
        content: document.content,
        category: document.category,
        importance: document.importance,
        publishedAt: document.publishedAt ? new Date(document.publishedAt) : null,
        capturedAt: new Date(document.capturedAt),
        authorName: document.authorName,
        language: document.language,
        region: document.region,
        isTranslated: document.language === 'zh',
        dedupeKey: document.dedupeKey,
        qualityScore: document.qualityScore,
        metadataJson: document.metadata ? JSON.stringify(document.metadata) : null,
      },
      select: { id: true },
    })
    documentId = created.id
  } else {
    await prisma.intelligenceDocument.update({
      where: { id: documentId },
      data: {
        sourceId: source.id,
        rawDocumentId: rawDocument.id,
        title: document.title,
        summary: document.summary,
        content: document.content,
        category: document.category,
        importance: document.importance,
        publishedAt: document.publishedAt ? new Date(document.publishedAt) : null,
        capturedAt: new Date(document.capturedAt),
        authorName: document.authorName,
        language: document.language,
        region: document.region,
        isTranslated: document.language === 'zh',
        dedupeKey: document.dedupeKey,
        qualityScore: document.qualityScore,
        metadataJson: document.metadata ? JSON.stringify(document.metadata) : null,
      },
    })
  }

  await syncNewDocumentRelations(documentId, document)

  const legacy = await upsertNormalizedDocumentLegacy(document, false)

  return {
    documentId,
    legacyDocumentId: legacy.documentId,
    inserted: !existing,
    skipped: Boolean(existing),
  }
}

export async function upsertNormalizedDocumentLegacy(
  document: NormalizedIntelligenceDocument,
  dryRun = false
): Promise<UpsertNormalizedDocumentResult> {
  if (dryRun) {
    return { documentId: `dry-run:${document.externalId}`, inserted: true, skipped: false }
  }

  const existing = await prisma.intelligence.findFirst({
    where: {
      source: document.sourceName,
      OR: [
        { title: document.title },
        { summary: document.summary },
      ],
    },
    select: { id: true },
  })

  if (existing) {
    await prisma.intelligenceTag.deleteMany({ where: { intelligenceId: existing.id } })
    await prisma.intelligenceSector.deleteMany({ where: { intelligenceId: existing.id } })

    await prisma.intelligence.update({
      where: { id: existing.id },
      data: {
        title: document.title,
        content: document.content,
        summary: document.summary,
        category: document.category,
        importance: document.importance,
        source: document.sourceName,
        authorName: document.authorName || 'WSJ Importer',
        createdAt: document.publishedAt ? new Date(document.publishedAt) : new Date(document.capturedAt),
        tags: document.tags.length
          ? { create: await ensureTagRelations(document.tags) }
          : undefined,
        sectors: document.sectors.length
          ? {
              create: document.sectors.map(sector => ({
                sectorCode: sector.code,
                sectorName: sector.name,
              })),
            }
          : undefined,
      },
    })

    return { documentId: existing.id, inserted: false, skipped: true }
  }

  const created = await prisma.intelligence.create({
    data: {
      title: document.title,
      content: document.content,
      summary: document.summary,
      category: document.category,
      importance: document.importance,
      source: document.sourceName,
      authorName: document.authorName || 'WSJ Importer',
      createdAt: document.publishedAt ? new Date(document.publishedAt) : new Date(document.capturedAt),
      tags: document.tags.length
        ? { create: await ensureTagRelations(document.tags) }
        : undefined,
      sectors: document.sectors.length
        ? {
            create: document.sectors.map(sector => ({
              sectorCode: sector.code,
              sectorName: sector.name,
            })),
          }
        : undefined,
    },
    select: { id: true },
  })

  return { documentId: created.id, inserted: true, skipped: false }
}
