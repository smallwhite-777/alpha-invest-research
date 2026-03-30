import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/webp',
]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: '未上传文件' }, { status: 400 })
    }

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true })

    const results: {
      fileName: string
      fileUrl: string
      fileType: string
      fileSize: number
    }[] = []

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `文件 ${file.name} 超过10MB限制` },
          { status: 400 }
        )
      }

      if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith('.md')) {
        return NextResponse.json(
          { error: `不支持的文件类型: ${file.type}` },
          { status: 400 }
        )
      }

      const ext = path.extname(file.name)
      const uniqueName = `${randomUUID()}${ext}`
      const filePath = path.join(UPLOAD_DIR, uniqueName)
      const buffer = Buffer.from(await file.arrayBuffer())

      await writeFile(filePath, buffer)

      results.push({
        fileName: file.name,
        fileUrl: `/uploads/${uniqueName}`,
        fileType: file.type || ext.replace('.', ''),
        fileSize: file.size,
      })
    }

    return NextResponse.json({ files: results })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: '文件上传失败' }, { status: 500 })
  }
}
