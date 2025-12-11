'use client'

import { Calendar, MapPin, Users } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { OptimizedImage } from '@/components/optimized-image'
import type { OnlineEvent, OfflineEvent } from '@/lib/api'

interface EventCardProps {
  event: OnlineEvent | OfflineEvent
  type: 'online' | 'offline'
}

/**
 * 活动卡片组件 - 蔚蓝档案游戏风格
 */
export function EventCard({ event, type }: EventCardProps) {
  const isOffline = type === 'offline'
  const offlineEvent = isOffline ? (event as OfflineEvent) : null

  // 格式化时间
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })
    } catch {
      return dateString
    }
  }

  // 判断活动状态
  const getEventStatus = () => {
    const now = new Date()
    const start = new Date(event.startTime)
    const end = new Date(event.endTime)

    if (now < start) return { label: '未开始', color: 'default' as const }
    if (now > end) return { label: '已结束', color: 'secondary' as const }
    return { label: '进行中', color: 'default' as const }
  }

  const status = getEventStatus()
  const natureLabel = event.nature === 'official' ? '官方' : '同人'

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
      {/* 封面图 */}
      <div className="relative h-40 md:h-48 overflow-hidden bg-muted">
        {event.coverImage ? (
          <OptimizedImage
            src={event.coverImage.url}
            alt={event.title}
            className="group-hover:scale-105 transition-transform duration-300"
            aspectRatio="16/9"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Calendar className="w-16 h-16 text-muted-foreground/30" />
          </div>
        )}
        
        {/* 状态标签 */}
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge variant={status.color} className="font-bold">
            {status.label}
          </Badge>
          <Badge
            variant={event.nature === 'official' ? 'default' : 'secondary'}
            className="font-bold"
          >
            {natureLabel}
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-3">
        <h3 className="text-lg md:text-xl font-bold line-clamp-2 group-hover:text-primary transition-colors">
          {event.title}
        </h3>
      </CardHeader>

      <CardContent className="space-y-2 text-xs md:text-sm">
        {/* 时间 */}
        <div className="flex items-start gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <div>{formatDate(event.startTime)}</div>
            <div>至 {formatDate(event.endTime)}</div>
          </div>
        </div>

        {/* 地点（线下活动） */}
        {isOffline && offlineEvent?.location && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="line-clamp-1">{offlineEvent.location}</span>
          </div>
        )}

        {/* 嘉宾（线下活动） */}
        {isOffline && offlineEvent?.guests && (
          <div className="flex items-start gap-2 text-muted-foreground">
            <Users className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{offlineEvent.guests}</span>
          </div>
        )}

        {/* 主办方 */}
        {event.organizer && (
          <div className="text-muted-foreground">
            主办：<span className="text-foreground">{event.organizer}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 flex gap-2">
        <Button variant="outline" className="flex-1" asChild>
          <a href={`/${type}-events/${event.id}`}>
            详情
          </a>
        </Button>
        {event.link && (
          <Button variant="default" className="flex-1" asChild>
            <a href={event.link} target="_blank" rel="noopener noreferrer">
              访问 →
            </a>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
