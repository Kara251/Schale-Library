'use client'

import { cn } from '@/lib/utils'
import { useLocale } from '@/contexts/locale-context'
import type { Locale } from '@/lib/i18n'

export type WorkNature = 'all' | 'official' | 'fanmade'
export type WorkType = 'all' | 'video' | 'image' | 'text' | 'other'

interface WorksFiltersProps {
    nature: WorkNature
    workType: WorkType
    onNatureChange: (nature: WorkNature) => void
    onWorkTypeChange: (workType: WorkType) => void
    onReset: () => void
}

const labels: Record<Locale, {
    nature: string
    type: string
    all: string
    official: string
    fanmade: string
    video: string
    image: string
    text: string
    other: string
    clearFilters: string
}> = {
    'zh-Hans': {
        nature: '性质',
        type: '类型',
        all: '全部',
        official: '官方',
        fanmade: '同人',
        video: '视频',
        image: '图画',
        text: '文字',
        other: '其他',
        clearFilters: '清除筛选',
    },
    'en': {
        nature: 'Nature',
        type: 'Type',
        all: 'All',
        official: 'Official',
        fanmade: 'Fan-made',
        video: 'Video',
        image: 'Image',
        text: 'Text',
        other: 'Other',
        clearFilters: 'Clear filters',
    },
    'ja': {
        nature: '性質',
        type: 'タイプ',
        all: 'すべて',
        official: '公式',
        fanmade: '二次創作',
        video: '動画',
        image: '画像',
        text: 'テキスト',
        other: 'その他',
        clearFilters: 'フィルターをクリア',
    },
}

/**
 * 推荐作品筛选组件
 */
export function WorksFilters({
    nature,
    workType,
    onNatureChange,
    onWorkTypeChange,
    onReset,
}: WorksFiltersProps) {
    const { locale } = useLocale()
    const t = labels[locale] || labels['zh-Hans']
    const hasActiveFilters = nature !== 'all' || workType !== 'all'

    return (
        <div className="space-y-3 mb-6">
            {/* 性质筛选 */}
            <div>
                <div className="text-sm font-bold text-foreground mb-2">{t.nature}</div>
                <div className="flex flex-wrap gap-1">
                    <FilterTag active={nature === 'all'} onClick={() => onNatureChange('all')}>{t.all}</FilterTag>
                    <FilterTag active={nature === 'official'} onClick={() => onNatureChange('official')}>{t.official}</FilterTag>
                    <FilterTag active={nature === 'fanmade'} onClick={() => onNatureChange('fanmade')}>{t.fanmade}</FilterTag>
                </div>
            </div>

            {/* 类型筛选 */}
            <div>
                <div className="text-sm font-bold text-foreground mb-2">{t.type}</div>
                <div className="flex flex-wrap gap-1">
                    <FilterTag active={workType === 'all'} onClick={() => onWorkTypeChange('all')}>{t.all}</FilterTag>
                    <FilterTag active={workType === 'video'} onClick={() => onWorkTypeChange('video')}>{t.video}</FilterTag>
                    <FilterTag active={workType === 'image'} onClick={() => onWorkTypeChange('image')}>{t.image}</FilterTag>
                    <FilterTag active={workType === 'text'} onClick={() => onWorkTypeChange('text')}>{t.text}</FilterTag>
                    <FilterTag active={workType === 'other'} onClick={() => onWorkTypeChange('other')}>{t.other}</FilterTag>
                </div>
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
