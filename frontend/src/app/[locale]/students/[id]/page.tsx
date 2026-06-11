import { notFound } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, BookOpen, Building2, FileSearch } from 'lucide-react'

import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { WorkCard } from '@/components/work-card'
import { Badge } from '@/components/ui/badge'
import { LocaleLink } from '@/components/locale-link'
import { getMediaUrl } from '@/lib/media'
import { sanitizeHtml } from '@/lib/sanitize'
import {
  getResearchSubjectsByStudent,
  getStudentById,
  getWorksByStudent,
  resolveStudentSchoolName,
} from '@/lib/api'
import type { Locale } from '@/lib/i18n'

export const revalidate = 60

interface PageProps {
  params: Promise<{ id: string; locale: string }>
}

const content: Record<Locale, {
  back: string
  school: string
  organization: string
  bio: string
  works: string
  noWorks: string
  research: string
  researchEntryCount: string
}> = {
  'zh-Hans': {
    back: '返回推荐作品',
    school: '学校',
    organization: '组织',
    bio: '学生简介',
    works: '关联作品',
    noWorks: '暂无关联作品',
    research: '相关考据',
    researchEntryCount: '{count} 篇考据',
  },
  en: {
    back: 'Back to works',
    school: 'School',
    organization: 'Club',
    bio: 'Profile',
    works: 'Related Works',
    noWorks: 'No related works yet',
    research: 'Related Research',
    researchEntryCount: '{count} entries',
  },
  ja: {
    back: '作品一覧に戻る',
    school: '学校',
    organization: '部活',
    bio: '生徒紹介',
    works: '関連作品',
    noWorks: '関連作品はまだありません',
    research: '関連考察',
    researchEntryCount: '{count}件の考察',
  },
}

export async function generateMetadata({ params }: PageProps) {
  const { id, locale } = await params
  const studentRes = await getStudentById(id, locale).catch(() => null)

  if (!studentRes?.data) {
    return { title: 'Student not found - Schale Library' }
  }

  const student = studentRes.data
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const imageUrl = student.avatar?.url ? new URL(getMediaUrl(student.avatar.url), siteUrl).toString() : undefined

  return {
    title: `${student.name} - Schale Library`,
    description: student.bio?.replace(/<[^>]*>/g, '').slice(0, 150) || '',
    openGraph: {
      title: `${student.name} - Schale Library`,
      description: student.bio?.replace(/<[^>]*>/g, '').slice(0, 150) || '',
      type: 'profile',
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
  }
}

export default async function StudentDetailPage({ params }: PageProps) {
  const { id, locale } = await params
  const t = content[locale as Locale] || content['zh-Hans']

  const studentRes = await getStudentById(id, locale).catch((error) => {
    console.error('Failed to load student detail:', error)
    return null
  })

  if (!studentRes?.data) {
    notFound()
  }

  const student = studentRes.data
  const [worksRes, subjectsRes] = await Promise.all([
    getWorksByStudent(student, 24, locale).catch((error) => {
      console.error('Failed to load student related works:', error)
      return { data: [] }
    }),
    getResearchSubjectsByStudent(student, locale).catch(() => ({ data: [] })),
  ])
  const relatedWorks = worksRes.data || []
  const researchSubjects = subjectsRes.data || []
  const schoolLabel = resolveStudentSchoolName(student, locale) || null

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
        <div className="content-panel">
          <LocaleLink href="/works" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" />
            {t.back}
          </LocaleLink>

          <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
            <aside className="rounded-lg border bg-card p-6">
              <div className="mx-auto mb-5 h-40 w-40 overflow-hidden rounded-full border bg-secondary relative">
                {student.avatar ? (
                  <Image src={getMediaUrl(student.avatar.url)} alt={student.name} fill priority sizes="160px" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-5xl font-bold text-muted-foreground">
                    {student.name.charAt(0)}
                  </div>
                )}
              </div>

              <h1 className="text-center text-3xl font-bold">{student.name}</h1>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {schoolLabel ? (
                  <Badge variant="secondary" className="gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {schoolLabel}
                  </Badge>
                ) : null}
                {student.organization ? <Badge variant="outline">{student.organization}</Badge> : null}
              </div>

              <dl className="mt-6 space-y-3 text-sm">
                {schoolLabel ? (
                  <div>
                    <dt className="text-muted-foreground">{t.school}</dt>
                    <dd className="font-medium">{schoolLabel}</dd>
                  </div>
                ) : null}
                {student.organization ? (
                  <div>
                    <dt className="text-muted-foreground">{t.organization}</dt>
                    <dd className="font-medium">{student.organization}</dd>
                  </div>
                ) : null}
              </dl>
            </aside>

            <section className="min-w-0 space-y-8">
              {student.bio ? (
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <h2 className="text-2xl font-bold mb-4">{t.bio}</h2>
                  <div className="rounded-lg border bg-card p-6" dangerouslySetInnerHTML={{ __html: sanitizeHtml(student.bio) }} />
                </div>
              ) : null}

              {researchSubjects.length > 0 ? (
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <FileSearch className="h-5 w-5 text-primary" />
                    <h2 className="text-2xl font-bold">{t.research}</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {researchSubjects.map((subject) => (
                      <LocaleLink
                        key={subject.id}
                        href={`/research-archives/subjects/${subject.slug}`}
                        className="ba-card group block p-4 transition-colors hover:border-primary/50"
                      >
                        <p className="font-medium group-hover:text-primary transition-colors">{subject.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t.researchEntryCount.replace('{count}', String(subject.entries?.length || 0))}
                        </p>
                      </LocaleLink>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <div className="mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h2 className="text-2xl font-bold">{t.works}</h2>
                  <Badge variant="secondary">{relatedWorks.length}</Badge>
                </div>

                {relatedWorks.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {relatedWorks.map((work) => (
                      <WorkCard key={work.id} work={work} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">{t.noWorks}</div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
