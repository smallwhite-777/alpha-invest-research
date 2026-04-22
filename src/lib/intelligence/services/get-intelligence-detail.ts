import { prisma } from '@/lib/db'
import { toLegacyIntelligenceItem } from '@/lib/intelligence/adapters/to-legacy-intelligence'

export async function getIntelligenceDetailById(id: string) {
  const document = await prisma.intelligenceDocument.findUnique({
    where: { id },
    include: {
      source: { select: { name: true } },
      tags: { include: { tag: { select: { name: true } } } },
      sectors: true,
    },
  })

  if (document) {
    return {
      ...toLegacyIntelligenceItem(document),
      attachments: [],
    }
  }

  return prisma.intelligence.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      sectors: true,
      stocks: true,
      attachments: true,
    },
  })
}
