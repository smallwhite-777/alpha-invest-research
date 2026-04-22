'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ClientErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  resetKey?: string
}

interface ClientErrorBoundaryState {
  hasError: boolean
}

export class ClientErrorBoundary extends Component<
  ClientErrorBoundaryProps,
  ClientErrorBoundaryState
> {
  state: ClientErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(): ClientErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Client render error captured:', error, errorInfo)
  }

  componentDidUpdate(prevProps: ClientErrorBoundaryProps) {
    if (this.state.hasError && this.props.resetKey && this.props.resetKey !== prevProps.resetKey) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex h-full min-h-24 items-center justify-center text-xs text-muted-foreground">
          图表暂时不可用
        </div>
      )
    }

    return this.props.children
  }
}
