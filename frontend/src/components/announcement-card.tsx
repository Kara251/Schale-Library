'use client'

import { LocaleLink } from '@/components/locale-link'
import { Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN, enUS, ja } from 'date-fns/locale'
import { useLocale } from '@/contexts/locale-context'
import type { Announcement } from '@/lib/api'
import type { Locale } from '@/lib/i18n'

interface AnnouncementCardProps {
  announcement: Announcement
}

const dateLocales = { 'zh-Hans': zhCN, 'en': enUS, 'ja': ja }
const labels: Record<Locale, { announcement: string; important: string }> = {
  'zh-Hans': { announcement: '公告', important: '重要' },
  'en': { announcement: 'Announcement', important: 'Important' },
  'ja': { announcement: 'お知らせ', important: '重要' },
}

/**
 * 公告卡片组件 - 蔚蓝档案风格
 */
export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  const { locale } = useLocale()
  const t = labels[locale] || labels['zh-Hans']
  const dateLocale = dateLocales[locale] || zhCN

  // 格式化时间
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MM/dd', { locale: dateLocale })
    } catch {
      return dateString
    }
  }

  return (
    <LocaleLink
      href={`/announcements/${announcement.id}`}
      className="block group ba-card p-4"
    >
      <div className="ba-card-content">
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
              {t.important}
            </span>
          )}
        </div>

        {/* 内容区 */}
        <div>
          {/* 标题 */}
          <h3 className="ba-title line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {announcement.title}
          </h3>

          {/* 信息行 */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{t.announcement}</span>
            <span>·</span>
            <span>{formatDate(announcement.publishedAt)}</span>
          </div>
        </div>
      </div>
    </LocaleLink>
  )
}

