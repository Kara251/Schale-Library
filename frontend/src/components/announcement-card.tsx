'use client'

import Link from 'next/link'
import { Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { Announcement } from '@/lib/api'

interface AnnouncementCardProps {
  announcement: Announcement
}

/**
 * 公告卡片组件 - kivo.wiki 风格
 */
export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  // 格式化时间
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MM/dd', { locale: zhCN })
    } catch {
      return dateString
    }
  }

  return (
    <Link
      href={`/announcements/${announcement.id}`}
      className="block group"
    >
      {/* 封面图 */}
      <div className="relative aspect-video rounded overflow-hidden bg-muted mb-3">
        {announcement.coverImage ? (
          <img
            src={announcement.coverImage.url}
            alt={announcement.title}
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full bg-secondary flex items-center justify-center">
            <Calendar className="w-8 h-8 text-muted-foreground/30" />
          </div>
        )}

        {/* 优先级标签 */}
        {announcement.priority > 5 && (
          <span className="absolute top-2 left-2 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded">
            重要
          </span>
        )}
      </div>

      {/* 内容区 */}
      <div>
        {/* 标题 */}
        <h3 className="text-sm font-medium line-clamp-2 mb-1 group-hover:text-primary transition-colors">
          {announcement.title}
        </h3>

        {/* 信息行 */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>公告</span>
          <span>·</span>
          <span>{formatDate(announcement.publishedAt)}</span>
        </div>
      </div>
    </Link>
  )
}
