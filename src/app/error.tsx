'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App route error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="font-editorial text-2xl text-foreground">页面加载出现异常</h1>
        <p className="text-sm text-muted-foreground">
          我们已经记录了这次错误。你可以先重试一次，页面大多数情况下会恢复。
        </p>
        <button
          type="button"
          onClick={reset}
          className="bg-link px-4 py-2 text-sm text-white transition hover:bg-link/90"
        >
          重新加载
        </button>
      </div>
    </div>
  )
}
