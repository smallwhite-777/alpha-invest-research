'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { Check, Copy, ChevronDown, ChevronRight, Brain, FileText } from 'lucide-react'

interface MarkdownRendererProps {
  content: string
  className?: string
}

// 代码块组件
function CodeBlock({ language, code }: { language?: string; code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-border bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              已复制
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              复制
            </>
          )}
        </button>
      </div>
      {/* Code */}
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code className="text-foreground font-mono">{code}</code>
      </pre>
    </div>
  )
}

// 思考过程组件
function ThinkingBlock({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="my-3 rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-primary/10 transition-colors"
      >
        <Brain className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-medium text-primary">思考过程</span>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-primary ml-auto" />
        ) : (
          <ChevronRight className="h-4 w-4 text-primary ml-auto" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap border-t border-primary/10">
          {content}
        </div>
      )}
    </div>
  )
}

// 解析内容，提取think块
function parseContent(content: string) {
  const thinkPattern = /<think>([\s\S]*?)<\/think>/g
  const parts: { type: 'think' | 'content'; text: string }[] = []

  let lastIndex = 0
  let match

  while ((match = thinkPattern.exec(content)) !== null) {
    // 添加think之前的内容
    if (match.index > lastIndex) {
      const beforeText = content.slice(lastIndex, match.index).trim()
      if (beforeText) {
        parts.push({ type: 'content', text: beforeText })
      }
    }
    // 添加think内容
    if (match[1].trim()) {
      parts.push({ type: 'think', text: match[1].trim() })
    }
    lastIndex = match.index + match[0].length
  }

  // 添加最后的内容
  if (lastIndex < content.length) {
    const afterText = content.slice(lastIndex).trim()
    if (afterText) {
      parts.push({ type: 'content', text: afterText })
    }
  }

  // 如果没有分割，返回全部内容
  if (parts.length === 0 && content.trim()) {
    parts.push({ type: 'content', text: content })
  }

  return parts
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const parts = parseContent(content)

  return (
    <div className={cn('markdown-content space-y-1', className)}>
      {parts.map((part, idx) => (
        <div key={idx}>
          {part.type === 'think' ? (
            <ThinkingBlock content={part.text} />
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // 标题
                h1: ({ children }) => (
                  <h1 className="text-xl font-bold text-foreground mt-6 mb-3 pb-2 border-b border-border">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg font-bold text-foreground mt-5 mb-2">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-semibold text-foreground mt-4 mb-2">
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-sm font-semibold text-foreground mt-3 mb-1">
                    {children}
                  </h4>
                ),
                // 段落
                p: ({ children }) => (
                  <p className="text-sm text-foreground leading-7 my-2">
                    {children}
                  </p>
                ),
                // 列表
                ul: ({ children }) => (
                  <ul className="my-2 ml-4 space-y-1 list-disc marker:text-muted-foreground">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="my-2 ml-4 space-y-1 list-decimal marker:text-muted-foreground">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-sm text-foreground leading-7 pl-1">
                    {children}
                  </li>
                ),
                // 强调
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-foreground/90">
                    {children}
                  </em>
                ),
                // 链接
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline underline-offset-2"
                  >
                    {children}
                  </a>
                ),
                // 代码块
                pre: ({ children }) => {
                  // 检查是否有代码元素
                  if (children && typeof children === 'object' && 'props' in children) {
                    const codeEl = children as React.ReactElement<{ children?: React.ReactNode; className?: string }>
                    const codeContent = codeEl.props?.children || ''
                    const className = codeEl.props?.className || ''
                    const match = /language-(\w+)/.exec(className)
                    const language = match ? match[1] : undefined

                    // 如果是多行代码块
                    if (typeof codeContent === 'string' && codeContent.includes('\n')) {
                      return <CodeBlock language={language} code={codeContent} />
                    }
                  }
                  return (
                    <pre className="my-2 p-3 rounded-lg bg-muted/50 border border-border overflow-x-auto text-sm">
                      {children}
                    </pre>
                  )
                },
                code: ({ className, children }) => {
                  const match = /language-(\w+)/.exec(className || '')
                  const isInline = !match && typeof children === 'string' && !children.includes('\n')

                  if (isInline) {
                    return (
                      <code className="px-1.5 py-0.5 rounded bg-muted text-primary text-xs font-mono">
                        {children}
                      </code>
                    )
                  }
                  return <code className={className}>{children}</code>
                },
                // 引用
                blockquote: ({ children }) => (
                  <blockquote className="my-3 pl-4 pr-3 py-2 border-l-4 border-primary/50 bg-muted/30 rounded-r-lg">
                    {children}
                  </blockquote>
                ),
                // 分割线
                hr: () => (
                  <hr className="my-4 border-border" />
                ),
                // 表格
                table: ({ children }) => (
                  <div className="my-3 overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-muted/50">
                    {children}
                  </thead>
                ),
                tbody: ({ children }) => (
                  <tbody className="divide-y divide-border">
                    {children}
                  </tbody>
                ),
                tr: ({ children }) => (
                  <tr className="hover:bg-muted/30 transition-colors">
                    {children}
                  </tr>
                ),
                th: ({ children }) => (
                  <th className="px-4 py-2.5 text-left font-semibold text-foreground">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-2 text-foreground">
                    {children}
                  </td>
                ),
              }}
            >
              {part.text}
            </ReactMarkdown>
          )}
        </div>
      ))}
    </div>
  )
}