'use client'

import { useState, useMemo } from 'react'
import { EventCard } from '@/components/event-card'
import { SearchBar } from '@/components/search-bar'
import { EventFilters, type EventNature, type EventStatus } from '@/components/event-filters'
import { Pagination } from '@/components/pagination'
import { filterEvents, sortEvents } from '@/lib/utils/event-utils'
import type { OnlineEvent, OfflineEvent } from '@/lib/api'

const ITEMS_PER_PAGE = 12

interface EventsWithFiltersProps {
  events: (OnlineEvent | OfflineEvent)[]
  type: 'online' | 'offline' | 'all'
  title?: string
}

/**
 * 带搜索和筛选功能的活动列表组件
 */
export function EventsWithFilters({ events, type, title }: EventsWithFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [nature, setNature] = useState<EventNature>('all')
  const [status, setStatus] = useState<EventStatus>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // 筛选和排序活动
  const filteredEvents = useMemo(() => {
    const filtered = filterEvents(events, searchQuery, nature, status)
    return sortEvents(filtered, 'status')
  }, [events, searchQuery, nature, status])

  // 分页
  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE)
  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredEvents.slice(startIndex, endIndex)
  }, [filteredEvents, currentPage])

  // 重置分页当筛选条件改变
  useMemo(() => {
    setCurrentPage(1)
  }, [searchQuery, nature, status])

  const handleReset = () => {
    setSearchQuery('')
    setNature('all')
    setStatus('all')
  }

  return (
    <div className="space-y-6">
      {/* 标题和搜索栏 */}
      <div className="space-y-4">
        {title && <h1 className="text-4xl font-bold">{title}</h1>}
        <SearchBar
          onSearch={setSearchQuery}
          placeholder="搜索活动名称、主办方..."
          className="max-w-2xl"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 侧边筛选栏 - 桌面端 */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-20 p-4 border rounded-lg bg-card">
            <EventFilters
              nature={nature}
              status={status}
              onNatureChange={setNature}
              onStatusChange={setStatus}
              onReset={handleReset}
            />
          </div>
        </div>

        {/* 侧边筛选栏 - 移动端 */}
        <div className="lg:hidden mb-4">
          <details className="p-4 border rounded-lg bg-card">
            <summary className="cursor-pointer font-medium text-sm flex items-center gap-2">
              <span>筛选选项</span>
              {(nature !== 'all' || status !== 'all') && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                  已应用
                </span>
              )}
            </summary>
            <div className="mt-4">
              <EventFilters
                nature={nature}
                status={status}
                onNatureChange={setNature}
                onStatusChange={setStatus}
                onReset={handleReset}
              />
            </div>
          </details>
        </div>

        {/* 活动列表 */}
        <div className="lg:col-span-3">
          {/* 结果统计 */}
          <div className="mb-4 text-sm text-muted-foreground">
            找到 <span className="font-medium text-foreground">{filteredEvents.length}</span> 个活动
          </div>

          {/* 活动网格 */}
          {paginatedEvents.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {paginatedEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    type={type === 'all' ? ('online' in event ? 'online' : 'offline') : type}
                  />
                ))}
              </div>

              {/* 分页 */}
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
            <div className="text-center py-12 border rounded-lg">
              <p className="text-muted-foreground">没有找到符合条件的活动</p>
              <button
                onClick={handleReset}
                className="mt-4 text-sm text-primary hover:underline"
              >
                清除筛选条件
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
