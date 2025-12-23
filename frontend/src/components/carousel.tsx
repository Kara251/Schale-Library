'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Calendar, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Announcement, OnlineEvent, OfflineEvent } from '@/lib/api'

// 统一的轮播项类型
interface CarouselItem {
  id: number
  type: 'announcement' | 'online-event' | 'offline-event'
  title: string
  description?: string
  coverImage?: { url: string }
  href: string
  badge?: string
  badgeVariant?: 'default' | 'secondary'
  location?: string
}

interface CarouselProps {
  announcements?: Announcement[]
  onlineEvents?: OnlineEvent[]
  offlineEvents?: OfflineEvent[]
  autoPlayInterval?: number
}

/**
 * 首页轮播图组件 - 支持公告和活动
 */
export function Carousel({
  announcements = [],
  onlineEvents = [],
  offlineEvents = [],
  autoPlayInterval = 5000
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = React.useState(true)

  // 合并所有内容为统一格式
  const items: CarouselItem[] = React.useMemo(() => {
    const result: CarouselItem[] = []

    // 添加公告
    announcements.forEach((a) => {
      result.push({
        id: a.id,
        type: 'announcement',
        title: a.title,
        description: a.content.replace(/<[^>]*>/g, '').substring(0, 100),
        coverImage: a.coverImage,
        href: `/announcements/${a.id}`,
        badge: '公告',
        badgeVariant: 'default',
      })
    })

    // 添加线上活动
    onlineEvents.forEach((e) => {
      result.push({
        id: e.id,
        type: 'online-event',
        title: e.title,
        description: e.organizer ? `主办: ${e.organizer}` : undefined,
        coverImage: e.coverImage,
        href: `/online-events/${e.id}`,
        badge: e.nature === 'official' ? '官方' : '同人',
        badgeVariant: e.nature === 'official' ? 'default' : 'secondary',
      })
    })

    // 添加线下活动
    offlineEvents.forEach((e) => {
      result.push({
        id: e.id,
        type: 'offline-event',
        title: e.title,
        description: e.organizer ? `主办: ${e.organizer}` : undefined,
        coverImage: e.coverImage,
        href: `/offline-events/${e.id}`,
        badge: '线下',
        badgeVariant: 'secondary',
        location: e.location,
      })
    })

    return result
  }, [announcements, onlineEvents, offlineEvents])

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? items.length - 1 : prev - 1
    )
  }

  const goToNext = () => {
    setCurrentIndex((prev) =>
      prev === items.length - 1 ? 0 : prev + 1
    )
  }

  // 自动播放
  React.useEffect(() => {
    if (!isAutoPlaying || items.length <= 1) return

    const interval = setInterval(() => {
      goToNext()
    }, autoPlayInterval)

    return () => clearInterval(interval)
  }, [currentIndex, isAutoPlaying, items.length, autoPlayInterval])

  if (!items || items.length === 0) {
    return (
      <div className="relative w-full h-[400px] bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">暂无内容</p>
      </div>
    )
  }

  const currentItem = items[currentIndex]

  return (
    <div
      className={cn(
        "relative w-full group",
        "h-[300px] md:h-[400px]"
      )}
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* 轮播图片区域 */}
      <div className="relative w-full h-full overflow-hidden rounded-xl shadow-lg">
        {items.map((item, index) => (
          <Link
            key={`${item.type}-${item.id}`}
            href={item.href}
            className={cn(
              'absolute inset-0 transition-all duration-500 cursor-pointer',
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            )}
          >
            {/* 背景图片 */}
            {item.coverImage ? (
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{
                  backgroundImage: `url(${item.coverImage.url})`,
                }}
              >
                {/* 渐变遮罩 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              </div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30" />
            )}

            {/* 内容区域 */}
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 text-white">
              {/* 标签 */}
              <div className="flex items-center gap-3 mb-2 md:mb-3 text-sm">
                <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded text-white/90">
                  {item.badge}
                </span>
                {item.type === 'online-event' && (
                  <span className="text-white/70">线上活动</span>
                )}
              </div>

              <h2 className="text-xl md:text-3xl font-bold mb-2 md:mb-3 drop-shadow-lg line-clamp-2">
                {item.title}
              </h2>

              {item.description && (
                <p className="text-sm md:text-base opacity-90 line-clamp-1 md:line-clamp-2 mb-2 drop-shadow hidden md:block">
                  {item.description}
                </p>
              )}

              {item.location && (
                <div className="flex items-center gap-2 text-sm opacity-90">
                  <MapPin className="h-4 w-4" />
                  <span>{item.location}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* 左右切换按钮 - 始终可见 */}
      {items.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-30 bg-black/40 hover:bg-black/60 text-white h-10 w-10 md:h-12 md:w-12 rounded-full transition-all shadow-lg backdrop-blur-sm"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              goToPrevious()
            }}
          >
            <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-30 bg-black/40 hover:bg-black/60 text-white h-10 w-10 md:h-12 md:w-12 rounded-full transition-all shadow-lg backdrop-blur-sm"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              goToNext()
            }}
          >
            <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
          </Button>
        </>
      )}

      {/* 指示器 */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.preventDefault()
                goToSlide(index)
              }}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                index === currentIndex
                  ? 'bg-white w-8'
                  : 'bg-white/50 hover:bg-white/70 w-2'
              )}
              aria-label={`跳转到第 ${index + 1} 张`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
