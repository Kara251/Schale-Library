'use client'

import { cn } from '@/lib/utils'
import { useLocale } from '@/contexts/locale-context'
import type { EventKindFilter, EventLocationRecord } from '@/lib/api'
import type { Locale } from '@/lib/i18n'
import type { ChangeEvent, ReactNode } from 'react'

export type EventNature = 'all' | 'official' | 'fanmade'
export type EventStatus = 'all' | 'upcoming' | 'ongoing' | 'ended'
type EventFilterScope = 'online' | 'offline' | 'all'

interface EventFiltersProps {
  kind: EventKindFilter
  nature: EventNature
  status: EventStatus
  country: string
  region: string
  city: string
  district: string
  locationRecords: EventLocationRecord[]
  scope: EventFilterScope
  onKindChange: (kind: EventKindFilter) => void
  onNatureChange: (nature: EventNature) => void
  onStatusChange: (status: EventStatus) => void
  onCountryChange: (country: string) => void
  onRegionChange: (region: string) => void
  onCityChange: (city: string) => void
  onDistrictChange: (district: string) => void
  onReset: () => void
  showNatureFilter?: boolean
  showStatusFilter?: boolean
}

const labels: Record<Locale, {
  nature: string
  kind: string
  status: string
  all: string
  allKinds: string
  online: string
  offline: string
  official: string
  fanmade: string
  upcoming: string
  ongoing: string
  ended: string
  country: string
  region: string
  city: string
  district: string
  clearFilters: string
}> = {
  'zh-Hans': {
    nature: '性质',
    kind: '类型',
    status: '状态',
    all: '全部',
    allKinds: '全部类型',
    online: '线上',
    offline: '线下',
    official: '官方',
    fanmade: '同人',
    upcoming: '未开始',
    ongoing: '进行中',
    ended: '已结束',
    country: '国家（地区）',
    region: '省 / 州 / 都道府县',
    city: '城市',
    district: '区县',
    clearFilters: '清除筛选',
  },
  'en': {
    nature: 'Nature',
    kind: 'Type',
    status: 'Status',
    all: 'All',
    allKinds: 'All types',
    online: 'Online',
    offline: 'Offline',
    official: 'Official',
    fanmade: 'Fan-made',
    upcoming: 'Upcoming',
    ongoing: 'Ongoing',
    ended: 'Ended',
    country: 'Country / region',
    region: 'Province / state',
    city: 'City',
    district: 'District',
    clearFilters: 'Clear filters',
  },
  'ja': {
    nature: '性質',
    kind: '種別',
    status: 'ステータス',
    all: 'すべて',
    allKinds: 'すべて',
    online: 'オンライン',
    offline: 'オフライン',
    official: '公式',
    fanmade: '二次創作',
    upcoming: '未開始',
    ongoing: '開催中',
    ended: '終了',
    country: '国・地域',
    region: '都道府県 / 州',
    city: '都市',
    district: '区市町村',
    clearFilters: 'フィルターをクリア',
  },
}

/**
 * 活动筛选组件 - 简洁风格
 */
export function EventFilters({
  kind,
  nature,
  status,
  country,
  region,
  city,
  district,
  locationRecords,
  scope,
  onKindChange,
  onNatureChange,
  onStatusChange,
  onCountryChange,
  onRegionChange,
  onCityChange,
  onDistrictChange,
  onReset,
  showNatureFilter = true,
  showStatusFilter = true,
}: EventFiltersProps) {
  const { locale } = useLocale()
  const t = labels[locale] || labels['zh-Hans']
  const showKindFilter = scope === 'all'
  const activeKind = scope === 'all' ? kind : scope
  const showOfflineLocation = activeKind !== 'online'
  const relevantLocationRecords = locationRecords.filter((record) => (
    activeKind === 'all' || record.kind === activeKind
  ))
  const countryOptions = uniqueLocationOptions(relevantLocationRecords.map((record) => record.country), country)
  const regionOptions = uniqueLocationOptions(
    relevantLocationRecords
      .filter((record) => matchesLocation(record.country, country))
      .map((record) => record.region),
    region
  )
  const cityOptions = uniqueLocationOptions(
    relevantLocationRecords
      .filter((record) => record.kind === 'offline')
      .filter((record) => matchesLocation(record.country, country))
      .filter((record) => matchesLocation(record.region, region))
      .map((record) => record.city),
    city
  )
  const districtOptions = uniqueLocationOptions(
    relevantLocationRecords
      .filter((record) => record.kind === 'offline')
      .filter((record) => matchesLocation(record.country, country))
      .filter((record) => matchesLocation(record.region, region))
      .filter((record) => matchesLocation(record.city, city))
      .map((record) => record.district),
    district
  )
  const hasActiveFilters =
    (showKindFilter && kind !== 'all') ||
    nature !== 'all' ||
    status !== 'all' ||
    Boolean(country) ||
    Boolean(region) ||
    Boolean(city) ||
    Boolean(district)

  return (
    <div className="space-y-3 mb-6">
      {showKindFilter && (
        <div>
          <div className="text-sm font-bold text-foreground mb-2">{t.kind}</div>
          <div className="flex flex-wrap gap-1">
            <FilterTag active={kind === 'all'} onClick={() => onKindChange('all')}>{t.allKinds}</FilterTag>
            <FilterTag active={kind === 'online'} onClick={() => onKindChange('online')}>{t.online}</FilterTag>
            <FilterTag active={kind === 'offline'} onClick={() => onKindChange('offline')}>{t.offline}</FilterTag>
          </div>
        </div>
      )}

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
        <FilterSelect label={t.country} value={country} options={countryOptions} allLabel={t.all} onChange={onCountryChange} />
        <FilterSelect label={t.region} value={region} options={regionOptions} allLabel={t.all} onChange={onRegionChange} />
        {showOfflineLocation ? (
          <>
            <FilterSelect label={t.city} value={city} options={cityOptions} allLabel={t.all} onChange={onCityChange} />
            <FilterSelect label={t.district} value={district} options={districtOptions} allLabel={t.all} onChange={onDistrictChange} />
          </>
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

function uniqueLocationOptions(values: string[], selected: string) {
  const options = [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-Hans'));
  const current = selected.trim();
  if (current && !options.includes(current)) {
    options.unshift(current);
  }
  return options;
}

function matchesLocation(value: string, selected: string) {
  return !selected || value === selected;
}

function FilterSelect({
  label,
  value,
  options,
  allLabel,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  allLabel: string
  onChange: (value: string) => void
}) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(event.currentTarget.value)
  }

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-foreground">{label}</span>
      <select
        value={value}
        onChange={handleChange}
        className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}

interface FilterTagProps {
  active: boolean
  onClick: () => void
  children: ReactNode
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
