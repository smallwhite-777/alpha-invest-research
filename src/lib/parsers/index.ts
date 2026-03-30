import mammoth from 'mammoth'
import { parsePDF } from './pdf'

export interface ParsedFile {
  name: string
  content: string
  type: string
}

export interface ParseError {
  fileName: string
  error: string
}

/**
 * 解析 PDF 文件
 */
export async function parsePDFWrapper(buffer: Buffer, fileName: string): Promise<ParsedFile> {
  try {
    return await parsePDF(buffer, fileName)
  } catch (error) {
    throw new Error(`PDF 解析失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 解析 Word 文件 (.docx)
 */
export async function parseWord(buffer: Buffer, fileName: string): Promise<ParsedFile> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    return {
      name: fileName,
      content: result.value,
      type: 'docx',
    }
  } catch (error) {
    throw new Error(`Word 解析失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 解析文本文件
 */
export async function parseText(content: string, fileName: string): Promise<ParsedFile> {
  return {
    name: fileName,
    content: content,
    type: 'text',
  }
}

/**
 * 根据文件类型自动选择解析器
 */
export async function parseFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ParsedFile> {
  // PDF
  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return parsePDFWrapper(fileBuffer, fileName)
  }

  // Word (.docx)
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx')
  ) {
    return parseWord(fileBuffer, fileName)
  }

  // 旧版 Word (.doc) - 暂时不支持，需要额外库
  if (mimeType === 'application/msword' || fileName.endsWith('.doc')) {
    throw new Error('暂不支持 .doc 格式，请转换为 .docx 或 PDF 后上传')
  }

  // 文本文件
  if (
    mimeType.startsWith('text/') ||
    fileName.endsWith('.txt') ||
    fileName.endsWith('.md') ||
    fileName.endsWith('.csv')
  ) {
    return parseText(fileBuffer.toString('utf-8'), fileName)
  }

  throw new Error(`不支持的文件类型: ${mimeType}`)
}

/**
 * 批量解析多个文件
 */
export async function parseFiles(
  files: { name: string; buffer: Buffer; mimeType: string }[]
): Promise<{ parsed: ParsedFile[]; errors: ParseError[] }> {
  const parsed: ParsedFile[] = []
  const errors: ParseError[] = []

  for (const file of files) {
    try {
      const result = await parseFile(file.buffer, file.name, file.mimeType)
      parsed.push(result)
    } catch (error) {
      errors.push({
        fileName: file.name,
        error: error instanceof Error ? error.message : '解析失败',
      })
    }
  }

  return { parsed, errors }
}
