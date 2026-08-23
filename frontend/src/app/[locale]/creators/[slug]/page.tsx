import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, GraduationCap, Link2, Sparkles } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { LocaleLink } from '@/components/locale-link'
import { OptimizedImage } from '@/components/optimized-image'
import { getCreatorBySlug, safeExternalUrl, type Creator } from '@/lib/api'
import type { Locale } from '@/lib/i18n'

export const revalidate = 60

interface CreatorPageProps {
  params: Promise<{ slug: string; locale: string }>
}

const dict: Record<Locale, {
  back: string
  featured: string
  homepage: string
  works: string
  students: string
  noWorks: string
  notFound: string
}> = {
  'zh-Hans': {
    back: '创作者',
    featured: '精选',
    homepage: '个人主页',
    works: '代表作',
    students: '关联学生',
    noWorks: '暂无代表作',
    notFound: '创作者不存在',
  },
  'en': {
    back: 'Creators',
    featured: 'Featured',
    homepage: 'Homepage',
    works: 'Representative Works',
    students: 'Related Students',
    noWorks: 'No representative works yet',
    notFound: 'Creator not found',
  },
  'ja': {
    back: 'クリエイター',
    featured: '厳選',
    homepage: 'ホームページ',
    works: '代表作',
    students: '関連生徒',
    noWorks: '代表作はまだありません',
    notFound: 'クリエイターが見つかりません',
  },
}

export async function generateMetadata({ params }: CreatorPageProps) {
  const { slug, locale } = await params
  const t = dict[locale as Locale] || dict['zh-Hans']
  const res = await getCreatorBySlug(slug, locale).catch(() => null)
  if (!res?.data) return { title: `${t.notFound} – Schale Library` }
  return {
    title: `${res.data.name} – Schale Library`,
    description: res.data.bio || undefined,
  }
}

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { slug, locale } = await params
  const t = dict[locale as Locale] || dict['zh-Hans']

  const creatorRes = await getCreatorBySlug(slug, locale).catch(() => null)
  if (!creatorRes?.data) notFound()
  const creator: Creator = creatorRes.data

  // S1 外链渲染校验：非 http(s) 一律不渲染为可点击链接
  const homepageUrl = safeExternalUrl(creator.homepageUrl)
  const representativeWorks = (creator.representativeWorks || []).map((work) => ({
    ...work,
    safeUrl: safeExternalUrl(work.url),
  }))
  const students = creator.students || []

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
        <div className="content-panel">
          <LocaleLink
            href="/creators"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.back}
          </LocaleLink>

          {/* 创作者头部 */}
          <div className="mb-10 flex flex-col items-start gap-6 md:flex-row md:items-start">
            <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border bg-secondary">
              {creator.avatarUrl ? (
                <OptimizedImage
                  src={creator.avatarUrl}
                  alt={creator.name}
                  aspectRatio="1/1"
                  priority
                  className="h-full w-full"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-4xl font-bold text-muted-foreground/40">
                  {creator.name.charAt(0)}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded bg-secondary px-2.5 py-1 text-sm font-medium text-secondary-foreground">
                  {creator.platform}
                </span>
                {creator.isFeatured ? (
                  <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    {t.featured}
                  </span>
                ) : null}
              </div>
              <h1 className="text-4xl font-bold mb-3">{creator.name}</h1>
              {creator.bio ? (
                <p className="max-w-none whitespace-pre-line text-muted-foreground">{creator.bio}</p>
              ) : null}
              {homepageUrl ? (
                <a
                  href={homepageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <Link2 className="h-4 w-4" />
                  {t.homepage}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          </div>

          {/* 代表作 */}
          <section className="mb-10">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t.works}
            </h2>
            {representativeWorks.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">{t.noWorks}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {representativeWorks.map((work) => (
                  <a
                    key={work.id}
                    href={work.safeUrl ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`ba-card group block overflow-hidden transition-colors ${
                      work.safeUrl ? 'hover:border-primary/50' : 'pointer-events-none opacity-70'
                    }`}
                  >
                    <div className="relative aspect-video rounded-t overflow-hidden bg-muted mb-3 rounded-b-none">
                      {work.coverUrl ? (
                        <OptimizedImage
                          src={work.coverUrl}
                          alt={work.title}
                          className="group-hover:scale-102 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full bg-secondary flex items-center justify-center">
                          <Link2 className="h-7 w-7 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 pt-0">
                      <h3 className="ba-title line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                        {work.title}
                      </h3>
                      {work.note ? (
                        <p className="text-xs text-muted-foreground line-clamp-2">{work.note}</p>
                      ) : null}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>

          {/* 关联学生（M2 决议：链到考据对象页） */}
          {students.length > 0 ? (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.students}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {students.map((student) => (
                  <LocaleLink
                    key={student.documentId || student.id}
                    href="/research-archives/subjects"
                    className="inline-flex items-center rounded-full border bg-secondary px-3 py-1 text-sm text-secondary-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    {student.name}
                  </LocaleLink>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  )
}
