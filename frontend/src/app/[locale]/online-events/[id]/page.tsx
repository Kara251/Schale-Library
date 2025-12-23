import { notFound } from 'next/navigation'
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Globe, User, ArrowLeft } from 'lucide-react'
import { getOnlineEventById } from "@/lib/api"
import { sanitizeHtml } from "@/lib/sanitize"
import { format } from 'date-fns'
import { zhCN, enUS, ja } from 'date-fns/locale'
import { LocaleLink } from '@/components/locale-link'
import type { Locale } from '@/lib/i18n'

interface PageProps {
    params: Promise<{ id: string; locale: string }>
}

const dateLocales = { 'zh-Hans': zhCN, 'en': enUS, 'ja': ja }

const content: Record<Locale, {
    back: string
    upcoming: string
    ongoing: string
    ended: string
    official: string
    fanmade: string
    organizer: string
    eventPeriod: string
    visitLink: string
    description: string
}> = {
    'zh-Hans': {
        back: '返回线上活动列表',
        upcoming: '未开始',
        ongoing: '进行中',
        ended: '已结束',
        official: '官方',
        fanmade: '同人',
        organizer: '主办方',
        eventPeriod: '活动时间',
        visitLink: '访问活动',
        description: '活动详情',
    },
    'en': {
        back: 'Back to online events',
        upcoming: 'Upcoming',
        ongoing: 'Ongoing',
        ended: 'Ended',
        official: 'Official',
        fanmade: 'Fan-made',
        organizer: 'Organizer',
        eventPeriod: 'Event Period',
        visitLink: 'Visit Event',
        description: 'Details',
    },
    'ja': {
        back: 'オンラインイベント一覧に戻る',
        upcoming: '未開始',
        ongoing: '開催中',
        ended: '終了',
        official: '公式',
        fanmade: '二次創作',
        organizer: '主催者',
        eventPeriod: '開催期間',
        visitLink: 'イベントを見る',
        description: '詳細',
    },
}

export default async function OnlineEventDetailPage({ params }: PageProps) {
    const { id, locale } = await params
    const t = content[locale as Locale] || content['zh-Hans']
    const dateLocale = dateLocales[locale as Locale] || zhCN

    const eventRes = await getOnlineEventById(Number(id)).catch(() => null)

    if (!eventRes || !eventRes.data) {
        notFound()
    }

    const event = eventRes.data

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), 'yyyy-MM-dd HH:mm', { locale: dateLocale })
        } catch {
            return dateString
        }
    }

    const getEventStatus = () => {
        const now = new Date()
        const start = new Date(event.startTime)
        const end = new Date(event.endTime)

        if (now < start) return { label: t.upcoming, color: 'default' as const }
        if (now > end) return { label: t.ended, color: 'secondary' as const }
        return { label: t.ongoing, color: 'default' as const }
    }

    const status = getEventStatus()
    const natureLabel = event.nature === 'official' ? t.official : t.fanmade

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
                <div className="content-panel">
                    <LocaleLink href="/online-events" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
                        <ArrowLeft className="h-4 w-4" />
                        {t.back}
                    </LocaleLink>

                    <div className="max-w-4xl mx-auto">
                        {event.coverImage && (
                            <div className="relative h-64 md:h-96 rounded-lg overflow-hidden mb-8">
                                <img src={event.coverImage.url} alt={event.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                <div className="absolute top-4 left-4 flex gap-2">
                                    <Badge variant={status.color} className="font-bold">{status.label}</Badge>
                                    <Badge variant={event.nature === 'official' ? 'default' : 'secondary'} className="font-bold">{natureLabel}</Badge>
                                </div>
                            </div>
                        )}

                        <div className="mb-8">
                            <h1 className="text-3xl md:text-4xl font-bold mb-4">{event.title}</h1>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                {event.organizer && (
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">{t.organizer}:</span>
                                        <span>{event.organizer}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">{t.eventPeriod}:</span>
                                    <span>{formatDate(event.startTime)} - {formatDate(event.endTime)}</span>
                                </div>
                            </div>
                        </div>

                        {event.link && (
                            <div className="mb-8">
                                <Button asChild size="lg" className="w-full md:w-auto">
                                    <a href={event.link} target="_blank" rel="noopener noreferrer">
                                        <Globe className="mr-2 h-4 w-4" />
                                        {t.visitLink}
                                    </a>
                                </Button>
                            </div>
                        )}

                        {event.description && (
                            <div className="prose prose-slate dark:prose-invert max-w-none">
                                <h2 className="text-2xl font-bold mb-4">{t.description}</h2>
                                <div className="bg-card border rounded-lg p-6" dangerouslySetInnerHTML={{ __html: sanitizeHtml(event.description) }} />
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
