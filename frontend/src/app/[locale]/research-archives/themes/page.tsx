import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { LocaleLink } from '@/components/locale-link'
import { ArrowLeft } from 'lucide-react'
import { getResearchThemes, type ResearchTheme } from '@/lib/api'
import { sanitizeHtml } from '@/lib/sanitize'
import { translations, type Locale } from '@/lib/i18n'

interface ResearchThemesPageProps {
  params: Promise<{ locale: string }>
}

export const revalidate = 60

export async function generateMetadata({ params }: ResearchThemesPageProps) {
  const { locale } = await params
  const t = translations[locale as Locale] || translations['zh-Hans']
  return {
    title: `${t['research.nav.themes'] as string} – ${t['research.title'] as string} – Schale Library`,
  }
}

export default async function ResearchThemesPage({ params }: ResearchThemesPageProps) {
  const { locale } = await params
  const t = translations[locale as Locale] || translations['zh-Hans']

  const themesRes = await getResearchThemes(locale).catch(() => ({ data: [] as ResearchTheme[] }))
  const themes = themesRes.data || []

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
            <h1 className="text-4xl font-bold mb-2">{t['research.nav.themes'] as string}</h1>
            <p className="text-muted-foreground">{t['research.description'] as string}</p>
          </div>

          {themes.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">{t['research.themes.empty'] as string}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {themes.map((theme) => {
                const content = (
                  <>
                    <h2 className="ba-title text-lg leading-snug group-hover:text-primary transition-colors">
                      {theme.name}
                    </h2>
                    {theme.curated_intro ? (
                      <div
                        className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(theme.curated_intro) }}
                      />
                    ) : null}
                    {theme.slug ? <p className="mt-4 text-sm text-primary">{t['research.themes.entries'] as string}</p> : null}
                  </>
                )

                return theme.slug ? (
                  <LocaleLink
                    key={theme.id}
                    href={`/research-archives/themes/${theme.slug}`}
                    className="ba-card group block p-5 transition-colors hover:border-primary/50"
                  >
                    {content}
                  </LocaleLink>
                ) : (
                  <article key={theme.id} className="ba-card group block p-5">
                    {content}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
