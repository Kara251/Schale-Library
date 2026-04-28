'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { EventCard } from '@/components/event-card'
import { SearchBar } from '@/components/search-bar'
import { EventFilters, type EventNature, type EventStatus } from '@/components/event-filters'
import { Pagination } from '@/components/pagination'
import { useLocale } from '@/contexts/locale-context'
import type { OnlineEvent, OfflineEvent } from '@/lib/api'
import type { Locale } from '@/lib/i18n'

export type EventSortMode = 'relevant' | 'startTime' | 'endTime'

interface EventsWithFiltersProps {
  events: (OnlineEvent | OfflineEvent)[]
  type: 'online' | 'offline' | 'all'
  title?: string
  initialSearchQuery?: string
  initialNature?: EventNature
  initialStatus?: EventStatus
  initialSort?: EventSortMode
  total: number
  page: number
  pageCount: number
  hasError?: boolean
}

const labels: Record<Locale, {
  searchPlaceholder: string
  foundEvents: string
  noResults: string
  clearFilters: string
  sort: string
  relevant: string
  startTime: string
  endTime: string
  shareHint: string
  error: string
}> = {
  'zh-Hans': {
    searchPlaceholder: '搜索活动名称、主办方...',
    foundEvents: '找到 {count} 个活动',
    noResults: '没有找到符合条件的活动',
    clearFilters: '清除筛选条件',
    sort: '排序',
    relevant: '进行中 / 即将开始优先',
    startTime: '开始时间',
    endTime: '结束时间',
    shareHint: '当前筛选条件已同步到地址栏，可直接分享链接。',
    error: '活动数据暂时不可用，已显示可用的空状态。',
  },
  'en': {
    searchPlaceholder: 'Search title, organizer...',
    foundEvents: 'Found {count} events',
    noResults: 'No matching events',
    clearFilters: 'Clear filters',
    sort: 'Sort',
    relevant: 'Ongoing / upcoming first',
    startTime: 'Start time',
    endTime: 'End time',
    shareHint: 'Filters are synced to the URL and can be shared directly.',
    error: 'Event data is temporarily unavailable. Showing the safe empty state.',
  },
  'ja': {
    searchPlaceholder: 'イベント名、主催者を検索...',
    foundEvents: '{count}件のイベントが見つかりました',
    noResults: '条件に合うイベントがありません',
    clearFilters: 'フィルターをクリア',
    sort: '並び替え',
    relevant: '開催中 / 近日開催を優先',
    startTime: '開始日時',
    endTime: '終了日時',
    shareHint: '現在のフィルターは URL に同期され、そのまま共有できます。',
    error: 'イベントデータを一時的に取得できません。安全な空状態を表示しています。',
  },
}

/**
 * 带搜索和筛选功能的活动列表组件 - 垂直布局
 */
export function EventsWithFilters({
  events,
  type,
  title,
  initialSearchQuery = '',
  initialNature = 'all',
  initialStatus = 'all',
  initialSort = 'relevant',
  total,
  page,
  pageCount,
  hasError = false,
}: EventsWithFiltersProps) {
  const { locale } = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const t = labels[locale] || labels['zh-Hans']

  const writeParams = useCallback((updates: Record<string, string | null>, nextPage?: number) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    }
    if (nextPage && nextPage > 1) {
      params.set('page', String(nextPage))
    } else {
      params.delete('page')
    }
    const nextSearch = params.toString()
    router.replace(`${pathname}${nextSearch ? `?${nextSearch}` : ''}`, { scroll: nextPage !== undefined })
  }, [pathname, router, searchParams])

  const handleReset = useCallback(() => {
    router.replace(pathname, { scroll: true })
  }, [pathname, router])

  const hasActiveFilters = Boolean(initialSearchQuery) || initialNature !== 'all' || initialStatus !== 'all' || initialSort !== 'relevant'

  return (
    <div>
      {title && (
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2">{title}</h1>
        </div>
      )}

      <SearchBar
        key={initialSearchQuery}
        initialValue={initialSearchQuery}
        onSearch={(value) => writeParams({ q: value.trim() || null })}
        placeholder={t.searchPlaceholder}
        className="max-w-2xl mb-6"
      />

      <EventFilters
        nature={initialNature}
        status={initialStatus}
        onNatureChange={(value) => writeParams({ nature: value === 'all' ? null : value })}
        onStatusChange={(value) => writeParams({ status: value === 'all' ? null : value })}
        onReset={handleReset}
      />

      <div className="mb-6">
        <label className="mb-2 block text-sm font-bold text-foreground" htmlFor="event-sort">{t.sort}</label>
        <select
          id="event-sort"
          value={initialSort}
          onChange={(event) => writeParams({ sort: event.target.value === 'relevant' ? null : event.target.value })}
          className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        >
          <option value="relevant">{t.relevant}</option>
          <option value="startTime">{t.startTime}</option>
          <option value="endTime">{t.endTime}</option>
        </select>
      </div>

      <div className="mb-4 text-sm text-muted-foreground">
        {t.foundEvents.replace('{count}', String(total))}
        {hasActiveFilters ? <span className="ml-2">{t.shareHint}</span> : null}
      </div>

      {hasError ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {t.error}
        </div>
      ) : null}

      {events.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                type={type === 'all' ? ('online' in event ? 'online' : 'offline') : type}
              />
            ))}
          </div>

          <Pagination
            currentPage={page}
            totalPages={pageCount}
            onPageChange={(nextPage) => writeParams({}, nextPage)}
            className="mt-8"
          />
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t.noResults}</p>
          <button onClick={handleReset} className="mt-4 text-sm text-primary hover:underline cursor-pointer">
            {t.clearFilters}
          </button>
        </div>
      )}
    </div>
  )
}
