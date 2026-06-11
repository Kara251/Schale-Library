'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { WorkCard } from '@/components/work-card'
import { WorksFilters, type WorkNature, type WorkType } from '@/components/works-filters'
import { StudentSelectorTrigger } from '@/components/student-selector'
import { SearchBar } from '@/components/search-bar'
import { Pagination } from '@/components/pagination'
import { useLocale } from '@/contexts/locale-context'
import type { Work, Student } from '@/lib/api'
import type { Locale } from '@/lib/i18n'

interface WorksWithFiltersProps {
    works: Work[]
    students: Student[]
    title: string
    initialSearchQuery?: string
    initialNature?: WorkNature
    initialWorkType?: WorkType
    initialStudentIds?: number[]
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
    en: {
        description: 'Selected Blue Archive creative works',
        searchPlaceholder: 'Search title, author...',
        clearAll: 'Clear all filters',
        foundWorks: 'Found {count} works',
        noResults: 'No matching works',
        clearFilters: 'Clear filters',
        shareHint: 'Filters are synced to the URL and can be shared directly.',
        error: 'Work data is temporarily unavailable. Showing the safe empty state.',
    },
    ja: {
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

/**
 * 带搜索和筛选功能的推荐作品列表组件（筛选条件同步到 URL，服务端分页）
 */
export function WorksWithFilters({
    works,
    students,
    title,
    initialSearchQuery = '',
    initialNature = 'all',
    initialWorkType = 'all',
    initialStudentIds = [],
    total,
    page,
    pageCount,
    hasError = false,
}: WorksWithFiltersProps) {
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

    const hasActiveFilters = Boolean(initialSearchQuery)
        || initialNature !== 'all'
        || initialWorkType !== 'all'
        || initialStudentIds.length > 0

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-4xl font-bold mb-2">{title}</h1>
                <p className="text-muted-foreground">{t.description}</p>
            </div>

            <SearchBar
                key={initialSearchQuery}
                initialValue={initialSearchQuery}
                onSearch={(value) => writeParams({ q: value.trim() || null })}
                placeholder={t.searchPlaceholder}
                className="max-w-2xl mb-6"
            />

            <div className="space-y-3 mb-6">
                <WorksFilters
                    nature={initialNature}
                    workType={initialWorkType}
                    onNatureChange={(value) => writeParams({ nature: value === 'all' ? null : value })}
                    onWorkTypeChange={(value) => writeParams({ type: value === 'all' ? null : value })}
                    onReset={handleReset}
                />

                <StudentSelectorTrigger
                    students={students}
                    selectedStudents={initialStudentIds}
                    onSelectionChange={(ids) => writeParams({ students: ids.length > 0 ? ids.join(',') : null })}
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
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {works.map((work) => (
                            <WorkCard key={work.id} work={work} />
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
