'use client'

import { useState } from 'react'
import { EventCard } from '@/components/event-card'
import { Button } from '@/components/ui/button'
import type { OnlineEvent, OfflineEvent } from '@/lib/api'

interface EventListProps {
  onlineEvents: OnlineEvent[]
  offlineEvents: OfflineEvent[]
  title?: string
  showLimit?: number
  showLoadMore?: boolean
}

/**
 * 活动列表组件 - 展示最新的线上和线下活动
 */
export function EventList({ 
  onlineEvents, 
  offlineEvents, 
  title = '最新活动',
  showLimit = 6,
  showLoadMore = true
}: EventListProps) {
  const [displayCount, setDisplayCount] = useState(showLimit)

  // 合并所有活动并按时间排序
  const allEvents = [
    ...onlineEvents.map(event => ({ ...event, type: 'online' as const })),
    ...offlineEvents.map(event => ({ ...event, type: 'offline' as const }))
  ].sort((a, b) => {
    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  })

  if (allEvents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">暂无活动</p>
      </div>
    )
  }

  const displayedEvents = allEvents.slice(0, displayCount)
  const hasMore = allEvents.length > displayCount

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">{title}</h2>
        <span className="text-sm text-muted-foreground">
          共 {allEvents.length} 个活动
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedEvents.map((event) => (
          <EventCard
            key={`${event.type}-${event.id}`}
            event={event}
            type={event.type}
          />
        ))}
      </div>
      
      {/* 加载更多按钮 */}
      {showLoadMore && hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setDisplayCount(prev => prev + showLimit)}
          >
            加载更多 ({allEvents.length - displayCount} 个)
          </Button>
        </div>
      )}
    </div>
  )
}
