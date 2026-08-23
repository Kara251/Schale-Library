import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { LocaleLink } from "@/components/locale-link"
import { CreatorCard } from "@/components/creator-card"
import { Search, Globe, MapPin, Bell, Users, BookOpen } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
    getContentEntryPathId,
    searchAllContent,
    type Announcement,
    type OnlineEvent,
    type OfflineEvent,
    researchSubjectTypeLabels,
    type Creator,
    type ResearchSubject,
} from "@/lib/api"
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
    creators: string
    onlineEvents: string
    offlineEvents: string
    subjects: string
    noAnnouncements: string
    noCreators: string
    noOnlineEvents: string
    noOfflineEvents: string
    noSubjects: string
    enterSearch: string
    organizer: string
    official: string
    fanmade: string
    partialError: string
}> = {
    'zh-Hans': {
        title: '搜索图书馆',
        searching: '搜索',
        results: '找到 {count} 个结果',
        announcements: '公告',
        creators: '创作者',
        onlineEvents: '线上活动',
        offlineEvents: '线下活动',
        subjects: '考据对象',
        noAnnouncements: '暂无匹配的公告',
        noCreators: '暂无匹配的创作者',
        noOnlineEvents: '暂无匹配的线上活动',
        noOfflineEvents: '暂无匹配的线下活动',
        noSubjects: '暂无匹配的考据对象',
        enterSearch: '请在顶部搜索框输入关键词进行搜索',
        organizer: '主办',
        official: '官方',
        fanmade: '同人',
        partialError: '部分搜索结果暂时不可用，请稍后重试。',
    },
    'en': {
        title: 'Search Library',
        searching: 'Search',
        results: 'Found {count} results',
        announcements: 'Announcements',
        onlineEvents: 'Online Events',
        offlineEvents: 'Offline Events',
        creators: 'Creators',
        subjects: 'Subjects',
        noAnnouncements: 'No matching announcements',
        noCreators: 'No matching creators',
        noOnlineEvents: 'No matching online events',
        noOfflineEvents: 'No matching offline events',
        noSubjects: 'No matching subjects',
        enterSearch: 'Enter keywords in the search box above',
        organizer: 'Organizer',
        official: 'Official',
        fanmade: 'Fan-made',
        partialError: 'Some search sections are temporarily unavailable.',
    },
    'ja': {
        title: '図書館を検索',
        searching: '検索',
        results: '{count}件の結果',
        announcements: 'お知らせ',
        onlineEvents: 'オンラインイベント',
        offlineEvents: 'オフラインイベント',
        creators: 'クリエイター',
        subjects: '考察対象',
        noAnnouncements: '該当するお知らせはありません',
        noCreators: '該当するクリエイターはありません',
        noOnlineEvents: '該当するオンラインイベントはありません',
        noOfflineEvents: '該当するオフラインイベントはありません',
        noSubjects: '該当する考察対象はありません',
        enterSearch: '上部の検索ボックスにキーワードを入力してください',
        organizer: '主催',
        official: '公式',
        fanmade: '二次創作',
        partialError: '一部の検索結果は一時的に利用できません。',
    },
}

