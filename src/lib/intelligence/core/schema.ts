import { prisma } from '@/lib/db'

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "Source" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "configJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Source_code_key" ON "Source"("code")`,
  `CREATE TABLE IF NOT EXISTS "IngestionJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "inputCursor" TEXT,
    "outputCursor" TEXT,
    "totalFetched" INTEGER NOT NULL DEFAULT 0,
    "totalNormalized" INTEGER NOT NULL DEFAULT 0,
    "totalInserted" INTEGER NOT NULL DEFAULT 0,
    "totalSkipped" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    CONSTRAINT "IngestionJob_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "IngestionJob_sourceId_startedAt_idx" ON "IngestionJob"("sourceId", "startedAt")`,
  `CREATE INDEX IF NOT EXISTS "IngestionJob_status_idx" ON "IngestionJob"("status")`,
  `CREATE TABLE IF NOT EXISTS "RawDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "jobId" TEXT,
    "externalId" TEXT NOT NULL,
    "externalUrl" TEXT,
    "publishedAt" DATETIME,
    "capturedAt" DATETIME NOT NULL,
    "titleRaw" TEXT,
    "summaryRaw" TEXT,
    "contentRaw" TEXT,
    "authorRaw" TEXT,
    "languageRaw" TEXT,
    "rawPayload" TEXT NOT NULL,
    "rawHash" TEXT,
    "parseStatus" TEXT NOT NULL DEFAULT 'parsed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RawDocument_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RawDocument_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "IngestionJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "RawDocument_sourceId_externalId_key" ON "RawDocument"("sourceId", "externalId")`,
  `CREATE INDEX IF NOT EXISTS "RawDocument_sourceId_publishedAt_idx" ON "RawDocument"("sourceId", "publishedAt")`,
  `CREATE TABLE IF NOT EXISTS "IntelligenceEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "canonicalTitle" TEXT NOT NULL,
    "canonicalSummary" TEXT,
    "category" TEXT NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 3,
    "firstSeenAt" DATETIME NOT NULL,
    "lastSeenAt" DATETIME NOT NULL,
    "sourceCount" INTEGER NOT NULL DEFAULT 1,
    "documentCount" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "IntelligenceEvent_lastSeenAt_idx" ON "IntelligenceEvent"("lastSeenAt")`,
  `CREATE INDEX IF NOT EXISTS "IntelligenceEvent_category_importance_idx" ON "IntelligenceEvent"("category", "importance")`,
  `CREATE TABLE IF NOT EXISTS "IntelligenceDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "rawDocumentId" TEXT,
    "eventId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 3,
    "publishedAt" DATETIME,
    "capturedAt" DATETIME NOT NULL,
    "authorName" TEXT,
    "language" TEXT,
    "region" TEXT,
    "isTranslated" BOOLEAN NOT NULL DEFAULT false,
    "dedupeKey" TEXT,
    "qualityScore" REAL,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IntelligenceDocument_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IntelligenceDocument_rawDocumentId_fkey" FOREIGN KEY ("rawDocumentId") REFERENCES "RawDocument" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "IntelligenceDocument_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "IntelligenceEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "IntelligenceDocument_sourceId_publishedAt_idx" ON "IntelligenceDocument"("sourceId", "publishedAt")`,
  `CREATE INDEX IF NOT EXISTS "IntelligenceDocument_eventId_idx" ON "IntelligenceDocument"("eventId")`,
  `CREATE INDEX IF NOT EXISTS "IntelligenceDocument_category_importance_idx" ON "IntelligenceDocument"("category", "importance")`,
  `CREATE INDEX IF NOT EXISTS "IntelligenceDocument_dedupeKey_idx" ON "IntelligenceDocument"("dedupeKey")`,
  `CREATE TABLE IF NOT EXISTS "DocumentTag" (
    "documentId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    PRIMARY KEY ("documentId", "tagId"),
    CONSTRAINT "DocumentTag_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "IntelligenceDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "DocumentSector" (
    "documentId" TEXT NOT NULL,
    "sectorCode" TEXT NOT NULL,
    "sectorName" TEXT NOT NULL,
    PRIMARY KEY ("documentId", "sectorCode"),
    CONSTRAINT "DocumentSector_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "IntelligenceDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "DocumentSector_sectorCode_idx" ON "DocumentSector"("sectorCode")`,
  `CREATE TABLE IF NOT EXISTS "Entity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "ticker" TEXT,
    "exchange" TEXT,
    "metadataJson" TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS "Entity_type_normalizedName_idx" ON "Entity"("type", "normalizedName")`,
  `CREATE TABLE IF NOT EXISTS "DocumentEntity" (
    "documentId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "role" TEXT,
    PRIMARY KEY ("documentId", "entityId"),
    CONSTRAINT "DocumentEntity_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "IntelligenceDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentEntity_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "DocumentEntity_entityId_idx" ON "DocumentEntity"("entityId")`,
]

export async function ensureIntelligenceStoreSchema() {
  for (const statement of SCHEMA_STATEMENTS) {
    await prisma.$executeRawUnsafe(statement)
  }
}
