'use client'

import { cn } from '@/lib/utils'
import { useLocale } from '@/contexts/locale-context'
import { schoolNames, schoolNamesLocalized, type SchoolType } from '@/lib/api'
import type { Locale } from '@/lib/i18n'

export type WorkNature = 'all' | 'official' | 'fanmade'
export type WorkType = 'all' | 'video' | 'image' | 'text' | 'other'
export type SourcePlatform = 'all' | 'bilibili' | 'twitter' | 'pixiv' | 'youtube' | 'other' | 'manual'
export type WorkSortMode = 'latest' | 'recommended'

interface WorksFiltersProps {
    nature: WorkNature
    workType: WorkType
    school: SchoolType | 'all'
    sourcePlatform: SourcePlatform
    featuredOnly: boolean
    sortMode: WorkSortMode
    schools: SchoolType[]
    sourcePlatforms: SourcePlatform[]
    onNatureChange: (nature: WorkNature) => void
    onWorkTypeChange: (workType: WorkType) => void
    onSchoolChange: (school: SchoolType | 'all') => void
    onSourcePlatformChange: (sourcePlatform: SourcePlatform) => void
    onFeaturedOnlyChange: (featuredOnly: boolean) => void
    onSortModeChange: (sortMode: WorkSortMode) => void
    onReset: () => void
}

const labels: Record<Locale, {
    nature: string
    type: string
    school: string
    source: string
    recommendation: string
    featured: string
    sort: string
    latest: string
    recommended: string
    all: string
    official: string
    fanmade: string
    video: string
    image: string
    text: string
    other: string
    manual: string
    bilibili: string
    twitter: string
    pixiv: string
    youtube: string
    clearFilters: string
}> = {
    'zh-Hans': {
        nature: '性质',
        type: '类型',
        school: '学校',
        source: '来源',
        recommendation: '推荐',
        featured: '精选',
        sort: '排序',
        latest: '最新',
        recommended: '精选优先',
        all: '全部',
        official: '官方',
        fanmade: '同人',
        video: '视频',
        image: '图画',
        text: '文字',
        other: '其他',
        manual: '手动',
        bilibili: 'B站',
        twitter: 'Twitter/X',
        pixiv: 'Pixiv',
        youtube: 'YouTube',
        clearFilters: '清除筛选',
    },
    'en': {
        nature: 'Nature',
        type: 'Type',
        school: 'School',
        source: 'Source',
        recommendation: 'Recommendation',
        featured: 'Featured',
        sort: 'Sort',
        latest: 'Latest',
        recommended: 'Featured first',
        all: 'All',
        official: 'Official',
        fanmade: 'Fan-made',
        video: 'Video',
        image: 'Image',
        text: 'Text',
        other: 'Other',
        manual: 'Manual',
        bilibili: 'Bilibili',
        twitter: 'Twitter/X',
        pixiv: 'Pixiv',
        youtube: 'YouTube',
        clearFilters: 'Clear filters',
    },
    'ja': {
        nature: '性質',
        type: 'タイプ',
        school: '学校',
        source: '出典',
        recommendation: 'おすすめ',
        featured: 'おすすめ',
        sort: '並び替え',
        latest: '最新',
        recommended: 'おすすめ優先',
        all: 'すべて',
        official: '公式',
        fanmade: '二次創作',
        video: '動画',
        image: '画像',
        text: 'テキスト',
        other: 'その他',
        manual: '手動',
        bilibili: 'B站',
        twitter: 'Twitter/X',
        pixiv: 'Pixiv',
        youtube: 'YouTube',
        clearFilters: 'フィルターをクリア',
    },
}

/**
 * 推荐作品筛选组件
 */
export function WorksFilters({
    nature,
    workType,
    school,
    sourcePlatform,
    featuredOnly,
    sortMode,
    schools,
    sourcePlatforms,
    onNatureChange,
    onWorkTypeChange,
    onSchoolChange,
    onSourcePlatformChange,
    onFeaturedOnlyChange,
    onSortModeChange,
    onReset,
}: WorksFiltersProps) {
    const { locale } = useLocale()
    const t = labels[locale] || labels['zh-Hans']
    const localizedSchoolNames = schoolNamesLocalized[locale] || schoolNamesLocalized['zh-Hans']
    const hasActiveFilters = nature !== 'all' || workType !== 'all' || school !== 'all' || sourcePlatform !== 'all' || featuredOnly || sortMode !== 'latest'

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

            {schools.length > 0 && (
                <div>
                    <div className="text-sm font-bold text-foreground mb-2">{t.school}</div>
                    <div className="flex flex-wrap gap-1">
                        <FilterTag active={school === 'all'} onClick={() => onSchoolChange('all')}>{t.all}</FilterTag>
                        {schools.map((item) => (
                            <FilterTag key={item} active={school === item} onClick={() => onSchoolChange(item)}>
                                {localizedSchoolNames[item] || schoolNames[item] || item}
                            </FilterTag>
                        ))}
                    </div>
                </div>
            )}

            {sourcePlatforms.length > 0 && (
                <div>
                    <div className="text-sm font-bold text-foreground mb-2">{t.source}</div>
                    <div className="flex flex-wrap gap-1">
                        <FilterTag active={sourcePlatform === 'all'} onClick={() => onSourcePlatformChange('all')}>{t.all}</FilterTag>
                        {sourcePlatforms.map((item) => (
                            <FilterTag key={item} active={sourcePlatform === item} onClick={() => onSourcePlatformChange(item)}>
                                {t[item] || item}
                            </FilterTag>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <div className="text-sm font-bold text-foreground mb-2">{t.recommendation}</div>
                <div className="flex flex-wrap gap-1">
                    <FilterTag active={!featuredOnly} onClick={() => onFeaturedOnlyChange(false)}>{t.all}</FilterTag>
                    <FilterTag active={featuredOnly} onClick={() => onFeaturedOnlyChange(true)}>{t.featured}</FilterTag>
                </div>
            </div>

            <div>
                <div className="text-sm font-bold text-foreground mb-2">{t.sort}</div>
                <div className="flex flex-wrap gap-1">
                    <FilterTag active={sortMode === 'latest'} onClick={() => onSortModeChange('latest')}>{t.latest}</FilterTag>
                    <FilterTag active={sortMode === 'recommended'} onClick={() => onSortModeChange('recommended')}>{t.recommended}</FilterTag>
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
