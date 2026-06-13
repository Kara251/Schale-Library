import Image from 'next/image'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { LocaleLink } from '@/components/locale-link'
import { ArrowLeft } from 'lucide-react'
import {
  getResearchSubjects,
  researchSubjectTypeLabels,
  type ResearchSubject,
  type ResearchSubjectType,
} from '@/lib/api'
import { getMediaUrl } from '@/lib/media'
import { translations, type Locale } from '@/lib/i18n'

interface SubjectsPageProps {
  params: Promise<{ locale: string }>
}

export const revalidate = 60

const SUBJECT_TYPE_ORDER: ResearchSubjectType[] = [
  'school', 'organization', 'club', 'character', 'location', 'concept', 'item',
]

export async function generateMetadata({ params }: SubjectsPageProps) {
  const { locale } = await params
  const t = translations[locale as Locale] || translations['zh-Hans']
  return {
    title: `${t['research.subjects.title'] as string} – Schale Library`,
    description: t['research.subjects.description'] as string,
  }
}

export default async function ResearchSubjectsPage({ params }: SubjectsPageProps) {
  const { locale } = await params
  const t = translations[locale as Locale] || translations['zh-Hans']
  const typeLabels = researchSubjectTypeLabels[locale] || researchSubjectTypeLabels['zh-Hans']

  const subjectsRes = await getResearchSubjects(locale).catch(() => ({ data: [] as ResearchSubject[] }))
  const subjects = subjectsRes.data || []

  const grouped = new Map<ResearchSubjectType, ResearchSubject[]>()
  for (const subject of subjects) {
    const list = grouped.get(subject.subject_type) || []
    list.push(subject)
    grouped.set(subject.subject_type, list)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
        <div className="content-panel">
          <LocaleLink
            href="/research-archives"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            {t['research.entry.back'] as string}
          </LocaleLink>

          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">{t['research.subjects.title'] as string}</h1>
            <p className="text-muted-foreground">{t['research.subjects.description'] as string}</p>
          </div>

          {subjects.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">{t['research.subjects.empty'] as string}</p>
          ) : (
            <div className="space-y-10">
              {SUBJECT_TYPE_ORDER.filter((type) => grouped.has(type)).map((type) => (
                <section key={type}>
                  <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {typeLabels[type]}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {grouped.get(type)!.map((subject) => {
                      const content = (
                        <>
                          {subject.cover ? (
                            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-secondary">
                              <Image
                                src={getMediaUrl(subject.cover.formats?.thumbnail?.url || subject.cover.url)}
                                alt={subject.name}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            </span>
                          ) : (
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border bg-secondary text-lg font-bold text-muted-foreground">
                              {subject.name.charAt(0)}
                            </span>
                          )}
                          <span className="min-w-0">
                            <span className="block truncate font-medium group-hover:text-primary transition-colors">
                              {subject.name}
                            </span>
                            <span className="block text-xs text-muted-foreground">{typeLabels[subject.subject_type]}</span>
                          </span>
                        </>
                      )

                      return subject.slug ? (
                        <LocaleLink
                          key={subject.id}
                          href={`/research-archives/subjects/${subject.slug}`}
                          className="ba-card group flex items-center gap-3 p-4 transition-colors hover:border-primary/50"
                        >
                          {content}
                        </LocaleLink>
                      ) : (
                        <article key={subject.id} className="ba-card group flex items-center gap-3 p-4">
                          {content}
                        </article>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
