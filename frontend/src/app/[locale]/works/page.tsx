import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { WorksWithFilters } from "@/components/works-with-filters"
import { getStudents, getWorks } from "@/lib/api"
import type { Locale } from "@/lib/i18n"

export const revalidate = 60;

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

    const [worksResult, studentsRes] = await Promise.all([
        getWorks(100, locale).then((response) => ({ response, hasError: false })).catch((error) => {
            console.error('Failed to load works:', error)
            return {
                response: { data: [] },
                hasError: true,
            }
        }),
        getStudents(locale).catch(() => ({ data: [] })),
    ])
    const worksRes = worksResult.response
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
                        hasError={worksResult.hasError}
                    />
                </div>
            </main>

            <Footer />
        </div>
    )
}
