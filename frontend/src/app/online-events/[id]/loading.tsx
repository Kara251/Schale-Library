import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { ArrowLeft } from 'lucide-react'

export default function EventDetailLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-40 right-20 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-40 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <Header />

      <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          返回线上活动列表
        </div>

        <div className="max-w-4xl mx-auto animate-pulse">
          {/* 封面图骨架 */}
          <div className="h-64 md:h-96 bg-muted rounded-lg mb-8" />

          {/* 标题骨架 */}
          <div className="mb-8 space-y-4">
            <div className="h-10 bg-muted rounded w-3/4" />
            <div className="flex gap-4">
              <div className="h-6 bg-muted rounded w-32" />
              <div className="h-6 bg-muted rounded w-24" />
            </div>
          </div>

          {/* 按钮骨架 */}
          <div className="h-12 bg-muted rounded w-48 mb-8" />

          {/* 内容骨架 */}
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded w-32" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
