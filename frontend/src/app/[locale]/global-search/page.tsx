import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { LocaleLink } from "@/components/locale-link"
import { Search, Globe, MapPin, Bell, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { searchAnnouncements, searchOnlineEvents, searchOfflineEvents, searchWorks } from "@/lib/api"
import type { Locale } from "@/lib/i18n"

interface GlobalSearchPageProps {
    params: Promise<{ locale: string }>
    searchParams: Promise<{ q?: string }>
}

const content: Record<Locale, {
    title: string
    searching: string
    results: string
    announcements: string
    works: string
    onlineEvents: string
    offlineEvents: string
    noAnnouncements: string
    noWorks: string
    noOnlineEvents: string
    noOfflineEvents: string
    enterSearch: string
    author: string
    organizer: string
    official: string
    fanmade: string
    video: string
    image: string
    text: string
    other: string
}> = {
    'zh-Hans': {
        title: '搜索图书馆',
        searching: '搜索',
        results: '找到 {count} 个结果',
        announcements: '公告',
        works: '推荐作品',
        onlineEvents: '线上活动',
        offlineEvents: '线下活动',
        noAnnouncements: '暂无匹配的公告',
        noWorks: '暂无匹配的推荐作品',
        noOnlineEvents: '暂无匹配的线上活动',
        noOfflineEvents: '暂无匹配的线下活动',
        enterSearch: '请在顶部搜索框输入关键词进行搜索',
        author: '作者',
        organizer: '主办',
        official: '官方',
        fanmade: '同人',
        video: '视频',
        image: '图画',
        text: '文字',
        other: '其他',
    },
    'en': {
        title: 'Search Library',
        searching: 'Search',
        results: 'Found {count} results',
        announcements: 'Announcements',
        works: 'Recommended Works',
        onlineEvents: 'Online Events',
        offlineEvents: 'Offline Events',
        noAnnouncements: 'No matching announcements',
        noWorks: 'No matching works',
        noOnlineEvents: 'No matching online events',
        noOfflineEvents: 'No matching offline events',
        enterSearch: 'Enter keywords in the search box above',
        author: 'Author',
        organizer: 'Organizer',
        official: 'Official',
        fanmade: 'Fan-made',
        video: 'Video',
        image: 'Image',
        text: 'Text',
        other: 'Other',
    },
    'ja': {
        title: '図書館を検索',
        searching: '検索',
        results: '{count}件の結果',
        announcements: 'お知らせ',
        works: 'おすすめ作品',
        onlineEvents: 'オンラインイベント',
        offlineEvents: 'オフラインイベント',
        noAnnouncements: '該当するお知らせはありません',
        noWorks: '該当する作品はありません',
        noOnlineEvents: '該当するオンラインイベントはありません',
        noOfflineEvents: '該当するオフラインイベントはありません',
        enterSearch: '上部の検索ボックスにキーワードを入力してください',
        author: '作者',
        organizer: '主催',
        official: '公式',
        fanmade: '二次創作',
        video: '動画',
        image: '画像',
        text: 'テキスト',
        other: 'その他',
    },
}

export default async function GlobalSearchPage({ params, searchParams }: GlobalSearchPageProps) {
    const { locale } = await params
    const { q: searchQuery = '' } = await searchParams
    const t = content[locale as Locale] || content['zh-Hans']

    let announcements: any[] = []
    let works: any[] = []
    let onlineEvents: any[] = []
    let offlineEvents: any[] = []

    if (searchQuery) {
        const [announcementsRes, worksRes, onlineEventsRes, offlineEventsRes] = await Promise.all([
            searchAnnouncements(searchQuery, locale).catch(() => ({ data: [] })),
            searchWorks(searchQuery).catch(() => ({ data: [] })),
            searchOnlineEvents(searchQuery, locale).catch(() => ({ data: [] })),
            searchOfflineEvents(searchQuery, locale).catch(() => ({ data: [] })),
        ])
        announcements = announcementsRes.data || []
        works = worksRes.data || []
        onlineEvents = onlineEventsRes.data || []
        offlineEvents = offlineEventsRes.data || []
    }

    const totalResults = announcements.length + works.length + onlineEvents.length + offlineEvents.length
    const workTypeLabels: Record<string, string> = {
        video: t.video,
        image: t.image,
        text: t.text,
        other: t.other,
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
                <div className="content-panel">
                    <div className="max-w-4xl mx-auto">
                        <div className="mb-8">
                            <h1 className="text-4xl font-bold mb-2">{t.title}</h1>
                            {searchQuery && (
                                <p className="text-muted-foreground">
                                    {t.searching}: <span className="text-foreground font-medium">"{searchQuery}"</span>
                                    {totalResults > 0 && (
                                        <span className="ml-2">· {t.results.replace('{count}', String(totalResults))}</span>
                                    )}
                                </p>
                            )}
                        </div>

                        <div className="space-y-6">
                            {searchQuery ? (
                                <>
                                    {/* Announcements */}
                                    <section className="bg-card border rounded-lg p-6">
                                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                            <Bell className="h-5 w-5" />
                                            {t.announcements}
                                            <Badge variant="secondary" className="ml-2">{announcements.length}</Badge>
                                        </h2>
                                        {announcements.length > 0 ? (
                                            <div className="space-y-3">
                                                {announcements.map((item) => (
                                                    <LocaleLink
                                                        key={item.id}
                                                        href={`/announcements/${item.id}`}
                                                        className="block p-4 rounded-lg border bg-background hover:bg-secondary/50 transition-colors"
                                                    >
                                                        <h3 className="font-semibold">{item.title}</h3>
                                                    </LocaleLink>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-muted-foreground">{t.noAnnouncements}</p>
                                        )}
                                    </section>

                                    {/* Works */}
                                    <section className="bg-card border rounded-lg p-6">
                                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                            <Star className="h-5 w-5" />
                                            {t.works}
                                            <Badge variant="secondary" className="ml-2">{works.length}</Badge>
                                        </h2>
                                        {works.length > 0 ? (
                                            <div className="space-y-3">
                                                {works.map((item) => (
                                                    <LocaleLink
                                                        key={item.id}
                                                        href={`/works/${item.id}`}
                                                        className="block p-4 rounded-lg border bg-background hover:bg-secondary/50 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="font-semibold">{item.title}</h3>
                                                            <Badge variant={item.nature === 'official' ? 'default' : 'secondary'}>
                                                                {item.nature === 'official' ? t.official : t.fanmade}
                                                            </Badge>
                                                            <Badge variant="outline">{workTypeLabels[item.workType] || t.other}</Badge>
                                                        </div>
                                                        {item.author && <p className="text-sm text-muted-foreground">{t.author}: {item.author}</p>}
                                                    </LocaleLink>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-muted-foreground">{t.noWorks}</p>
                                        )}
                                    </section>

                                    {/* Online Events */}
                                    <section className="bg-card border rounded-lg p-6">
                                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                            <Globe className="h-5 w-5" />
                                            {t.onlineEvents}
                                            <Badge variant="secondary" className="ml-2">{onlineEvents.length}</Badge>
                                        </h2>
                                        {onlineEvents.length > 0 ? (
                                            <div className="space-y-3">
                                                {onlineEvents.map((item) => (
                                                    <LocaleLink
                                                        key={item.id}
                                                        href={`/online-events/${item.id}`}
                                                        className="block p-4 rounded-lg border bg-background hover:bg-secondary/50 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="font-semibold">{item.title}</h3>
                                                            <Badge variant={item.nature === 'official' ? 'default' : 'secondary'}>
                                                                {item.nature === 'official' ? t.official : t.fanmade}
                                                            </Badge>
                                                        </div>
                                                        {item.organizer && <p className="text-sm text-muted-foreground">{t.organizer}: {item.organizer}</p>}
                                                    </LocaleLink>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-muted-foreground">{t.noOnlineEvents}</p>
                                        )}
                                    </section>

                                    {/* Offline Events */}
                                    <section className="bg-card border rounded-lg p-6">
                                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                            <MapPin className="h-5 w-5" />
                                            {t.offlineEvents}
                                            <Badge variant="secondary" className="ml-2">{offlineEvents.length}</Badge>
                                        </h2>
                                        {offlineEvents.length > 0 ? (
                                            <div className="space-y-3">
                                                {offlineEvents.map((item) => (
                                                    <LocaleLink
                                                        key={item.id}
                                                        href={`/offline-events/${item.id}`}
                                                        className="block p-4 rounded-lg border bg-background hover:bg-secondary/50 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="font-semibold">{item.title}</h3>
                                                            <Badge variant={item.nature === 'official' ? 'default' : 'secondary'}>
                                                                {item.nature === 'official' ? t.official : t.fanmade}
                                                            </Badge>
                                                        </div>
                                                        {item.location && (
                                                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                                <MapPin className="h-3 w-3" />
                                                                {item.location}
                                                            </p>
                                                        )}
                                                    </LocaleLink>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-muted-foreground">{t.noOfflineEvents}</p>
                                        )}
                                    </section>
                                </>
                            ) : (
                                <div className="text-center py-16">
                                    <Search className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                                    <p className="text-xl text-muted-foreground">{t.enterSearch}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
