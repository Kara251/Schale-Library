import type { OnlineEvent, OfflineEvent } from '@/lib/api'
import type { EventNature, EventStatus } from '@/components/event-filters'

/**
 * 判断活动状态
 */
export function getEventStatus(startTime: string, endTime: string): 'upcoming' | 'ongoing' | 'ended' {
  const now = new Date()
  const start = new Date(startTime)
  const end = new Date(endTime)

  if (now < start) return 'upcoming'
  if (now > end) return 'ended'
  return 'ongoing'
}

/**
 * 筛选活动
 */
export function filterEvents<T extends OnlineEvent | OfflineEvent>(
  events: T[],
  searchQuery: string,
  nature: EventNature,
  status: EventStatus
): T[] {
  return events.filter((event) => {
    // 搜索筛选
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesTitle = event.title.toLowerCase().includes(query)
      const matchesOrganizer = event.organizer?.toLowerCase().includes(query)
      const matchesDescription = event.description?.toLowerCase().includes(query)
      
      if (!matchesTitle && !matchesOrganizer && !matchesDescription) {
        return false
      }
    }

    // 性质筛选
    if (nature !== 'all' && event.nature !== nature) {
      return false
    }

    // 状态筛选
    if (status !== 'all') {
      const eventStatus = getEventStatus(event.startTime, event.endTime)
      if (eventStatus !== status) {
        return false
      }
    }

    return true
  })
}

/**
 * 排序活动
 */
export function sortEvents<T extends OnlineEvent | OfflineEvent>(
  events: T[],
  sortBy: 'date-desc' | 'date-asc' | 'status' = 'date-desc'
): T[] {
  const sorted = [...events]

  switch (sortBy) {
    case 'date-desc':
      return sorted.sort((a, b) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      )
    
    case 'date-asc':
      return sorted.sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )
    
    case 'status':
      return sorted.sort((a, b) => {
        const statusOrder = { ongoing: 0, upcoming: 1, ended: 2 }
        const statusA = getEventStatus(a.startTime, a.endTime)
        const statusB = getEventStatus(b.startTime, b.endTime)
        return statusOrder[statusA] - statusOrder[statusB]
      })
    
    default:
      return sorted
  }
}
