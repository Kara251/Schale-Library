'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { WorkCard } from '@/components/work-card'
import { WorksFilters, type SourcePlatform, type WorkNature, type WorkSortMode, type WorkType } from '@/components/works-filters'
import { StudentSelectorTrigger } from '@/components/student-selector'
import { SearchBar } from '@/components/search-bar'
import { Pagination } from '@/components/pagination'
import { useLocale } from '@/contexts/locale-context'
import { schoolNamesLocalized, type Work, type Student, type SchoolType } from '@/lib/api'
import type { Locale } from '@/lib/i18n'

interface WorksWithFiltersProps {
    works: Work[]
    students: Student[]
    title: string
    total: number
    page: number
    pageCount: number
    hasError?: boolean
}

const labels: Record<Locale, {
    description: string
    searchPlaceholder: string
    clearAll: string
    foundWorks: string
    noResults: string
    clearFilters: string
    shareHint: string
    error: string
}> = {
    'zh-Hans': {
        description: '精选蔚蓝档案相关创作内容',
        searchPlaceholder: '搜索作品名称、作者...',
        clearAll: '清除所有筛选',
        foundWorks: '找到 {count} 个作品',
        noResults: '暂无符合条件的作品',
        clearFilters: '清除筛选条件',
        shareHint: '当前筛选条件已同步到地址栏，可直接分享链接。',
        error: '作品数据暂时不可用，已显示可用的空状态。',
    },
    'en': {
        description: 'Selected Blue Archive creative works',
        searchPlaceholder: 'Search title, author...',
        clearAll: 'Clear all filters',
        foundWorks: 'Found {count} works',
        noResults: 'No matching works',
        clearFilters: 'Clear filters',
        shareHint: 'Filters are synced to the URL and can be shared directly.',
        error: 'Work data is temporarily unavailable. Showing the safe empty state.',
    },
    'ja': {
        description: 'ブルーアーカイブ関連作品セレクション',
        searchPlaceholder: '作品名、作者を検索...',
        clearAll: 'すべてのフィルターをクリア',
        foundWorks: '{count}件の作品が見つかりました',
        noResults: '条件に合う作品がありません',
        clearFilters: 'フィルターをクリア',
        shareHint: '現在のフィルターは URL に同期され、そのまま共有できます。',
        error: '作品データを一時的に取得できません。安全な空状態を表示しています。',
    },
}

const workNatures: WorkNature[] = ['all', 'official', 'fanmade']
const workTypes: WorkType[] = ['all', 'video', 'image', 'text', 'other']
const sourcePlatforms: SourcePlatform[] = ['all', 'bilibili', 'twitter', 'pixiv', 'youtube', 'other', 'manual']
const workSortModes: WorkSortMode[] = ['latest', 'recommended']

function parseEnumValue<T extends string>(value: string | null, allowedValues: T[], fallback: T): T {
    return value && allowedValues.includes(value as T) ? value as T : fallback
}

function parseStudentIds(value: string | null) {
    if (!value) {
        return []
    }

    return value
        .split(',')
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item))
}

/**
 * 带搜索和筛选功能的推荐作品列表组件
 */
