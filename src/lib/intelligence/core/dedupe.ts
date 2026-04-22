import type { NormalizedIntelligenceDocument } from './types'

export function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/\r/g, '')
    .replace(/\u0000/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeFingerprint(value: string | null | undefined): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[“”"'`’‘]/g, '')
    .replace(/[，。；：、！!？?（）()\[\]\-—_]/g, '')
    .replace(/\s+/g, '')
}

export function buildDocumentDedupeKey(document: Pick<NormalizedIntelligenceDocument, 'sourceCode' | 'title' | 'summary'>): string {
  return [
    document.sourceCode,
    normalizeFingerprint(document.title),
    normalizeFingerprint(document.summary),
  ].join('::')
}

export function dedupeNormalizedDocuments<T extends NormalizedIntelligenceDocument>(documents: T[]): T[] {
  const deduped = new Map<string, T>()

  for (const document of [...documents].sort((left, right) => {
    const leftDate = left.publishedAt || left.capturedAt
    const rightDate = right.publishedAt || right.capturedAt
    return rightDate.localeCompare(leftDate)
  })) {
    const key = document.dedupeKey || buildDocumentDedupeKey(document)
    if (!deduped.has(key)) {
      deduped.set(key, document)
    }
  }

  return Array.from(deduped.values())
}
