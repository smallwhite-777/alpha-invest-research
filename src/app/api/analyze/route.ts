import { NextRequest, NextResponse } from 'next/server'
import { aiService } from '@/lib/ai'
import { parseFiles } from '@/lib/parsers'
import {
  buildLimitReachedPayload,
  buildQuotaInfo,
  checkAndConsumeQuota,
} from '@/lib/guest-quota'

export async function POST(request: NextRequest) {
  try {
    const quota = await checkAndConsumeQuota('AI')
    if (!quota.allowed) {
      return NextResponse.json(buildLimitReachedPayload('AI', quota), { status: 401 })
    }

    const formData = await request.formData()
    const files: File[] = []
    let mode: 'basic' | 'deep' = 'deep'

    // 收集所有上传的文件和参数
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        files.push(value)
      } else if (key === 'mode') {
        mode = value as 'basic' | 'deep'
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: '请上传至少一个文件' },
        { status: 400 }
      )
    }

    // 读取文件内容
    const fileBuffers = await Promise.all(
      files.map(async (file) => {
        const bytes = await file.arrayBuffer()
        return {
          name: file.name,
          buffer: Buffer.from(bytes),
          mimeType: file.type,
        }
      })
    )

    // 解析文件
    const { parsed, errors } = await parseFiles(fileBuffers)

    if (parsed.length === 0) {
      return NextResponse.json(
        { error: '文件解析失败', details: errors },
        { status: 400 }
      )
    }

    // 执行 AI 分析（根据 mode 选择基础或深度分析）
    const result = await aiService.analyze(
      parsed.map((p) => ({ name: p.name, content: p.content })),
      mode
    )

    return NextResponse.json({
      result,
      parsedFiles: parsed.map((p) => p.name),
      errors: errors.length > 0 ? errors : undefined,
      quota: buildQuotaInfo(quota, 'AI'),
    })
  } catch (error) {
    console.error('分析失败:', error)
    const errorMessage = error instanceof Error ? error.message : '分析过程中出现错误'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
