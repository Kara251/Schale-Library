import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Home, Search } from 'lucide-react'

export default function NotFound() {
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
          {/* 404 大标题 */}
          <div className="space-y-2">
            <h1 className="text-8xl md:text-9xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              404
            </h1>
            <h2 className="text-2xl md:text-3xl font-bold">页面未找到</h2>
          </div>

          {/* 描述文字 */}
          <p className="text-muted-foreground">
            抱歉，您访问的页面不存在或已被移除。
          </p>

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                返回首页
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/search">
                <Search className="mr-2 h-4 w-4" />
                搜索活动
              </Link>
            </Button>
          </div>

          {/* 提示信息 */}
          <div className="pt-8 text-sm text-muted-foreground">
            <p>如果您认为这是一个错误，请</p>
            <Link href="/contact" className="text-primary hover:underline">
              联系我们
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
