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
    console.error('Error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
        <div className="content-panel flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-6 max-w-md">
            {/* 错误图标 */}
            <div className="flex justify-center">
              <div className="p-4 bg-destructive/10 rounded-full">
                <AlertCircle className="h-16 w-16 text-destructive" />
              </div>
            </div>

            {/* 错误信息 */}
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold">书上空空如也...</h1>
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
                联系图书馆
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
