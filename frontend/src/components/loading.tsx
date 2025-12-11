import { Loader2 } from 'lucide-react'

interface LoadingProps {
  text?: string
  fullScreen?: boolean
}

/**
 * 加载指示器组件
 */
export function Loading({ text = '加载中...', fullScreen = false }: LoadingProps) {
  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">{text}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  )
}

/**
 * 骨架屏 - 活动卡片
 */
export function EventCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card overflow-hidden animate-pulse">
      <div className="h-48 bg-muted" />
      <div className="p-6 space-y-4">
        <div className="h-6 bg-muted rounded w-3/4" />
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded" />
          <div className="h-4 bg-muted rounded w-5/6" />
        </div>
        <div className="h-10 bg-muted rounded" />
      </div>
    </div>
  )
}

/**
 * 骨架屏 - 活动列表
 */
export function EventListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  )
}
