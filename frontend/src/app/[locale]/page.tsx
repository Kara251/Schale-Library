import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Carousel } from "@/components/carousel"
import { EventList } from "@/components/event-list"
import { FriendLinksSection } from "@/components/friend-links-section"
import { HomeResearchSection } from "@/components/home-research-section"
import { WorkCard } from "@/components/work-card"
import { getFeaturedWorks, getFriendLinks, getHomeAnnouncements, getHomeOfflineEvents, getHomeOnlineEvents, getRecentResearchEntries } from "@/lib/api"
import { translations, type Locale } from "@/lib/i18n"

interface HomePageProps {
    params: Promise<{ locale: string }>
}

export const revalidate = 60;

export default async function HomePage({ params }: HomePageProps) {
    const { locale } = await params
    const t = translations[locale as Locale] || translations['zh-Hans']

    // 并行获取数据，传递语言参数
    const [announcementsRes, onlineEventsRes, offlineEventsRes, worksRes, friendLinksRes, researchRes] = await Promise.all([
        getHomeAnnouncements(locale).catch(() => ({ data: [] })),
        getHomeOnlineEvents(6, locale).catch(() => ({ data: [] })),
        getHomeOfflineEvents(6, locale).catch(() => ({ data: [] })),
        getFeaturedWorks(6, locale).catch(() => ({ data: [] })),
        getFriendLinks(locale, 6).catch(() => ({ data: [] })),
        getRecentResearchEntries(locale, 3).catch(() => ({ data: [] })),
    ]);

    const announcements = announcementsRes.data || [];
    const onlineEvents = onlineEventsRes.data || [];
    const offlineEvents = offlineEventsRes.data || [];
    const works = worksRes.data || [];
    const friendLinks = friendLinksRes.data || [];
    const researchEntries = researchRes.data || [];

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
                <div className="content-panel">
                    {/* 轮播图区域 */}
                    <section className="mb-8">
                        <Carousel
                            announcements={announcements}
                            onlineEvents={onlineEvents.slice(0, 3)}
                            offlineEvents={offlineEvents.slice(0, 3)}
                        />
                    </section>

                    {/* 最新活动区域 */}
                    <section className="mb-8">
                        <EventList
                            onlineEvents={onlineEvents}
                            offlineEvents={offlineEvents}
                            title={t['home.latestEvents'] || '最新活动'}
                            showLimit={3}
                            showLoadMore={false}
                            showCount={false}
                        />
                    </section>

                    {/* 最新推荐作品区域 */}
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-3xl font-bold">
                                {t['home.featuredWorks'] || t['home.latestWorks'] || '精选推荐作品'}
                            </h2>
                        </div>
                        {works.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {works.slice(0, 3).map((work) => (
                                    <WorkCard key={work.id} work={work} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">
                                    {t['home.noWorks'] || '暂无推荐作品'}
                                </p>
                            </div>
                        )}
                    </section>

                    {researchEntries.length > 0 ? (
                        <HomeResearchSection entries={researchEntries} locale={locale as Locale} />
                    ) : null}

                    <FriendLinksSection links={friendLinks} locale={locale} />
                </div>
            </main>

            <Footer />
        </div>
    )
}
