import { notFound } from 'next/navigation'
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { Calendar, ArrowLeft } from 'lucide-react'
import { getAnnouncementById } from "@/lib/api"
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
    important: string
    publishedAt: string
}> = {
    'zh-Hans': {
        back: '返回公告列表',
        important: '重要公告',
        publishedAt: '发布于',
    },
    'en': {
        back: 'Back to announcements',
        important: 'Important',
        publishedAt: 'Published',
    },
    'ja': {
        back: 'お知らせ一覧に戻る',
        important: '重要',
        publishedAt: '公開日',
    },
}

export default async function AnnouncementDetailPage({ params }: PageProps) {
    const { id, locale } = await params
    const t = content[locale as Locale] || content['zh-Hans']
    const dateLocale = dateLocales[locale as Locale] || zhCN

    const announcementRes = await getAnnouncementById(Number(id)).catch(() => null)

    if (!announcementRes || !announcementRes.data) {
        notFound()
    }

    const announcement = announcementRes.data

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), 'yyyy-MM-dd HH:mm', { locale: dateLocale })
        } catch {
            return dateString
        }
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
                <div className="content-panel">
                    <LocaleLink href="/announcements" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
                        <ArrowLeft className="h-4 w-4" />
                        {t.back}
                    </LocaleLink>

                    <div className="max-w-4xl mx-auto">
                        {announcement.coverImage && (
                            <div className="relative h-64 md:h-96 rounded-lg overflow-hidden mb-8">
                                <img src={announcement.coverImage.url} alt={announcement.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                {announcement.priority > 5 && (
                                    <div className="absolute top-4 left-4">
                                        <Badge className="font-bold bg-accent">{t.important}</Badge>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mb-8">
                            <h1 className="text-3xl md:text-4xl font-bold mb-4">{announcement.title}</h1>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>{t.publishedAt}: {formatDate(announcement.publishedAt)}</span>
                            </div>
                        </div>

                        {announcement.content && (
                            <div className="prose prose-slate dark:prose-invert max-w-none">
                                <div className="bg-card border rounded-lg p-6" dangerouslySetInnerHTML={{ __html: sanitizeHtml(announcement.content) }} />
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
