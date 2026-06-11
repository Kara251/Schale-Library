import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { getAnnouncements } from "@/lib/api"
import { AnnouncementCard } from "@/components/announcement-card"
import { UrlPagination } from "@/components/url-pagination"
import type { Locale } from "@/lib/i18n"

export const revalidate = 60;

interface AnnouncementsPageProps {
    params: Promise<{ locale: string }>
    searchParams: Promise<{ page?: string }>
}

const content: Record<Locale, { title: string; description: string; empty: string }> = {
    'zh-Hans': { title: '公告', description: '查看最新公告信息', empty: '暂无公告' },
    'en': { title: 'Announcements', description: 'View the latest announcements', empty: 'No announcements' },
    'ja': { title: 'お知らせ', description: '最新のお知らせをチェック', empty: 'お知らせはありません' },
}

export default async function AnnouncementsPage({ params, searchParams }: AnnouncementsPageProps) {
    const { locale } = await params
    const { page: pageParam } = await searchParams
    const t = content[locale as Locale] || content['zh-Hans']
    const page = Math.max(1, Number(pageParam || '1'))

    const announcementsRes = await getAnnouncements(locale, { page, pageSize: 24 })
        .catch(() => ({ data: [], meta: {} as { pagination?: { page: number; pageCount: number } } }))
    const announcements = announcementsRes.data || []
    const pagination = announcementsRes.meta?.pagination

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
                <div className="content-panel">
                    {/* 页面标题 */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold mb-2">{t.title}</h1>
                        <p className="text-muted-foreground">{t.description}</p>
                    </div>

                    {/* 公告列表 */}
                    {announcements.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {announcements.map((announcement) => (
                                    <AnnouncementCard key={announcement.id} announcement={announcement} />
                                ))}
                            </div>
                            {pagination && pagination.pageCount > 1 ? (
                                <UrlPagination
                                    currentPage={pagination.page}
                                    totalPages={pagination.pageCount}
                                    className="mt-8"
                                />
                            ) : null}
                        </>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">{t.empty}</p>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    )
}
