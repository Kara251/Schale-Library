'use client'

import { useEffect } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { AlertCircle, Home, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 可以在这里记录错误到错误追踪服务
    console.error('Error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-40 right-20 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-40 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <Header />

      <main className="relative flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md">
          {/* 错误图标 */}
          <div className="flex justify-center">
            <div className="p-4 bg-destructive/10 rounded-full">
              <AlertCircle className="h-16 w-16 text-destructive" />
            </div>
          </div>

          {/* 错误信息 */}
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold">出错了</h1>
            <p className="text-muted-foreground">
              页面加载时发生错误，请稍后重试。
            </p>
          </div>

          {/* 错误详情（开发环境） */}
          {process.env.NODE_ENV === 'development' && error.message && (
            <div className="p-4 bg-muted rounded-lg text-left">
              <p className="text-xs font-mono text-destructive break-all">
                {error.message}
              </p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={reset} size="lg">
              <RefreshCw className="mr-2 h-4 w-4" />
              重试
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="/">
                <Home className="mr-2 h-4 w-4" />
                返回首页
              </a>
            </Button>
          </div>

          {/* 提示信息 */}
          <div className="pt-4 text-sm text-muted-foreground">
            <p>如果问题持续存在，请</p>
            <a href="/contact" className="text-primary hover:underline">
              联系我们
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
