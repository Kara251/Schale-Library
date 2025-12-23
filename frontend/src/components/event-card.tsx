'use client'

import { memo } from 'react'
import { Calendar, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN, enUS, ja } from 'date-fns/locale'
import { OptimizedImage } from '@/components/optimized-image'
import { LocaleLink } from '@/components/locale-link'
import { useLocale } from '@/contexts/locale-context'
import type { OnlineEvent, OfflineEvent } from '@/lib/api'
import type { Locale } from '@/lib/i18n'

interface EventCardProps {
  event: OnlineEvent | OfflineEvent
  type: 'online' | 'offline'
}

const dateLocales = { 'zh-Hans': zhCN, 'en': enUS, 'ja': ja }

const labels: Record<Locale, {
  upcoming: string
  ongoing: string
  ended: string
  official: string
  fanmade: string
}> = {
  'zh-Hans': {
    upcoming: '未开始',
    ongoing: '进行中',
    ended: '已结束',
    official: '官方',
    fanmade: '同人',
  },
  'en': {
    upcoming: 'Upcoming',
    ongoing: 'Ongoing',
    ended: 'Ended',
    official: 'Official',
    fanmade: 'Fan-made',
  },
  'ja': {
    upcoming: '未開始',
    ongoing: '開催中',
    ended: '終了',
    official: '公式',
    fanmade: '二次創作',
  },
}

/**
 * 活动卡片组件 - 蔚蓝档案风格
 * 使用 memo 优化列表渲染性能
 */
export const EventCard = memo(function EventCard({ event, type }: EventCardProps) {
  const { locale } = useLocale()
  const t = labels[locale] || labels['zh-Hans']
  const dateLocale = dateLocales[locale] || zhCN

  const isOffline = type === 'offline'
  const offlineEvent = isOffline ? (event as OfflineEvent) : null

  // 格式化时间
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MM/dd HH:mm', { locale: dateLocale })
    } catch {
      return dateString
    }
  }

  // 判断活动状态
  const getEventStatus = () => {
    const now = new Date()
    const start = new Date(event.startTime)
    const end = new Date(event.endTime)

    if (now < start) return t.upcoming
    if (now > end) return t.ended
    return t.ongoing
  }

  const status = getEventStatus()
  const natureLabel = event.nature === 'official' ? t.official : t.fanmade

  return (
    <LocaleLink
      href={`/${type}-events/${event.id}`}
      className="block group ba-card p-4"
    >
      <div className="ba-card-content">
        {/* 封面图 */}
        <div className="relative aspect-video rounded overflow-hidden bg-muted mb-3">
          {event.coverImage ? (
            <OptimizedImage
              src={event.coverImage.url}
              alt={event.title}
              aspectRatio="16/9"
              className="group-hover:scale-102 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full bg-secondary flex items-center justify-center">
              <Calendar className="w-8 h-8 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* 内容区 */}
        <div>
          {/* 标题 */}
          <h3 className="ba-title line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {event.title}
          </h3>

          {/* 信息行 */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{natureLabel}</span>
            <span>·</span>
            <span>{status}</span>
            <span>·</span>
            <span>{formatDate(event.startTime)}</span>
          </div>

          {/* 地点（线下） */}
          {isOffline && offlineEvent?.location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <MapPin className="w-3 h-3" />
              <span className="line-clamp-1">{offlineEvent.location}</span>
            </div>
          )}
        </div>
      </div>
    </LocaleLink>
  )
})

