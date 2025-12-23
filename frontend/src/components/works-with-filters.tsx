'use client'

import { useState, useMemo, useCallback } from 'react'
import { WorkCard } from '@/components/work-card'
import { WorksFilters, type WorkNature, type WorkType } from '@/components/works-filters'
import { StudentSelectorTrigger } from '@/components/student-selector'
import { SearchBar } from '@/components/search-bar'
import { useLocale } from '@/contexts/locale-context'
import type { Work, Student } from '@/lib/api'
import type { Locale } from '@/lib/i18n'

interface WorksWithFiltersProps {
    works: Work[]
    students: Student[]
    title: string
}

const labels: Record<Locale, {
    description: string
    searchPlaceholder: string
    clearAll: string
    foundWorks: string
    noResults: string
    clearFilters: string
}> = {
    'zh-Hans': {
        description: '精选蔚蓝档案相关创作内容',
        searchPlaceholder: '搜索作品名称、作者...',
        clearAll: '清除所有筛选',
        foundWorks: '找到 {count} 个作品',
        noResults: '暂无符合条件的作品',
        clearFilters: '清除筛选条件',
    },
    'en': {
        description: 'Selected Blue Archive creative works',
        searchPlaceholder: 'Search title, author...',
        clearAll: 'Clear all filters',
        foundWorks: 'Found {count} works',
        noResults: 'No matching works',
        clearFilters: 'Clear filters',
    },
    'ja': {
        description: 'ブルーアーカイブ関連作品セレクション',
        searchPlaceholder: '作品名、作者を検索...',
        clearAll: 'すべてのフィルターをクリア',
        foundWorks: '{count}件の作品が見つかりました',
        noResults: '条件に合う作品がありません',
        clearFilters: 'フィルターをクリア',
    },
}

/**
 * 带搜索和筛选功能的推荐作品列表组件
 */
export function WorksWithFilters({ works, students, title }: WorksWithFiltersProps) {
    const { locale } = useLocale()
    const t = labels[locale] || labels['zh-Hans']

    const [searchQuery, setSearchQuery] = useState('')
    const [nature, setNature] = useState<WorkNature>('all')
    const [workType, setWorkType] = useState<WorkType>('all')
    const [selectedStudents, setSelectedStudents] = useState<number[]>([])

    const filteredWorks = useMemo(() => {
        return works.filter((work) => {
            if (searchQuery) {
                const query = searchQuery.toLowerCase()
                const matchesTitle = work.title.toLowerCase().includes(query)
                const matchesAuthor = work.author?.toLowerCase().includes(query) || false
                if (!matchesTitle && !matchesAuthor) return false
            }
            if (nature !== 'all' && work.nature !== nature) return false
            if (workType !== 'all' && work.workType !== workType) return false
            if (selectedStudents.length > 0) {
                const workStudentIds = work.students?.map(s => s.id) || []
                const hasMatchingStudent = selectedStudents.some(id => workStudentIds.includes(id))
                if (!hasMatchingStudent) return false
            }
            return true
        })
    }, [works, searchQuery, nature, workType, selectedStudents])

    const handleReset = useCallback(() => {
        setSearchQuery('')
        setNature('all')
        setWorkType('all')
        setSelectedStudents([])
    }, [])

    const hasActiveFilters = nature !== 'all' || workType !== 'all' || selectedStudents.length > 0

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-4xl font-bold mb-2">{title}</h1>
                <p className="text-muted-foreground">{t.description}</p>
            </div>

            <SearchBar
                onSearch={setSearchQuery}
                placeholder={t.searchPlaceholder}
                className="max-w-2xl mb-6"
            />

            <div className="space-y-3 mb-6">
                <WorksFilters
                    nature={nature}
                    workType={workType}
                    onNatureChange={setNature}
                    onWorkTypeChange={setWorkType}
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
                {t.foundWorks.replace('{count}', String(filteredWorks.length))}
            </div>

            {filteredWorks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredWorks.map((work) => (
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
        </div>
    )
}