export default async function GlobalSearchPage({ params, searchParams }: GlobalSearchPageProps) {
    const { locale } = await params
    const { q: searchQuery = '' } = await searchParams
    const t = content[locale as Locale] || content['zh-Hans']

    let announcements: Announcement[] = []
    let creators: Creator[] = []
    let onlineEvents: OnlineEvent[] = []
    let offlineEvents: OfflineEvent[] = []
    let subjects: ResearchSubject[] = []
    let resultTotals = {
        announcements: 0,
        creators: 0,
        onlineEvents: 0,
        offlineEvents: 0,
        subjects: 0,
    }
    let hasSearchError = false

    if (searchQuery) {
        const results = await searchAllContent(searchQuery, locale)
        announcements = results.announcements.data || []
        creators = results.creators.data || []
        onlineEvents = results.onlineEvents.data || []
        offlineEvents = results.offlineEvents.data || []
        subjects = results.subjects.data || []
        resultTotals = {
            announcements: results.announcements.total,
            creators: results.creators.total,
            onlineEvents: results.onlineEvents.total,
            offlineEvents: results.offlineEvents.total,
            subjects: results.subjects.total,
        }
        hasSearchError = Boolean(results.announcements.error || results.creators.error || results.onlineEvents.error || results.offlineEvents.error || results.subjects.error)
    }

    const sortByFreshness = <T extends { publishedAt?: string; updatedAt?: string; createdAt?: string }>(items: T[]) => {
        return [...items].sort((a, b) => {
            const aTime = new Date(a.publishedAt || a.updatedAt || a.createdAt || 0).getTime()
            const bTime = new Date(b.publishedAt || b.updatedAt || b.createdAt || 0).getTime()
            return bTime - aTime
        })
    }

    announcements = sortByFreshness(announcements)
    creators = sortByFreshness(creators)
    onlineEvents = sortByFreshness(onlineEvents)
    offlineEvents = sortByFreshness(offlineEvents)
    const subjectTypeLabels = researchSubjectTypeLabels[locale as Locale] || researchSubjectTypeLabels['zh-Hans']

    const totalResults = resultTotals.announcements + resultTotals.creators + resultTotals.onlineEvents + resultTotals.offlineEvents + resultTotals.subjects

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
                                    {t.searching}: <span className="text-foreground font-medium">&ldquo;{searchQuery}&rdquo;</span>
                                    {totalResults > 0 && (
                                        <span className="ml-2">· {t.results.replace('{count}', String(totalResults))}</span>
                                    )}
                                </p>
                            )}
                            {searchQuery && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <Badge variant="secondary">{t.announcements} {resultTotals.announcements}</Badge>
                                    <Badge variant="secondary">{t.creators} {resultTotals.creators}</Badge>
                                    <Badge variant="secondary">{t.subjects} {resultTotals.subjects}</Badge>
                                    <Badge variant="secondary">{t.onlineEvents} {resultTotals.onlineEvents}</Badge>
                                    <Badge variant="secondary">{t.offlineEvents} {resultTotals.offlineEvents}</Badge>
                                </div>
                            )}
                            {hasSearchError && (
                                <p className="mt-3 text-sm text-destructive">{t.partialError}</p>
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
                                                        href={`/announcements/${getContentEntryPathId(item)}`}
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

                                    {/* Creators */}
                                    <section className="bg-card border rounded-lg p-6">
                                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                            <Users className="h-5 w-5" />
                                            {t.creators}
                                            <Badge variant="secondary" className="ml-2">{creators.length}</Badge>
                                        </h2>
                                        {creators.length > 0 ? (
                                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                {creators.map((item) => (
                                                    <CreatorCard key={item.id} creator={item} />
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-muted-foreground">{t.noCreators}</p>
                                        )}
                                    </section>

                                    {/* Subjects */}
                                    <section className="bg-card border rounded-lg p-6">
                                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                            <BookOpen className="h-5 w-5" />
                                            {t.subjects}
                                            <Badge variant="secondary" className="ml-2">{subjects.length}</Badge>
                                        </h2>
                                        {subjects.length > 0 ? (
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                {subjects.map((item) => (
                                                    <LocaleLink
                                                        key={item.id}
                                                        href={`/research-archives/subjects/${item.slug}`}
                                                        className="flex items-center justify-between gap-3 rounded-lg border bg-background p-4 transition-colors hover:bg-secondary/50"
                                                    >
                                                        <div className="min-w-0">
                                                            <h3 className="font-semibold truncate">{item.name}</h3>
                                                            <p className="text-sm text-muted-foreground">{subjectTypeLabels[item.subject_type]}</p>
                                                        </div>
                                                    </LocaleLink>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-muted-foreground">{t.noSubjects}</p>
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
                                                        href={`/online-events/${getContentEntryPathId(item)}`}
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
                                                        href={`/offline-events/${getContentEntryPathId(item)}`}
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
