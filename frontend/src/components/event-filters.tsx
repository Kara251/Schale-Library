'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Filter, X } from 'lucide-react'
import { cn } from '@/lib/utils'

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

/**
 * 活动筛选组件
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
  const hasActiveFilters = nature !== 'all' || status !== 'all'

  return (
    <div className="space-y-4">
      {/* 筛选标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">筛选</span>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-7 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            清除
          </Button>
        )}
      </div>

      {/* 性质筛选 */}
      {showNatureFilter && (
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">活动性质</label>
          <div className="flex flex-wrap gap-2">
            <FilterButton
              active={nature === 'all'}
              onClick={() => onNatureChange('all')}
            >
              全部
            </FilterButton>
            <FilterButton
              active={nature === 'official'}
              onClick={() => onNatureChange('official')}
            >
              官方
            </FilterButton>
            <FilterButton
              active={nature === 'fanmade'}
              onClick={() => onNatureChange('fanmade')}
            >
              同人
            </FilterButton>
          </div>
        </div>
      )}

      {/* 状态筛选 */}
      {showStatusFilter && (
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">活动状态</label>
          <div className="flex flex-wrap gap-2">
            <FilterButton
              active={status === 'all'}
              onClick={() => onStatusChange('all')}
            >
              全部
            </FilterButton>
            <FilterButton
              active={status === 'upcoming'}
              onClick={() => onStatusChange('upcoming')}
            >
              <Calendar className="h-3 w-3 mr-1" />
              未开始
            </FilterButton>
            <FilterButton
              active={status === 'ongoing'}
              onClick={() => onStatusChange('ongoing')}
            >
              <Calendar className="h-3 w-3 mr-1" />
              进行中
            </FilterButton>
            <FilterButton
              active={status === 'ended'}
              onClick={() => onStatusChange('ended')}
            >
              <Calendar className="h-3 w-3 mr-1" />
              已结束
            </FilterButton>
          </div>
        </div>
      )}
    </div>
  )
}

interface FilterButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function FilterButton({ active, onClick, children }: FilterButtonProps) {
  return (
    <Button
      variant={active ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      className={cn(
        'h-8 text-xs',
        !active && 'hover:bg-primary/10'
      )}
    >
      {children}
    </Button>
  )
}
