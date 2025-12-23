import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { WorksWithFilters } from "@/components/works-with-filters"
import { getWorks, getStudents } from "@/lib/api"
import type { Locale } from "@/lib/i18n"

interface WorksPageProps {
    params: Promise<{ locale: string }>
}

const titles: Record<Locale, string> = {
    'zh-Hans': '推荐作品',
    'en': 'Recommended Works',
    'ja': 'おすすめ作品',
}

export default async function WorksPage({ params }: WorksPageProps) {
    const { locale } = await params
    const title = titles[locale as Locale] || titles['zh-Hans']

    const [worksRes, studentsRes] = await Promise.all([
        getWorks(100).catch(() => ({ data: [] })),
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
