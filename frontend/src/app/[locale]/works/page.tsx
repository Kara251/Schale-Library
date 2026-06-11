import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { WorksWithFilters } from "@/components/works-with-filters"
import type { WorkNature, WorkType } from "@/components/works-filters"
import { getAllStudents, getWorks } from "@/lib/api"
import type { Locale } from "@/lib/i18n"

export const revalidate = 60;

interface WorksPageProps {
    params: Promise<{ locale: string }>
    searchParams: Promise<{
        q?: string
        nature?: WorkNature
        type?: WorkType
        students?: string
        page?: string
    }>
}

const titles: Record<Locale, string> = {
    'zh-Hans': '推荐作品',
    'en': 'Recommended Works',
    'ja': 'おすすめ作品',
}

const workNatures: WorkNature[] = ['all', 'official', 'fanmade']
const workTypes: WorkType[] = ['all', 'video', 'image', 'text', 'other']
const PAGE_SIZE = 24

function parseValue<T extends string>(value: string | undefined, allowed: T[], fallback: T): T {
    return value && allowed.includes(value as T) ? value as T : fallback
}

function parseStudentIds(value: string | undefined): number[] {
    if (!value) return []
    return value
        .split(',')
        .map((part) => Number(part.trim()))
        .filter((id) => Number.isInteger(id) && id > 0)
}

export default async function WorksPage({ params, searchParams }: WorksPageProps) {
    const { locale } = await params
    const filters = await searchParams
    const title = titles[locale as Locale] || titles['zh-Hans']
    const page = Math.max(1, Number(filters.page || '1'))
    const nature = parseValue(filters.nature, workNatures, 'all')
    const workType = parseValue(filters.type, workTypes, 'all')
    const studentIds = parseStudentIds(filters.students)

    const [worksResult, studentsRes] = await Promise.all([
        getWorks(PAGE_SIZE, locale, {
            query: filters.q,
            nature,
            workType,
            studentIds,
            page,
            pageSize: PAGE_SIZE,
        }).then((response) => ({ response, hasError: false })).catch((error) => {
            console.error('Failed to load works:', error)
            return {
                response: {
                    data: [],
                    meta: { pagination: { page, pageSize: PAGE_SIZE, pageCount: 1, total: 0 } },
                },
                hasError: true,
            }
        }),
        getAllStudents(locale).catch(() => ({ data: [] })),
    ])
    const worksRes = worksResult.response
    const works = worksRes.data || []
    const students = studentsRes.data || []
    const pagination = worksRes.meta?.pagination || { page, pageCount: 1, total: works.length }

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
                <div className="content-panel">
                    <WorksWithFilters
                        works={works}
                        students={students}
                        title={title}
                        initialSearchQuery={filters.q || ''}
                        initialNature={nature}
                        initialWorkType={workType}
                        initialStudentIds={studentIds}
                        total={pagination.total}
                        page={pagination.page}
                        pageCount={pagination.pageCount}
                        hasError={worksResult.hasError}
                    />
                </div>
            </main>

            <Footer />
        </div>
    )
}
