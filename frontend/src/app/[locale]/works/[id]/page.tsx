import { notFound } from 'next/navigation'
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { getWorkById } from "@/lib/api"
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
    notFound: string
    back: string
    author: string
    publishedAt: string
    originalPublishDate: string
    viewOriginal: string
    description: string
    official: string
    fanmade: string
    video: string
    image: string
    text: string
    other: string
}> = {
    'zh-Hans': {
        notFound: '作品未找到',
        back: '返回推荐作品列表',
        author: '作者',
        publishedAt: '发布于',
        originalPublishDate: '原作发布于',
        viewOriginal: '查看原作',
        description: '作品简介',
        official: '官方',
        fanmade: '同人',
        video: '视频',
        image: '图画',
        text: '文字',
        other: '其他',
    },
    'en': {
        notFound: 'Work not found',
        back: 'Back to works',
        author: 'Author',
        publishedAt: 'Published',
        originalPublishDate: 'Originally published',
        viewOriginal: 'View Original',
        description: 'Description',
        official: 'Official',
        fanmade: 'Fan-made',
        video: 'Video',
        image: 'Image',
        text: 'Text',
        other: 'Other',
    },
    'ja': {
        notFound: '作品が見つかりません',
        back: '作品一覧に戻る',
        author: '作者',
        publishedAt: '公開日',
        originalPublishDate: '元の公開日',
        viewOriginal: '原作を見る',
        description: '作品紹介',
        official: '公式',
        fanmade: '二次創作',
        video: '動画',
        image: '画像',
        text: 'テキスト',
        other: 'その他',
    },
}

export async function generateMetadata({ params }: PageProps) {
    const { id } = await params
    const workRes = await getWorkById(Number(id)).catch(() => null)

    if (!workRes || !workRes.data) {
        return { title: 'Work not found - Schale Library' }
    }

    return {
        title: `${workRes.data.title} - Schale Library`,
        description: workRes.data.description?.substring(0, 150) || '',
    }
}

export default async function WorkDetailPage({ params }: PageProps) {
    const { id, locale } = await params
    const t = content[locale as Locale] || content['zh-Hans']
    const dateLocale = dateLocales[locale as Locale] || zhCN

    const workRes = await getWorkById(Number(id)).catch(() => null)

    if (!workRes || !workRes.data) {
        notFound()
    }

    const work = workRes.data

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), 'yyyy-MM-dd', { locale: dateLocale })
        } catch {
            return dateString
        }
    }

    const natureLabel = work.nature === 'official' ? t.official : t.fanmade
    const typeLabels = { video: t.video, image: t.image, text: t.text, other: t.other }
    const typeLabel = typeLabels[work.workType as keyof typeof typeLabels] || t.other

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
                <div className="content-panel">
                    <LocaleLink href="/works" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
                        <ArrowLeft className="h-4 w-4" />
                        {t.back}
                    </LocaleLink>

                    <div className="max-w-4xl mx-auto">
                        {(work.coverImage || work.coverImageUrl) && (
                            <div className="relative h-64 md:h-96 rounded-lg overflow-hidden mb-8">
                                <img
                                    src={work.coverImage?.url || `/api/image-proxy?url=${encodeURIComponent(work.coverImageUrl || '')}`}
                                    alt={work.title}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}

                        <div className="mb-8">
                            <div className="flex flex-wrap gap-2 mb-4">
                                <Badge variant="outline">{natureLabel}</Badge>
                                <Badge variant="outline">{typeLabel}</Badge>
                            </div>

                            <h1 className="text-3xl md:text-4xl font-bold mb-4">{work.title}</h1>

                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                {work.author && <div>{t.author}: {work.author}</div>}
                                {work.originalPublishDate && (
                                    <div>{t.originalPublishDate}: {formatDate(work.originalPublishDate)}</div>
                                )}
                                <div>{t.publishedAt}: {formatDate(work.publishedAt)}</div>
                            </div>
                        </div>

                        {work.link && (
                            <div className="mb-8">
                                <Button asChild size="lg" className="w-full md:w-auto">
                                    <a href={work.link} target="_blank" rel="noopener noreferrer">
                                        {t.viewOriginal} <ExternalLink className="ml-2 h-4 w-4" />
                                    </a>
                                </Button>
                            </div>
                        )}

                        {work.description && (
                            <div className="prose prose-slate dark:prose-invert max-w-none">
                                <h2 className="text-2xl font-bold mb-4">{t.description}</h2>
                                <div className="bg-card border rounded-lg p-6" dangerouslySetInnerHTML={{ __html: sanitizeHtml(work.description) }} />
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
