'use client'

import { cn } from '@/lib/utils'
import { useLocale } from '@/contexts/locale-context'
import type { EventFormatFilter, EventSourcePlatformFilter } from '@/lib/api'
import { getEventFormatLabel, getEventSourcePlatformLabel } from '@/lib/utils/event-display'
import type { Locale } from '@/lib/i18n'

export type EventNature = 'all' | 'official' | 'fanmade'
export type EventStatus = 'all' | 'upcoming' | 'ongoing' | 'ended'
type EventFilterScope = 'online' | 'offline' | 'all'

interface EventFiltersProps {
  nature: EventNature
  status: EventStatus
  format: EventFormatFilter
  source: EventSourcePlatformFilter
  city: string
  platform: string
  scope: EventFilterScope
  onNatureChange: (nature: EventNature) => void
  onStatusChange: (status: EventStatus) => void
  onFormatChange: (format: EventFormatFilter) => void
  onSourceChange: (source: EventSourcePlatformFilter) => void
  onCityChange: (city: string) => void
  onPlatformChange: (platform: string) => void
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
  format: string
  source: string
  city: string
  platform: string
  allFormats: string
  allSources: string
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
    format: '形式',
    source: '信源',
    city: '城市 / 地区',
    platform: '平台 / 区域',
    allFormats: '全部形式',
    allSources: '全部信源',
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
    format: 'Format',
    source: 'Source',
    city: 'City / region',
    platform: 'Platform / region',
    allFormats: 'All formats',
    allSources: 'All sources',
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
    format: '形式',
    source: '情報源',
    city: '都市 / 地域',
    platform: 'プラットフォーム / 地域',
    allFormats: 'すべての形式',
    allSources: 'すべての情報源',
    clearFilters: 'フィルターをクリア',
  },
}

const eventFormats: Exclude<EventFormatFilter, 'all'>[] = [
  'live_stream',
  'live_show',
  'only_event',
  'collaboration',
  'contest',
  'campaign',
  'exhibition',
  'meetup',
  'release',
  'other',
]

const sourcePlatforms: Exclude<EventSourcePlatformFilter, 'all'>[] = [
  'manual',
  'official',
  'baonly',
  'bilibili',
  'x',
  'youtube',
  'website',
  'ticketing',
  'other',
]

/**
 * 活动筛选组件 - 简洁风格
 */
export function EventFilters({
  nature,
  status,
  format,
  source,
  city,
  platform,
  scope,
  onNatureChange,
  onStatusChange,
  onFormatChange,
  onSourceChange,
  onCityChange,
  onPlatformChange,
  onReset,
  showNatureFilter = true,
  showStatusFilter = true,
}: EventFiltersProps) {
  const { locale } = useLocale()
  const t = labels[locale] || labels['zh-Hans']
  const hasActiveFilters = nature !== 'all' || status !== 'all' || format !== 'all' || source !== 'all' || Boolean(city) || Boolean(platform)

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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-foreground">{t.format}</span>
          <select
            value={format}
            onChange={(event) => onFormatChange(event.target.value as EventFormatFilter)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            <option value="all">{t.allFormats}</option>
            {eventFormats.map((item) => (
              <option key={item} value={item}>{getEventFormatLabel(item, locale)}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-foreground">{t.source}</span>
          <select
            value={source}
            onChange={(event) => onSourceChange(event.target.value as EventSourcePlatformFilter)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            <option value="all">{t.allSources}</option>
            {sourcePlatforms.map((item) => (
              <option key={item} value={item}>{getEventSourcePlatformLabel(item, locale)}</option>
            ))}
          </select>
        </label>

        {scope !== 'online' ? (
          <FilterTextInput label={t.city} value={city} onCommit={onCityChange} />
        ) : null}

        {scope !== 'offline' ? (
          <FilterTextInput label={t.platform} value={platform} onCommit={onPlatformChange} />
        ) : null}
      </div>

      {/* 清除筛选 */}
      {hasActiveFilters && (
        <button onClick={onReset} className="text-sm text-muted-foreground hover:text-primary transition-colors">
          {t.clearFilters}
        </button>
      )}
    </div>
  )
}

function FilterTextInput({
  label,
  value,
  onCommit,
}: {
  label: string
  value: string
  onCommit: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-foreground">{label}</span>
      <input
        key={value}
        defaultValue={value}
        onBlur={(event) => onCommit(event.currentTarget.value.trim())}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur()
          }
        }}
        className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
      />
    </label>
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
