// PDF 解析器 - 直接使用 pdfjs-dist legacy build
// 用 dynamic import + file:// URL 加载，绕过 Next.js RSC 打包问题

import path from 'path'
import { pathToFileURL } from 'url'

export async function parsePDF(buffer: Buffer, fileName: string): Promise<{ name: string; content: string; type: string }> {
  try {
    const pdfjsPath = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs')
    const pdfjsLib = await import(/* webpackIgnore: true */ pathToFileURL(pdfjsPath).href)

    const data = new Uint8Array(buffer)
    const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise

    const textParts: string[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item: any) => item.str)
        .join('')
      textParts.push(pageText)
    }

    const text = textParts.join('\n').trim()

    if (text.length === 0) {
      throw new Error('PDF 内容为空或无法提取文本（可能是扫描版PDF）')
    }

    return {
      name: fileName,
      content: text,
      type: 'pdf',
    }
  } catch (error) {
    if (error instanceof Error && (error.message.includes('empty') || error.message.includes('无法提取'))) {
      throw error
    }
    throw new Error(`PDF 解析失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}
