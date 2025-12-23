'use client'

import React, { useState, useMemo } from 'react'
import { EventCard } from '@/components/event-card'
import { SearchBar } from '@/components/search-bar'
import { EventFilters, type EventNature, type EventStatus } from '@/components/event-filters'
import { Pagination } from '@/components/pagination'
import { filterEvents, sortEvents } from '@/lib/utils/event-utils'
import { useLocale } from '@/contexts/locale-context'
import type { OnlineEvent, OfflineEvent } from '@/lib/api'
import type { Locale } from '@/lib/i18n'

const ITEMS_PER_PAGE = 12

interface EventsWithFiltersProps {
  events: (OnlineEvent | OfflineEvent)[]
  type: 'online' | 'offline' | 'all'
  title?: string
  initialSearchQuery?: string
}

const labels: Record<Locale, {
  searchPlaceholder: string
  foundEvents: string
  noResults: string
  clearFilters: string
}> = {
  'zh-Hans': {
    searchPlaceholder: '搜索活动名称、主办方...',
    foundEvents: '找到 {count} 个活动',
    noResults: '没有找到符合条件的活动',
    clearFilters: '清除筛选条件',
  },
  'en': {
    searchPlaceholder: 'Search title, organizer...',
    foundEvents: 'Found {count} events',
    noResults: 'No matching events',
    clearFilters: 'Clear filters',
  },
  'ja': {
    searchPlaceholder: 'イベント名、主催者を検索...',
    foundEvents: '{count}件のイベントが見つかりました',
    noResults: '条件に合うイベントがありません',
    clearFilters: 'フィルターをクリア',
  },
}

/**
 * 带搜索和筛选功能的活动列表组件 - 垂直布局
 */
export function EventsWithFilters({ events, type, title, initialSearchQuery = '' }: EventsWithFiltersProps) {
  const { locale } = useLocale()
  const t = labels[locale] || labels['zh-Hans']

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
  const [nature, setNature] = useState<EventNature>('all')
  const [status, setStatus] = useState<EventStatus>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const filteredEvents = useMemo(() => {
    const filtered = filterEvents(events, searchQuery, nature, status)
    return sortEvents(filtered, 'status')
  }, [events, searchQuery, nature, status])

  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE)
  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredEvents.slice(startIndex, endIndex)
  }, [filteredEvents, currentPage])

  // 筛选条件变化时重置页码
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, nature, status])

  const handleReset = () => {
    setSearchQuery('')
    setNature('all')
    setStatus('all')
  }

  return (
    <div>
      {title && (
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2">{title}</h1>
        </div>
      )}

      <SearchBar
        onSearch={setSearchQuery}
        placeholder={t.searchPlaceholder}
        className="max-w-2xl mb-6"
      />

      <EventFilters
        nature={nature}
        status={status}
        onNatureChange={setNature}
        onStatusChange={setStatus}
        onReset={handleReset}
      />

      <div className="mb-4 text-sm text-muted-foreground">
        {t.foundEvents.replace('{count}', String(filteredEvents.length))}
      </div>

      {paginatedEvents.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                type={type === 'all' ? ('online' in event ? 'online' : 'offline') : type}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
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
