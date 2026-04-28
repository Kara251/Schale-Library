'use client'

import Image from 'next/image'
import { useEffect, useState, useMemo } from 'react'
import { X, Search, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/contexts/locale-context'
import type { Student, SchoolType } from '@/lib/api'
import { schoolNames, schoolNamesLocalized } from '@/lib/api'
import type { Locale } from '@/lib/i18n'
import { getMediaUrl } from '@/lib/media'

interface StudentSelectorProps {
    students: Student[]
    selectedStudents: number[]
    onSelectionChange: (studentIds: number[]) => void
    isOpen: boolean
    onClose: () => void
}

const labels: Record<Locale, {
    title: string
    selected: string
    searchPlaceholder: string
    school: string
    organization: string
    all: string
    clearFilters: string
    noResults: string
    clearSelection: string
    confirm: string
    clickToSelect: string
    prev: string
    next: string
    pageInfo: string
}> = {
    'zh-Hans': {
        title: '选择出场学生',
        selected: '已选择 {count} 个学生',
        searchPlaceholder: '搜索学生名字...',
        school: '学校',
        organization: '组织',
        all: '全部',
        clearFilters: '清除筛选',
        noResults: '没有找到符合条件的学生',
        clearSelection: '清除已选',
        confirm: '确定',
        clickToSelect: '点击选择学生...',
        prev: '上一页',
        next: '下一页',
        pageInfo: '第 {current} / {total} 页',
    },
    'en': {
        title: 'Select Students',
        selected: '{count} students selected',
        searchPlaceholder: 'Search student name...',
        school: 'School',
        organization: 'Club',
        all: 'All',
        clearFilters: 'Clear filters',
        noResults: 'No matching students',
        clearSelection: 'Clear selection',
        confirm: 'Confirm',
        clickToSelect: 'Click to select students...',
        prev: 'Previous',
        next: 'Next',
        pageInfo: 'Page {current} / {total}',
    },
    'ja': {
        title: '生徒を選択',
        selected: '{count}人の生徒を選択中',
        searchPlaceholder: '生徒名を検索...',
        school: '学校',
        organization: '部活',
        all: 'すべて',
        clearFilters: 'フィルターをクリア',
        noResults: '条件に合う生徒がいません',
        clearSelection: '選択をクリア',
        confirm: '確定',
        clickToSelect: '生徒を選択...',
        prev: '前へ',
        next: '次へ',
        pageInfo: 'ページ {current} / {total}',
    },
}

// schoolNamesLocalized 现在从 @/lib/api 导入

/**
 * 学生选择器弹窗组件
 */
export function StudentSelector({
    students,
    selectedStudents,
    onSelectionChange,
    isOpen,
    onClose,
}: StudentSelectorProps) {
    const { locale } = useLocale()
    const t = labels[locale] || labels['zh-Hans']
    const localizedSchoolNames = schoolNamesLocalized[locale] || schoolNamesLocalized['zh-Hans']

    const [searchQuery, setSearchQuery] = useState('')
    const [schoolFilter, setSchoolFilter] = useState<SchoolType | 'all'>('all')
    const [orgFilter, setOrgFilter] = useState<string>('all')
    const [page, setPage] = useState(1)
    const [remoteStudents, setRemoteStudents] = useState<Student[]>(students)
    const [pageCount, setPageCount] = useState(1)
    const [loading, setLoading] = useState(false)

    const schools = useMemo(() => {
        return Object.keys(localizedSchoolNames).sort() as SchoolType[]
    }, [localizedSchoolNames])

    useEffect(() => {
        if (!isOpen) return

        const controller = new AbortController()
        const timeoutId = setTimeout(async () => {
            setLoading(true)
            const params = new URLSearchParams({
                locale,
                page: String(page),
                pageSize: '50',
            })
            if (searchQuery.trim()) params.set('q', searchQuery.trim())
            if (schoolFilter !== 'all') params.set('school', schoolFilter)

            try {
                const response = await fetch(`/api/students?${params.toString()}`, {
                    signal: controller.signal,
                    cache: 'no-store',
                })
                if (!response.ok) throw new Error('Failed to load students')
                const payload = await response.json()
                setRemoteStudents(payload.data || [])
                setPageCount(payload.meta?.pagination?.pageCount || 1)
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.error('Failed to load students:', error)
                    setRemoteStudents(students)
                    setPageCount(1)
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false)
                }
            }
        }, 150)

        return () => {
            clearTimeout(timeoutId)
            controller.abort()
        }
    }, [isOpen, locale, page, schoolFilter, searchQuery, students])

    const organizations = useMemo(() => {
        const orgSet = new Set<string>()
        remoteStudents.forEach(s => {
            if (s.organization) orgSet.add(s.organization)
        })
        return Array.from(orgSet).sort()
    }, [remoteStudents])

    const filteredStudents = useMemo(() => {
        return remoteStudents.filter(student => {
            if (orgFilter !== 'all' && student.organization !== orgFilter) return false
            return true
        })
    }, [remoteStudents, orgFilter])

    const toggleStudent = (studentId: number) => {
        if (selectedStudents.includes(studentId)) {
            onSelectionChange(selectedStudents.filter(id => id !== studentId))
        } else {
            onSelectionChange([...selectedStudents, studentId])
        }
    }

    const clearSelection = () => onSelectionChange([])

    const clearFilters = () => {
        setSearchQuery('')
        setSchoolFilter('all')
        setOrgFilter('all')
        setPage(1)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative z-10 w-full max-w-4xl max-h-[80vh] bg-background border rounded-xl shadow-2xl overflow-hidden mx-4">
                <div className="flex items-center justify-between p-4 border-b">
                    <div>
                        <h2 className="text-xl font-bold">{t.title}</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t.selected.replace('{count}', String(selectedStudents.length))}
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="p-4 border-b space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value)
                                setPage(1)
                            }}
                            placeholder={t.searchPlaceholder}
                            className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{t.school}:</span>
                            <select
                                value={schoolFilter}
                                onChange={(e) => {
                                    setSchoolFilter(e.target.value as SchoolType | 'all')
                                    setPage(1)
                                }}
                                className="text-sm border rounded-lg px-2 py-1 bg-background cursor-pointer"
                            >
                                <option value="all">{t.all}</option>
                                {schools.map(school => (
                                    <option key={school} value={school}>
                                        {localizedSchoolNames[school] || schoolNames[school] || school}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {organizations.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold">{t.organization}:</span>
                                <select
                                    value={orgFilter}
                                    onChange={(e) => setOrgFilter(e.target.value)}
                                    className="text-sm border rounded-lg px-2 py-1 bg-background cursor-pointer"
                                >
                                    <option value="all">{t.all}</option>
                                    {organizations.map(org => (
                                        <option key={org} value={org}>{org}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {(searchQuery || schoolFilter !== 'all' || orgFilter !== 'all') && (
                            <button onClick={clearFilters} className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                                {t.clearFilters}
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-4 overflow-y-auto max-h-[50vh]">
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">{t.searchPlaceholder}</div>
                    ) : filteredStudents.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {filteredStudents.map(student => {
                                const isSelected = selectedStudents.includes(student.id)
                                return (
                                    <button
                                        key={student.id}
                                        onClick={() => toggleStudent(student.id)}
                                        className={cn(
                                            'flex flex-col items-center p-3 rounded-lg border transition-all cursor-pointer',
                                            isSelected ? 'border-primary bg-primary/10' : 'border-transparent bg-muted/50 hover:bg-muted'
                                        )}
                                    >
                                        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-secondary mb-2">
                                            {student.avatar ? (
                                                <Image src={getMediaUrl(student.avatar.url)} alt={student.name} fill sizes="48px" className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg font-bold">
                                                    {student.name.charAt(0)}
                                                </div>
                                            )}
                                            {isSelected && (
                                                <div className="absolute inset-0 bg-primary/60 flex items-center justify-center">
                                                    <Check className="h-6 w-6 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <span className={cn('text-sm font-medium text-center line-clamp-1', isSelected && 'text-primary')}>
                                            {student.name}
                                        </span>
                                        {student.school && (
                                            <span className="text-xs text-muted-foreground mt-0.5">
                                                {localizedSchoolNames[student.school] || schoolNames[student.school] || student.school}
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">{t.noResults}</div>
                    )}
                </div>

                <div className="flex items-center justify-between p-4 border-t bg-muted/30">
                    <button onClick={clearSelection} className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                        {t.clearSelection}
                    </button>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
                            {t.prev}
                        </Button>
                        <span>{t.pageInfo.replace('{current}', String(page)).replace('{total}', String(pageCount))}</span>
                        <Button variant="outline" size="sm" onClick={() => setPage(Math.min(pageCount, page + 1))} disabled={page >= pageCount}>
                            {t.next}
                        </Button>
                    </div>
                    <Button onClick={onClose}>
                        {t.confirm} ({selectedStudents.length})
                    </Button>
                </div>
            </div>
        </div>
    )
}

/**
 * 学生选择器触发按钮组件
 */
interface StudentSelectorTriggerProps {
    students: Student[]
    selectedStudents: number[]
    onSelectionChange: (studentIds: number[]) => void
    allStudents: Student[]
}

const triggerLabels: Record<Locale, { featured: string; clickToSelect: string }> = {
    'zh-Hans': { featured: '出场学生', clickToSelect: '点击选择学生...' },
    'en': { featured: 'Featured Students', clickToSelect: 'Click to select students...' },
    'ja': { featured: '登場生徒', clickToSelect: '生徒を選択...' },
}

export function StudentSelectorTrigger({
    students,
    selectedStudents,
    onSelectionChange,
    allStudents,
}: StudentSelectorTriggerProps) {
    const { locale } = useLocale()
    const t = triggerLabels[locale] || triggerLabels['zh-Hans']
    const [isOpen, setIsOpen] = useState(false)

    const selectedStudentInfo = useMemo(() => {
        return selectedStudents
            .map(id => allStudents.find(s => s.id === id))
            .filter(Boolean) as Student[]
    }, [selectedStudents, allStudents])

    return (
        <>
            <div>
                <div className="text-sm font-bold text-foreground mb-2">{t.featured}</div>
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                    {selectedStudents.length > 0 ? (
                        <>
                            <div className="flex -space-x-2">
                                {selectedStudentInfo.slice(0, 3).map(student => (
                                    <div key={student.id} className="relative w-6 h-6 rounded-full border-2 border-background overflow-hidden bg-secondary">
                                        {student.avatar ? (
                                            <Image src={getMediaUrl(student.avatar.url)} alt={student.name} fill sizes="24px" className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                                                {student.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <span>
                                {selectedStudentInfo.length > 3
                                    ? `${selectedStudentInfo.slice(0, 3).map(s => s.name).join(', ')} +${selectedStudentInfo.length - 3}`
                                    : selectedStudentInfo.map(s => s.name).join(', ')
                                }
                            </span>
                        </>
                    ) : (
                        <span>{t.clickToSelect}</span>
                    )}
                </button>
            </div>

            <StudentSelector
                students={students}
                selectedStudents={selectedStudents}
                onSelectionChange={onSelectionChange}
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
        </>
    )
}
