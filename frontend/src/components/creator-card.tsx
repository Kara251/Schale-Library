'use client'

import { memo } from 'react'
import { Star, UserRound } from 'lucide-react'
import { OptimizedImage } from '@/components/optimized-image'
import { LocaleLink } from '@/components/locale-link'
import { useLocale } from '@/contexts/locale-context'
import type { Creator } from '@/lib/api'
import type { Locale } from '@/lib/i18n'

interface CreatorCardProps {
  creator: Creator
}

const labels: Record<Locale, { featured: string }> = {
  'zh-Hans': { featured: '精选' },
  'en': { featured: 'Featured' },
  'ja': { featured: '厳選' },
}

/**
 * 创作者卡片组件 - 蔚蓝档案风格（头像/名字/platform 徽章）
 */
export const CreatorCard = memo(function CreatorCard({ creator }: CreatorCardProps) {
  const { locale } = useLocale()
  const t = labels[locale] || labels['zh-Hans']

  return (
    <LocaleLink
      href={`/creators/${creator.slug}`}
      className="block group ba-card p-4"
    >
      <div className="ba-card-content">
        {/* 头像 */}
        <div className="relative mx-auto mb-3 h-20 w-20 overflow-hidden rounded-full border bg-secondary">
          {creator.avatarUrl ? (
            <OptimizedImage
              src={creator.avatarUrl}
              alt={creator.name}
              aspectRatio="1/1"
              className="h-full w-full"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <UserRound className="h-8 w-8 text-muted-foreground/30" />
            </span>
          )}
        </div>

        {/* 名字与徽章 */}
        <h3 className="ba-title truncate text-center group-hover:text-primary transition-colors">
          {creator.name}
        </h3>
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {creator.isFeatured ? (
            <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              <Star className="h-3 w-3" />
              {t.featured}
            </span>
          ) : null}
          <span className="rounded bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
            {creator.platform}
          </span>
        </div>
      </div>
    </LocaleLink>
  )
})
