'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Announcement } from '@/lib/api'

interface CarouselProps {
  announcements: Announcement[]
  autoPlayInterval?: number
}

/**
 * 首页轮播图组件 - 蔚蓝档案游戏风格
 */
export function Carousel({ announcements, autoPlayInterval = 5000 }: CarouselProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = React.useState(true)

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? announcements.length - 1 : prev - 1
    )
  }

  const goToNext = () => {
    setCurrentIndex((prev) =>
      prev === announcements.length - 1 ? 0 : prev + 1
    )
  }

  // 自动播放
  React.useEffect(() => {
    if (!isAutoPlaying || announcements.length <= 1) return

    const interval = setInterval(() => {
      goToNext()
    }, autoPlayInterval)

    return () => clearInterval(interval)
  }, [currentIndex, isAutoPlaying, announcements.length, autoPlayInterval])

  if (!announcements || announcements.length === 0) {
    return (
      <div className="relative w-full h-[400px] bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">暂无公告</p>
      </div>
    )
  }

  const currentAnnouncement = announcements[currentIndex]

  return (
    <div
      className="relative w-full h-[300px] md:h-[400px] group"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* 轮播图片区域 */}
      <div className="relative w-full h-full overflow-hidden rounded-lg">
        {announcements.map((announcement, index) => (
          <div
            key={announcement.id}
            className={cn(
              'absolute inset-0 transition-opacity duration-500',
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            )}
          >
            {/* 背景图片 */}
            {announcement.coverImage ? (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${announcement.coverImage.url})`,
                }}
              >
                {/* 渐变遮罩 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              </div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />
            )}

            {/* 内容区域 */}
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 text-white">
              <h2 className="text-xl md:text-3xl font-bold mb-2 md:mb-3 drop-shadow-lg line-clamp-2">
                {announcement.title}
              </h2>
              <div
                className="text-sm md:text-base opacity-90 line-clamp-1 md:line-clamp-2 mb-3 md:mb-4 drop-shadow hidden md:block"
                dangerouslySetInnerHTML={{
                  __html: announcement.content.substring(0, 150) + '...',
                }}
              />
              {announcement.link && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/90 hover:bg-white text-primary font-bold text-xs md:text-sm"
                  asChild
                >
                  <a href={announcement.link} target="_blank" rel="noopener noreferrer">
                    查看详情 →
                  </a>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 左右切换按钮 */}
      {announcements.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white opacity-0 md:group-hover:opacity-100 transition-opacity h-8 w-8 md:h-10 md:w-10"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-4 w-4 md:h-6 md:w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white opacity-0 md:group-hover:opacity-100 transition-opacity h-8 w-8 md:h-10 md:w-10"
            onClick={goToNext}
          >
            <ChevronRight className="h-4 w-4 md:h-6 md:w-6" />
          </Button>
        </>
      )}

      {/* 指示器 */}
      {announcements.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {announcements.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                index === currentIndex
                  ? 'bg-white w-8'
                  : 'bg-white/50 hover:bg-white/70'
              )}
              aria-label={`跳转到第 ${index + 1} 张`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