export function WorksWithFilters({ works, students, title, total, page, pageCount, hasError = false }: WorksWithFiltersProps) {
    const { locale } = useLocale()
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const t = labels[locale] || labels['zh-Hans']

    const availableSchools = useMemo(() => {
        const values = new Set<SchoolType>()
        students.forEach((student) => {
            if (student.school) {
                values.add(student.school)
            }
        })
        Object.keys(schoolNamesLocalized[locale] || {}).forEach((school) => values.add(school as SchoolType))
        return Array.from(values).sort()
    }, [locale, students])

    const availableSourcePlatforms = useMemo(() => {
        const values = new Set<SourcePlatform>(sourcePlatforms.filter((source) => source !== 'all'))
        works.forEach((work) => {
            const source = work.sourcePlatform
            if (source && sourcePlatforms.includes(source)) values.add(source)
        })
        return Array.from(values).sort()
    }, [works])

    const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '')
    const [nature, setNature] = useState<WorkNature>(() => parseEnumValue(searchParams.get('nature'), workNatures, 'all'))
    const [workType, setWorkType] = useState<WorkType>(() => parseEnumValue(searchParams.get('type'), workTypes, 'all'))
    const [school, setSchool] = useState<SchoolType | 'all'>(() => {
        const value = searchParams.get('school')
        return value && availableSchools.includes(value as SchoolType) ? value as SchoolType : 'all'
    })
    const [sourcePlatform, setSourcePlatform] = useState<SourcePlatform>(() => parseEnumValue(searchParams.get('source'), sourcePlatforms, 'all'))
    const [selectedStudents, setSelectedStudents] = useState<number[]>(() => parseStudentIds(searchParams.get('students')))
    const [featuredOnly, setFeaturedOnly] = useState(() => searchParams.get('featured') === '1')
    const [sortMode, setSortMode] = useState<WorkSortMode>(() => parseEnumValue(searchParams.get('sort'), workSortModes, 'latest'))

    useEffect(() => {
        const nextParams = new URLSearchParams()
        if (searchQuery.trim()) nextParams.set('q', searchQuery.trim())
        if (nature !== 'all') nextParams.set('nature', nature)
        if (workType !== 'all') nextParams.set('type', workType)
        if (school !== 'all') nextParams.set('school', school)
        if (sourcePlatform !== 'all') nextParams.set('source', sourcePlatform)
        if (selectedStudents.length > 0) nextParams.set('students', selectedStudents.join(','))
        if (featuredOnly) nextParams.set('featured', '1')
        if (sortMode !== 'latest') nextParams.set('sort', sortMode)
        if (searchParams.get('page')) nextParams.set('page', searchParams.get('page') || '1')

        const nextSearch = nextParams.toString()
        const currentSearch = searchParams.toString()
        if (nextSearch !== currentSearch) {
            router.replace(`${pathname}${nextSearch ? `?${nextSearch}` : ''}`, { scroll: false })
        }
    }, [featuredOnly, nature, pathname, router, school, searchParams, searchQuery, selectedStudents, sortMode, sourcePlatform, workType])

    const handleReset = useCallback(() => {
        setSearchQuery('')
        setNature('all')
        setWorkType('all')
        setSchool('all')
        setSourcePlatform('all')
        setSelectedStudents([])
        setFeaturedOnly(false)
        setSortMode('latest')
    }, [])

    const hasActiveFilters = Boolean(searchQuery) || nature !== 'all' || workType !== 'all' || school !== 'all' || sourcePlatform !== 'all' || selectedStudents.length > 0 || featuredOnly || sortMode !== 'latest'
    const handlePageChange = useCallback((nextPage: number) => {
        const nextParams = new URLSearchParams(searchParams.toString())
        if (nextPage <= 1) {
            nextParams.delete('page')
        } else {
            nextParams.set('page', String(nextPage))
        }
        const nextSearch = nextParams.toString()
        router.replace(`${pathname}${nextSearch ? `?${nextSearch}` : ''}`, { scroll: true })
    }, [pathname, router, searchParams])

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-4xl font-bold mb-2">{title}</h1>
                <p className="text-muted-foreground">{t.description}</p>
            </div>

            <SearchBar
                key={searchQuery}
                onSearch={setSearchQuery}
                initialValue={searchQuery}
                placeholder={t.searchPlaceholder}
                className="max-w-2xl mb-6"
            />

            <div className="space-y-3 mb-6">
                <WorksFilters
                    nature={nature}
                    workType={workType}
                    school={school}
                    sourcePlatform={sourcePlatform}
                    featuredOnly={featuredOnly}
                    sortMode={sortMode}
                    schools={availableSchools}
                    sourcePlatforms={availableSourcePlatforms}
                    onNatureChange={setNature}
                    onWorkTypeChange={setWorkType}
                    onSchoolChange={setSchool}
                    onSourcePlatformChange={setSourcePlatform}
                    onFeaturedOnlyChange={setFeaturedOnly}
                    onSortModeChange={setSortMode}
                    onReset={handleReset}
                />

                <StudentSelectorTrigger
                    students={students}
                    selectedStudents={selectedStudents}
                    onSelectionChange={setSelectedStudents}
                    allStudents={students}
                />

                {hasActiveFilters && (
                    <button onClick={handleReset} className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                        {t.clearAll}
                    </button>
                )}
            </div>

            <div className="mb-4 text-sm text-muted-foreground">
                {t.foundWorks.replace('{count}', String(total))}
                {hasActiveFilters ? <span className="ml-2">{t.shareHint}</span> : null}
            </div>

            {hasError ? (
                <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {t.error}
                </div>
            ) : null}

            {works.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {works.map((work) => (
                        <WorkCard key={work.id} work={work} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">{t.noResults}</p>
                    <button onClick={handleReset} className="mt-4 text-sm text-primary hover:underline cursor-pointer">
                        {t.clearFilters}
                    </button>
                </div>
            )}

            <Pagination currentPage={page} totalPages={pageCount} onPageChange={handlePageChange} className="mt-8" />
        </div>
    )
}
