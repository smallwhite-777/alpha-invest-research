'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { INTELLIGENCE_CATEGORIES, IMPORTANCE_LEVELS, SW_SECTORS } from '@/lib/constants'
import { X, Plus, Upload, FileText, Loader2, Check, Wand2, Paperclip, AlertCircle } from 'lucide-react'
import { useDropzone } from 'react-dropzone'

interface AutoCompleteResult {
  title: string
  summary: string
  category: string
  importance: number
  tags: string[]
  relatedStocks: { symbol: string; name: string }[]
  relatedSectors: { code: string; name: string }[]
}

interface UploadedFile {
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
}

export default function CreateIntelligencePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAutoCompleting, setIsAutoCompleting] = useState(false)
  const [autoCompleteResult, setAutoCompleteResult] = useState<AutoCompleteResult | null>(null)
  const [autoCompleteError, setAutoCompleteError] = useState('')

  // 输入内容
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  // AI补全后的字段（可修改）
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [category, setCategory] = useState('')
  const [importance, setImportance] = useState('3')
  const [source, setSource] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [selectedSectors, setSelectedSectors] = useState<{ code: string; name: string }[]>([])
  const [stocks, setStocks] = useState<{ symbol: string; name: string }[]>([])

  // 标签/股票输入
  const [tagInput, setTagInput] = useState('')
  const [stockInput, setStockInput] = useState('')

  // 文件上传处理
  const onDrop = (acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles])
    // 清除之前的AI分析结果，因为内容变了
    setAutoCompleteError('')
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/csv': ['.csv'],
    },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // 上传文件到服务器
  const uploadFilesToServer = async (): Promise<UploadedFile[]> => {
    if (files.length === 0) return []

    const formData = new FormData()
    files.forEach(file => formData.append('files', file))

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || '文件上传失败')
    }

    const data = await response.json()
    return data.files
  }

  // AI 智能分析 - 生成标题、摘要、分类等所有字段
  const handleAutoComplete = async () => {
    if (!content && files.length === 0) {
      setAutoCompleteError('请输入正文或上传附件，至少提供一项内容')
      return
    }

    setIsAutoCompleting(true)
    setAutoCompleteError('')

    try {
      // 使用 FormData 发送，支持文件
      const formData = new FormData()
      if (content) {
        formData.append('content', content)
      }
      // 将实际文件发送给AI分析（服务端会解析PDF/Word等）
      files.forEach(file => formData.append('files', file))

      const response = await fetch('/api/intelligence/auto-complete', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        setAutoCompleteResult(result)
        // 自动填充AI返回的结果
        if (result.title) setTitle(result.title)
        setSummary(result.summary || '')
        setCategory(result.category || 'NEWS')
        setImportance(result.importance?.toString() || '3')
        setTags(result.tags || [])
        setSelectedSectors(result.relatedSectors || [])
        setStocks(result.relatedStocks || [])
      } else {
        const err = await response.json().catch(() => ({}))
        setAutoCompleteError(err.error || 'AI分析失败，请手动填写信息')
      }
    } catch (error) {
      console.error('Auto-complete error:', error)
      setAutoCompleteError('AI分析失败，请检查网络后重试')
    } finally {
      setIsAutoCompleting(false)
    }
  }

  // 标签操作
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  // 股票操作
  const handleAddStock = () => {
    const parts = stockInput.trim().split(/[\s,]+/)
    if (parts.length >= 1) {
      const symbol = parts[0]
      const name = parts[1] || symbol
      if (!stocks.find(s => s.symbol === symbol)) {
        setStocks([...stocks, { symbol, name }])
        setStockInput('')
      }
    }
  }

  const handleRemoveStock = (symbol: string) => {
    setStocks(stocks.filter(s => s.symbol !== symbol))
  }

  // 行业操作
  const toggleSector = (sector: { code: string; name: string }) => {
    if (selectedSectors.find(s => s.code === sector.code)) {
      setSelectedSectors(selectedSectors.filter(s => s.code !== sector.code))
    } else {
      setSelectedSectors([...selectedSectors, sector])
    }
  }

  // 提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title) {
      setAutoCompleteError('标题不能为空，请先使用AI分析生成或手动填写标题')
      return
    }
    if (!content && files.length === 0) {
      setAutoCompleteError('正文或附件至少填写一项')
      return
    }

    setIsSubmitting(true)
    try {
      // 先上传文件
      let uploaded = uploadedFiles
      if (files.length > 0 && uploadedFiles.length === 0) {
        uploaded = await uploadFilesToServer()
        setUploadedFiles(uploaded)
      }

      const response = await fetch('/api/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: content || (files.length > 0 ? `[附件] ${files.map(f => f.name).join(', ')}` : ''),
          summary: summary || undefined,
          category: category || 'NEWS',
          importance: parseInt(importance) || 3,
          source: source || undefined,
          authorName: authorName || '匿名',
          tags,
          sectors: selectedSectors,
          stocks,
          attachments: uploaded,
        }),
      })

      if (response.ok) {
        router.push('/intelligence')
      } else {
        setAutoCompleteError('创建失败，请重试')
      }
    } catch (error) {
      console.error('Error creating intelligence:', error)
      setAutoCompleteError('创建失败，请检查网络')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 是否有输入内容可以分析
  const hasInput = content.trim().length > 0 || files.length > 0
  // 是否可以提交
  const canSubmit = title && (content || files.length > 0)

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">录入情报</h1>
          <p className="text-sm text-muted-foreground mt-1">
            填写正文或上传附件，AI将自动生成标题、摘要、分类等信息
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 第一步：输入内容 */}
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-chart-1 flex items-center justify-center text-xs text-white">1</span>
                输入情报内容
              </h2>

              {/* 正文 */}
              <div className="space-y-2">
                <Label className="text-foreground">
                  正文内容
                  <span className="text-xs text-muted-foreground font-normal ml-2">可直接粘贴文字、研报摘录、新闻等</span>
                </Label>
                <Textarea
                  value={content}
                  onChange={(e) => { setContent(e.target.value); setAutoCompleteError('') }}
                  placeholder="粘贴或输入情报内容（支持Markdown格式）&#10;&#10;例如：&#10;- 某公司最新调研纪要&#10;- 产业链上下游变化信息&#10;- 政策传闻或新闻摘录"
                  className="bg-background border-border text-foreground min-h-[180px]"
                />
              </div>

              {/* 附件上传 */}
              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  上传附件
                  <span className="text-xs text-muted-foreground font-normal">支持 PDF、Word、TXT、Markdown、CSV（最大10MB）</span>
                </Label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-chart-1 bg-chart-1/10' : 'border-border hover:border-chart-1/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {isDragActive ? '松开即可上传' : '拖拽文件到此处，或点击选择'}
                  </p>
                </div>

                {files.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-4 w-4 text-chart-1 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm text-foreground truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI 分析按钮 */}
              <div className="flex items-center gap-4 pt-2">
                <Button
                  type="button"
                  onClick={handleAutoComplete}
                  disabled={isAutoCompleting || !hasInput}
                  className="bg-gradient-to-r from-chart-1 to-chart-2 text-white hover:opacity-90"
                >
                  {isAutoCompleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      AI 智能分析中...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      AI 智能分析
                    </>
                  )}
                </Button>
                {autoCompleteResult && (
                  <span className="text-sm text-chart-1 flex items-center gap-1">
                    <Check className="h-4 w-4" />
                    AI已生成标题和分类信息，请确认下方内容
                  </span>
                )}
                {!hasInput && (
                  <span className="text-xs text-muted-foreground">
                    请先输入正文或上传附件
                  </span>
                )}
              </div>

              {autoCompleteError && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {autoCompleteError}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 第二步：AI生成结果（可修改） */}
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-chart-2 flex items-center justify-center text-xs text-white">2</span>
                情报信息
                <span className="text-xs text-muted-foreground font-normal">
                  {autoCompleteResult ? '（AI已生成，可修改）' : '（AI分析后自动填充，也可手动填写）'}
                </span>
              </h2>

              {/* 标题 - AI生成，可修改 */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-foreground">
                  标题 *
                  <span className="text-xs text-muted-foreground font-normal ml-2">
                    {autoCompleteResult ? 'AI已生成' : '点击上方"AI智能分析"自动生成'}
                  </span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={autoCompleteResult ? '' : 'AI分析后自动生成，也可手动输入'}
                  className="bg-background border-border text-foreground"
                />
              </div>

              {/* 摘要 */}
              <div className="space-y-2">
                <Label htmlFor="summary" className="text-foreground">摘要</Label>
                <Textarea
                  id="summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="AI自动生成的摘要，可修改"
                  className="bg-background border-border text-foreground min-h-[80px]"
                />
              </div>

              {/* 分类和重要程度 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground">分类</Label>
                  <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue placeholder="选择分类" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {INTELLIGENCE_CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value} className="text-foreground">
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">重要程度</Label>
                  <Select value={importance} onValueChange={(v) => v && setImportance(v)}>
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue placeholder="选择重要程度" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {IMPORTANCE_LEVELS.map(l => (
                        <SelectItem key={l.value} value={l.value.toString()} className="text-foreground">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                            {l.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 关联行业 */}
              <div className="space-y-2">
                <Label className="text-foreground">关联行业</Label>
                <div className="flex flex-wrap gap-2">
                  {SW_SECTORS.map(sector => (
                    <Badge
                      key={sector.code}
                      variant={selectedSectors.find(s => s.code === sector.code) ? 'default' : 'outline'}
                      className={`cursor-pointer ${
                        selectedSectors.find(s => s.code === sector.code)
                          ? 'bg-chart-1 text-white'
                          : 'border-border text-muted-foreground hover:border-chart-1'
                      }`}
                      onClick={() => toggleSector(sector)}
                    >
                      {sector.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 标签 */}
              <div className="space-y-2">
                <Label className="text-foreground">标签</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="输入标签，按回车添加"
                    className="bg-background border-border text-foreground"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddTag} className="border-border">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="bg-chart-3/20 text-chart-3">
                      {tag}
                      <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => handleRemoveTag(tag)} />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 关联标的 */}
              <div className="space-y-2">
                <Label className="text-foreground">关联标的</Label>
                <div className="flex gap-2">
                  <Input
                    value={stockInput}
                    onChange={(e) => setStockInput(e.target.value)}
                    placeholder="输入代码和名称，如：600519 贵州茅台"
                    className="bg-background border-border text-foreground"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddStock())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddStock} className="border-border">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stocks.map(stock => (
                    <Badge key={stock.symbol} className="bg-chart-2/20 text-chart-2">
                      {stock.name} ({stock.symbol})
                      <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => handleRemoveStock(stock.symbol)} />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 来源和录入人 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="source" className="text-foreground">信息来源</Label>
                  <Input
                    id="source"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="如：专家访谈、产业链调研"
                    className="bg-background border-border text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="author" className="text-foreground">录入人</Label>
                  <Input
                    id="author"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="您的姓名"
                    className="bg-background border-border text-foreground"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 提交按钮 */}
          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || !canSubmit}
              className="bg-chart-1 text-white hover:bg-chart-1/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : '保存情报'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/intelligence')}
              className="border-border text-muted-foreground"
            >
              取消
            </Button>
            {!canSubmit && hasInput && !autoCompleteResult && (
              <span className="text-xs text-muted-foreground self-center">
                提示：点击"AI智能分析"自动生成标题后即可提交
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
