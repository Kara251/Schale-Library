import { notFound } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { LocaleLink } from '@/components/locale-link'
import { ArrowLeft } from 'lucide-react'
import { ResearchEntryCard } from '@/components/research-entry-card'
import { getResearchThemeBySlug, getResearchEntriesByThemeSlug } from '@/lib/api'
import { sanitizeHtml } from '@/lib/sanitize'
import { translations, type Locale } from '@/lib/i18n'

interface ResearchThemePageProps {
  params: Promise<{ slug: string; locale: string }>
}

export const revalidate = 60

export async function generateMetadata({ params }: ResearchThemePageProps) {
  const { slug, locale } = await params
  const t = translations[locale as Locale] || translations['zh-Hans']
  const res = await getResearchThemeBySlug(slug, locale).catch(() => ({ data: null }))
  const sectionTitle = t['research.title'] as string
  if (!res?.data) return { title: `${sectionTitle} – Schale Library` }
  return {
    title: `${res.data.name} – ${sectionTitle} – Schale Library`,
  }
}

export default async function ResearchThemePage({ params }: ResearchThemePageProps) {
  const { slug, locale } = await params
  const t = translations[locale as Locale] || translations['zh-Hans']

  const [themeRes, entriesRes] = await Promise.all([
    getResearchThemeBySlug(slug, locale).catch(() => ({ data: null })),
    getResearchEntriesByThemeSlug(slug, locale).catch(() => ({ data: [] })),
  ])

  if (!themeRes.data) notFound()

  const theme = themeRes.data
  const entries = entriesRes.data || []

  const countLabel = (t['research.filter.count'] as string || '{count} 篇').replace('{count}', String(entries.length))

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
            <h1 className="text-4xl font-bold mb-3">{theme.name}</h1>
            {theme.curated_intro ? (
              <div
                className="prose prose-slate dark:prose-invert max-w-none text-muted-foreground border-l-4 border-border pl-4"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(theme.curated_intro) }}
              />
            ) : null}
          </div>

          <p className="text-sm text-muted-foreground mb-4">{countLabel}</p>

          {entries.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {entries.map((entry) => (
                <ResearchEntryCard key={entry.id} entry={entry} locale={locale as Locale} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-12">
              {t['research.theme.noEntries'] as string}
            </p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
