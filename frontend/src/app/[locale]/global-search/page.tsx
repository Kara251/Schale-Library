import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { LocaleLink } from "@/components/locale-link"
import { Search, Globe, MapPin, Bell, Star, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
    getContentEntryPathId,
    searchAnnouncements,
    searchOnlineEvents,
    searchOfflineEvents,
    searchStudents,
    searchWorks,
    type Announcement,
    type OnlineEvent,
    type OfflineEvent,
    type Student,
    type Work,
} from "@/lib/api"
import { getMediaUrl } from "@/lib/media"
import type { Locale } from "@/lib/i18n"
import Image from "next/image"

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
    students: string
    noAnnouncements: string
    noWorks: string
    noOnlineEvents: string
    noOfflineEvents: string
    noStudents: string
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
        students: '学生',
        noAnnouncements: '暂无匹配的公告',
        noWorks: '暂无匹配的推荐作品',
        noOnlineEvents: '暂无匹配的线上活动',
        noOfflineEvents: '暂无匹配的线下活动',
        noStudents: '暂无匹配的学生',
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
        students: 'Students',
        noAnnouncements: 'No matching announcements',
        noWorks: 'No matching works',
        noOnlineEvents: 'No matching online events',
        noOfflineEvents: 'No matching offline events',
        noStudents: 'No matching students',
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
        students: '生徒',
        noAnnouncements: '該当するお知らせはありません',
        noWorks: '該当する作品はありません',
        noOnlineEvents: '該当するオンラインイベントはありません',
        noOfflineEvents: '該当するオフラインイベントはありません',
        noStudents: '該当する生徒はありません',
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

    let announcements: Announcement[] = []
    let works: Work[] = []
    let onlineEvents: OnlineEvent[] = []
    let offlineEvents: OfflineEvent[] = []
    let students: Student[] = []

    if (searchQuery) {
        const [announcementsRes, worksRes, onlineEventsRes, offlineEventsRes, studentsRes] = await Promise.all([
            searchAnnouncements(searchQuery, locale).catch((error) => {
                console.error('Failed to search announcements:', error)
                return { data: [] }
            }),
            searchWorks(searchQuery, locale).catch((error) => {
                console.error('Failed to search works:', error)
                return { data: [] }
            }),
            searchOnlineEvents(searchQuery, locale).catch((error) => {
                console.error('Failed to search online events:', error)
                return { data: [] }
            }),
            searchOfflineEvents(searchQuery, locale).catch((error) => {
                console.error('Failed to search offline events:', error)
                return { data: [] }
            }),
            searchStudents(searchQuery, locale).catch((error) => {
                console.error('Failed to search students:', error)
                return { data: [] }
            }),
        ])
        announcements = announcementsRes.data || []
        works = worksRes.data || []
        onlineEvents = onlineEventsRes.data || []
        offlineEvents = offlineEventsRes.data || []
        students = studentsRes.data || []
    }

    const sortByFreshness = <T extends { publishedAt?: string; updatedAt?: string; createdAt?: string }>(items: T[]) => {
        return [...items].sort((a, b) => {
            const aTime = new Date(a.publishedAt || a.updatedAt || a.createdAt || 0).getTime()
            const bTime = new Date(b.publishedAt || b.updatedAt || b.createdAt || 0).getTime()
            return bTime - aTime
        })
    }

    announcements = sortByFreshness(announcements)
    works = sortByFreshness(works)
    onlineEvents = sortByFreshness(onlineEvents)
    offlineEvents = sortByFreshness(offlineEvents)
    students = sortByFreshness(students)

    const totalResults = announcements.length + works.length + onlineEvents.length + offlineEvents.length + students.length
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
                                    {t.searching}: <span className="text-foreground font-medium">&ldquo;{searchQuery}&rdquo;</span>
                                    {totalResults > 0 && (
                                        <span className="ml-2">· {t.results.replace('{count}', String(totalResults))}</span>
                                    )}
                                </p>
                            )}
                            {searchQuery && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <Badge variant="secondary">{t.announcements} {announcements.length}</Badge>
                                    <Badge variant="secondary">{t.works} {works.length}</Badge>
                                    <Badge variant="secondary">{t.students} {students.length}</Badge>
                                    <Badge variant="secondary">{t.onlineEvents} {onlineEvents.length}</Badge>
                                    <Badge variant="secondary">{t.offlineEvents} {offlineEvents.length}</Badge>
                                </div>
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

                                    {/* Students */}
                                    <section className="bg-card border rounded-lg p-6">
                                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                            <Users className="h-5 w-5" />
                                            {t.students}
                                            <Badge variant="secondary" className="ml-2">{students.length}</Badge>
                                        </h2>
                                        {students.length > 0 ? (
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                {students.map((item) => (
                                                    <LocaleLink
                                                        key={item.id}
                                                        href={`/students/${getContentEntryPathId(item)}`}
                                                        className="flex items-center gap-3 rounded-lg border bg-background p-4 transition-colors hover:bg-secondary/50"
                                                    >
                                                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-secondary">
                                                            {item.avatar ? (
                                                                <Image src={getMediaUrl(item.avatar.url)} alt={item.name} fill sizes="48px" className="object-cover" />
                                                            ) : (
                                                                <div className="flex h-full w-full items-center justify-center font-bold text-muted-foreground">
                                                                    {item.name.charAt(0)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="font-semibold">{item.name}</h3>
                                                            {item.organization ? <p className="text-sm text-muted-foreground">{item.organization}</p> : null}
                                                        </div>
                                                    </LocaleLink>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-muted-foreground">{t.noStudents}</p>
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
                                                        href={`/works/${getContentEntryPathId(item)}`}
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
