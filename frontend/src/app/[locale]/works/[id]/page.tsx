import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { WorkCard } from "@/components/work-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ExternalLink, Users } from 'lucide-react'
import { getContentEntryPathId, getWorkById, getWorksByAuthor, getWorksByStudentIds } from "@/lib/api"
import { sanitizeHtml } from "@/lib/sanitize"
import { format } from 'date-fns'
import { zhCN, enUS, ja } from 'date-fns/locale'
import { LocaleLink } from '@/components/locale-link'
import type { Locale } from '@/lib/i18n'
import { getMediaUrl } from '@/lib/media'

export const revalidate = 60;

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
    students: string
    source: string
    relatedWorks: string
    sameAuthor: string
    sameStudents: string
    viewMoreByAuthor: string
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
        students: '出场学生',
        source: '来源',
        relatedWorks: '相关作品',
        sameAuthor: '同作者作品',
        sameStudents: '同学生作品',
        viewMoreByAuthor: '查看该作者作品',
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
        students: 'Featured Students',
        source: 'Source',
        relatedWorks: 'Related Works',
        sameAuthor: 'More by this author',
        sameStudents: 'Works with the same students',
        viewMoreByAuthor: 'View works by this author',
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
        students: '登場生徒',
        source: '出典',
        relatedWorks: '関連作品',
        sameAuthor: '同じ作者の作品',
        sameStudents: '同じ生徒の作品',
        viewMoreByAuthor: 'この作者の作品を見る',
        official: '公式',
        fanmade: '二次創作',
        video: '動画',
        image: '画像',
        text: 'テキスト',
        other: 'その他',
    },
}

export async function generateMetadata({ params }: PageProps) {
    const { id, locale } = await params
    const workRes = await getWorkById(id, locale).catch(() => null)

    if (!workRes || !workRes.data) {
        return { title: 'Work not found - Schale Library' }
    }

    const work = workRes.data
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const imageUrl = work.coverImage?.url
        ? new URL(getMediaUrl(work.coverImage.url), siteUrl).toString()
        : work.coverImageUrl

    return {
        title: `${work.title} - Schale Library`,
        description: work.description?.replace(/<[^>]*>/g, '').substring(0, 150) || '',
        openGraph: {
            title: `${work.title} - Schale Library`,
            description: work.description?.replace(/<[^>]*>/g, '').substring(0, 150) || '',
            type: 'article',
            images: imageUrl ? [{ url: imageUrl }] : undefined,
        },
    }
}

export default async function WorkDetailPage({ params }: PageProps) {
    const { id, locale } = await params
    const t = content[locale as Locale] || content['zh-Hans']
    const dateLocale = dateLocales[locale as Locale] || zhCN

    const workRes = await getWorkById(id, locale).catch((error) => {
        console.error('Failed to load work detail:', error)
        return null
    })

    if (!workRes || !workRes.data) {
        notFound()
    }

    const work = workRes.data
    const [sameAuthorRes, sameStudentRes] = await Promise.all([
        work.author ? getWorksByAuthor(work.author, work.id, 4, locale).catch((error) => {
            console.error('Failed to load same author works:', error)
            return { data: [] }
        }) : Promise.resolve({ data: [] }),
        work.students?.length ? getWorksByStudentIds(work.students.map((student) => student.id), work.id, 4, locale).catch((error) => {
            console.error('Failed to load same student works:', error)
            return { data: [] }
        }) : Promise.resolve({ data: [] }),
    ])
    const sameAuthorWorks = sameAuthorRes.data || []
    const sameStudentWorks = sameStudentRes.data || []
    const relatedWorks = [...sameStudentWorks, ...sameAuthorWorks]
        .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index)
        .slice(0, 4)

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
    const coverImageSrc = work.coverImage?.url
        ? getMediaUrl(work.coverImage.url)
        : `/api/image-proxy?url=${encodeURIComponent(work.coverImageUrl || '')}`
    const isProxyImage = coverImageSrc.startsWith('/api/image-proxy?')

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
                                {isProxyImage ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={coverImageSrc}
                                        alt={work.title}
                                        className="absolute inset-0 h-full w-full object-cover"
                                    />
                                ) : (
                                    <Image
                                        src={coverImageSrc}
                                        alt={work.title}
                                        fill
                                        priority
                                        sizes="(max-width: 768px) 100vw, 896px"
                                        className="object-cover"
                                    />
                                )}
                            </div>
                        )}

                        <div className="mb-8">
                            <div className="flex flex-wrap gap-2 mb-4">
                                <Badge variant="outline">{natureLabel}</Badge>
                                <Badge variant="outline">{typeLabel}</Badge>
                            </div>

                            <h1 className="text-3xl md:text-4xl font-bold mb-4">{work.title}</h1>

                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                {work.author && (
                                    <LocaleLink href={`/works?q=${encodeURIComponent(work.author)}`} className="hover:text-primary">
                                        {t.author}: {work.author}
                                    </LocaleLink>
                                )}
                                {work.originalPublishDate && (
                                    <div>{t.originalPublishDate}: {formatDate(work.originalPublishDate)}</div>
                                )}
                                <div>{t.publishedAt}: {formatDate(work.publishedAt)}</div>
                                {work.sourcePlatform ? <div>{t.source}: {work.sourcePlatform}</div> : null}
                            </div>
                        </div>

                        {work.students?.length ? (
                            <div className="mb-8 rounded-lg border bg-card p-5">
                                <div className="mb-3 flex items-center gap-2 text-sm font-bold">
                                    <Users className="h-4 w-4 text-primary" />
                                    {t.students}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {work.students.map((student) => (
                                        <LocaleLink
                                            key={student.id}
                                            href={`/students/${getContentEntryPathId(student)}`}
                                            className="rounded-full border bg-secondary px-3 py-1.5 text-sm transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                                        >
                                            {student.name}
                                        </LocaleLink>
                                    ))}
                                </div>
                            </div>
                        ) : null}

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

                        {relatedWorks.length > 0 ? (
                            <section className="mt-10">
                                <h2 className="mb-4 text-2xl font-bold">{t.relatedWorks}</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {relatedWorks.map((item) => (
                                        <WorkCard key={item.id} work={item} />
                                    ))}
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
                                    {sameStudentWorks.length > 0 ? <span>{t.sameStudents}: {sameStudentWorks.length}</span> : null}
                                    {sameAuthorWorks.length > 0 ? <span>{t.sameAuthor}: {sameAuthorWorks.length}</span> : null}
                                </div>
                            </section>
                        ) : null}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
