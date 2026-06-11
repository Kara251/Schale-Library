import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { LocaleLink } from '@/components/locale-link'
import { ResearchEntryCard } from '@/components/research-entry-card'
import { ArrowLeft, Users } from 'lucide-react'
import {
  getResearchEntriesBySubjectSlug,
  getResearchSubjectBySlug,
  researchSubjectTypeLabels,
  type ResearchEntry,
} from '@/lib/api'
import { getMediaUrl } from '@/lib/media'
import { sanitizeHtml } from '@/lib/sanitize'
import { translations, type Locale } from '@/lib/i18n'

interface SubjectPageProps {
  params: Promise<{ slug: string; locale: string }>
}

export const revalidate = 60

export async function generateMetadata({ params }: SubjectPageProps) {
  const { slug, locale } = await params
  const t = translations[locale as Locale] || translations['zh-Hans']
  const res = await getResearchSubjectBySlug(slug, locale).catch(() => null)
  const sectionTitle = t['research.subjects.title'] as string
  if (!res?.data) return { title: `${sectionTitle} – Schale Library` }
  return {
    title: `${res.data.name} – ${sectionTitle} – Schale Library`,
    description: res.data.description?.replace(/<[^>]*>/g, '').slice(0, 150) || '',
  }
}

export default async function ResearchSubjectPage({ params }: SubjectPageProps) {
  const { slug, locale } = await params
  const t = translations[locale as Locale] || translations['zh-Hans']
  const typeLabels = researchSubjectTypeLabels[locale] || researchSubjectTypeLabels['zh-Hans']

  const subjectRes = await getResearchSubjectBySlug(slug, locale).catch(() => null)
  if (!subjectRes?.data) notFound()
  const subject = subjectRes.data

  const entriesRes = await getResearchEntriesBySubjectSlug(slug, locale).catch(() => ({ data: [] as ResearchEntry[] }))
  const entries = entriesRes.data || []
  const students = subject.students || []

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
        <div className="content-panel">
          <LocaleLink
            href="/research-archives/subjects"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            {t['research.subjects.title'] as string}
          </LocaleLink>

          {/* Hub header */}
          <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-start">
            {subject.cover ? (
              <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-xl border bg-secondary">
                <Image
                  src={getMediaUrl(subject.cover.url)}
                  alt={subject.name}
                  fill
                  priority
                  sizes="160px"
                  className="object-cover"
                />
              </div>
            ) : null}
            <div className="min-w-0">
              <span className="mb-2 inline-block rounded bg-secondary px-2.5 py-1 text-sm font-medium text-secondary-foreground">
                {typeLabels[subject.subject_type]}
              </span>
              <h1 className="text-4xl font-bold mb-3">{subject.name}</h1>
              {subject.description ? (
                <div
                  className="prose prose-slate dark:prose-invert max-w-none text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(subject.description) }}
                />
              ) : null}
            </div>
          </div>

          {/* Related students */}
          {students.length > 0 ? (
            <section className="mb-10">
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t['research.subjects.students'] as string}
                </h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {students.map((student) => (
                  <LocaleLink
                    key={student.id}
                    href={`/students/${student.documentId || student.id}`}
                    className="group flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3 transition-colors hover:border-primary/50"
                  >
                    <span className="relative h-8 w-8 overflow-hidden rounded-full border bg-secondary">
                      {student.avatar ? (
                        <Image
                          src={getMediaUrl(student.avatar.formats?.thumbnail?.url || student.avatar.url)}
                          alt={student.name}
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
                          {student.name.charAt(0)}
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">{student.name}</span>
                  </LocaleLink>
                ))}
              </div>
            </section>
          ) : null}

          {/* Entries */}
          <section>
            <p className="mb-4 text-sm text-muted-foreground">
              {(t['research.subjects.entries'] as string).replace('{count}', String(entries.length))}
            </p>
            {entries.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {entries.map((entry) => (
                  <ResearchEntryCard key={entry.id} entry={entry} locale={locale as Locale} />
                ))}
              </div>
            ) : (
              <p className="py-12 text-center text-muted-foreground">{t['research.theme.noEntries'] as string}</p>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
