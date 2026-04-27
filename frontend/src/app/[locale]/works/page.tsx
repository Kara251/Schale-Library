import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { WorksWithFilters } from "@/components/works-with-filters"
import { getStudents, getWorks } from "@/lib/api"
import type { SchoolType, Work } from "@/lib/api"
import type { Locale } from "@/lib/i18n"

export const revalidate = 60;

interface WorksPageProps {
    params: Promise<{ locale: string }>
    searchParams: Promise<{
        q?: string
        nature?: Work['nature'] | 'all'
        type?: Work['workType'] | 'all'
        school?: SchoolType | 'all'
        source?: NonNullable<Work['sourcePlatform']> | 'all'
        students?: string
    }>
}

const titles: Record<Locale, string> = {
    'zh-Hans': '推荐作品',
    'en': 'Recommended Works',
    'ja': 'おすすめ作品',
}

export default async function WorksPage({ params, searchParams }: WorksPageProps) {
    const { locale } = await params
    const title = titles[locale as Locale] || titles['zh-Hans']
    const filters = await searchParams
    const studentIds = filters.students
        ?.split(',')
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item))

    const [worksRes, studentsRes] = await Promise.all([
        getWorks(100, locale, {
            query: filters.q,
            nature: filters.nature,
            workType: filters.type,
            school: filters.school,
            sourcePlatform: filters.source,
            studentIds,
        }).catch((error) => {
            console.error('Failed to load works:', error)
            return { data: [] }
        }),
        getStudents(locale).catch(() => ({ data: [] })),
    ])
    const works = worksRes.data || []
    const students = studentsRes.data || []

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
                <div className="content-panel">
                    <WorksWithFilters
                        works={works}
                        students={students}
                        title={title}
                    />
                </div>
            </main>

            <Footer />
        </div>
    )
}
