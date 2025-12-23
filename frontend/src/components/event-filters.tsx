'use client'

import { cn } from '@/lib/utils'
import { useLocale } from '@/contexts/locale-context'
import type { Locale } from '@/lib/i18n'

export type EventNature = 'all' | 'official' | 'fanmade'
export type EventStatus = 'all' | 'upcoming' | 'ongoing' | 'ended'

interface EventFiltersProps {
  nature: EventNature
  status: EventStatus
  onNatureChange: (nature: EventNature) => void
  onStatusChange: (status: EventStatus) => void
  onReset: () => void
  showNatureFilter?: boolean
  showStatusFilter?: boolean
}

const labels: Record<Locale, {
  nature: string
  status: string
  all: string
  official: string
  fanmade: string
  upcoming: string
  ongoing: string
  ended: string
  clearFilters: string
}> = {
  'zh-Hans': {
    nature: '性质',
    status: '状态',
    all: '全部',
    official: '官方',
    fanmade: '同人',
    upcoming: '未开始',
    ongoing: '进行中',
    ended: '已结束',
    clearFilters: '清除筛选',
  },
  'en': {
    nature: 'Nature',
    status: 'Status',
    all: 'All',
    official: 'Official',
    fanmade: 'Fan-made',
    upcoming: 'Upcoming',
    ongoing: 'Ongoing',
    ended: 'Ended',
    clearFilters: 'Clear filters',
  },
  'ja': {
    nature: '性質',
    status: 'ステータス',
    all: 'すべて',
    official: '公式',
    fanmade: '二次創作',
    upcoming: '未開始',
    ongoing: '開催中',
    ended: '終了',
    clearFilters: 'フィルターをクリア',
  },
}

/**
 * 活动筛选组件 - 简洁风格
 */
export function EventFilters({
  nature,
  status,
  onNatureChange,
  onStatusChange,
  onReset,
  showNatureFilter = true,
  showStatusFilter = true,
}: EventFiltersProps) {
  const { locale } = useLocale()
  const t = labels[locale] || labels['zh-Hans']
  const hasActiveFilters = nature !== 'all' || status !== 'all'

  return (
    <div className="space-y-3 mb-6">
      {/* 性质筛选 */}
      {showNatureFilter && (
        <div>
          <div className="text-sm font-bold text-foreground mb-2">{t.nature}</div>
          <div className="flex flex-wrap gap-1">
            <FilterTag active={nature === 'all'} onClick={() => onNatureChange('all')}>{t.all}</FilterTag>
            <FilterTag active={nature === 'official'} onClick={() => onNatureChange('official')}>{t.official}</FilterTag>
            <FilterTag active={nature === 'fanmade'} onClick={() => onNatureChange('fanmade')}>{t.fanmade}</FilterTag>
          </div>
        </div>
      )}

      {/* 状态筛选 */}
      {showStatusFilter && (
        <div>
          <div className="text-sm font-bold text-foreground mb-2">{t.status}</div>
          <div className="flex flex-wrap gap-1">
            <FilterTag active={status === 'all'} onClick={() => onStatusChange('all')}>{t.all}</FilterTag>
            <FilterTag active={status === 'upcoming'} onClick={() => onStatusChange('upcoming')}>{t.upcoming}</FilterTag>
            <FilterTag active={status === 'ongoing'} onClick={() => onStatusChange('ongoing')}>{t.ongoing}</FilterTag>
            <FilterTag active={status === 'ended'} onClick={() => onStatusChange('ended')}>{t.ended}</FilterTag>
          </div>
        </div>
      )}

      {/* 清除筛选 */}
      {hasActiveFilters && (
        <button onClick={onReset} className="text-sm text-muted-foreground hover:text-primary transition-colors">
          {t.clearFilters}
        </button>
      )}
    </div>
  )
}

interface FilterTagProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function FilterTag({ active, onClick, children }: FilterTagProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 text-sm rounded transition-colors whitespace-nowrap cursor-pointer',
        active
          ? 'text-primary font-medium'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      )}
    >
      {children}
    </button>
  )
}
