'use client'

import { useState } from 'react'
import { EventCard } from '@/components/event-card'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/contexts/locale-context'
import type { OnlineEvent, OfflineEvent } from '@/lib/api'
import type { Locale } from '@/lib/i18n'

interface EventListProps {
  onlineEvents: OnlineEvent[]
  offlineEvents: OfflineEvent[]
  title?: string
  showLimit?: number
  showLoadMore?: boolean
  showCount?: boolean
}

const labels: Record<Locale, {
  noEvents: string
  total: string
  loadMore: string
  remaining: string
}> = {
  'zh-Hans': {
    noEvents: '暂无活动',
    total: '共 {count} 个活动',
    loadMore: '加载更多',
    remaining: '{count} 个',
  },
  'en': {
    noEvents: 'No events',
    total: '{count} events total',
    loadMore: 'Load More',
    remaining: '{count} more',
  },
  'ja': {
    noEvents: 'イベントはありません',
    total: '全{count}件',
    loadMore: 'もっと見る',
    remaining: '残り{count}件',
  },
}

/**
 * 活动列表组件 - 展示最新的线上和线下活动
 */
export function EventList({
  onlineEvents,
  offlineEvents,
  title,
  showLimit = 6,
  showLoadMore = true,
  showCount = false
}: EventListProps) {
  const { locale } = useLocale()
  const t = labels[locale] || labels['zh-Hans']
  const [displayCount, setDisplayCount] = useState(showLimit)

  // 合并所有活动并按发布时间排序
  const allEvents = [
    ...onlineEvents.map(event => ({ ...event, type: 'online' as const })),
    ...offlineEvents.map(event => ({ ...event, type: 'offline' as const }))
  ].sort((a, b) => {
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  })

  if (allEvents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t.noEvents}</p>
      </div>
    )
  }

  const displayedEvents = allEvents.slice(0, displayCount)
  const hasMore = allEvents.length > displayCount
  const remainingCount = allEvents.length - displayCount

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">{title}</h2>
        {showCount && (
          <span className="text-sm text-muted-foreground">
            {t.total.replace('{count}', String(allEvents.length))}
          </span>
        )}
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

      {showLoadMore && hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setDisplayCount(prev => prev + showLimit)}
          >
            {t.loadMore} ({t.remaining.replace('{count}', String(remainingCount))})
          </Button>
        </div>
      )}
    </div>
  )
}
