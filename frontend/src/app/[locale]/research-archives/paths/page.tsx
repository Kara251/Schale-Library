import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { LocaleLink } from '@/components/locale-link'
import { ArrowLeft, Route } from 'lucide-react'
import {
  getResearchPaths,
  researchPathDifficultyLabels,
  type ResearchPath,
} from '@/lib/api'
import { translations, type Locale } from '@/lib/i18n'

interface PathsPageProps {
  params: Promise<{ locale: string }>
}

export const revalidate = 60

const difficultyBadge: Record<string, string> = {
  intro: 'bg-primary/10 text-primary',
  deep: 'bg-accent/20 text-accent-foreground',
  expert: 'bg-destructive/10 text-destructive',
}

export async function generateMetadata({ params }: PathsPageProps) {
  const { locale } = await params
  const t = translations[locale as Locale] || translations['zh-Hans']
  return {
    title: `${t['research.paths.title'] as string} – Schale Library`,
    description: t['research.paths.description'] as string,
  }
}

export default async function ResearchPathsPage({ params }: PathsPageProps) {
  const { locale } = await params
  const t = translations[locale as Locale] || translations['zh-Hans']
  const diffLabels = researchPathDifficultyLabels[locale] || researchPathDifficultyLabels['zh-Hans']

  const pathsRes = await getResearchPaths(locale).catch(() => ({ data: [] as ResearchPath[] }))
  const paths = pathsRes.data || []

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
            <h1 className="text-4xl font-bold mb-2">{t['research.paths.title'] as string}</h1>
            <p className="text-muted-foreground">{t['research.paths.description'] as string}</p>
          </div>

          {paths.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">{t['research.paths.empty'] as string}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {paths.map((path) => {
                const steps = (path.steps || []).filter((step) => step.entry)
                return (
                  <LocaleLink
                    key={path.id}
                    href={`/research-archives/paths/${path.slug}`}
                    className="ba-card group flex flex-col gap-3 p-5 transition-colors hover:border-primary/50"
                  >
                    <div className="flex items-center gap-2">
                      <Route className="h-5 w-5 text-primary" />
                      {path.difficulty ? (
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${difficultyBadge[path.difficulty] || difficultyBadge.intro}`}>
                          {diffLabels[path.difficulty]}
                        </span>
                      ) : null}
                      <span className="ml-auto text-sm text-muted-foreground">
                        {(t['research.paths.steps'] as string).replace('{count}', String(steps.length))}
                      </span>
                    </div>
                    <h2 className="ba-title text-lg leading-snug group-hover:text-primary transition-colors">
                      {path.title}
                    </h2>
                    {path.description ? (
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{path.description}</p>
                    ) : null}
                    {steps.length > 0 ? (
                      <p className="mt-auto truncate pt-1 text-sm text-muted-foreground">
                        1. {steps[0].entry!.title}
                        {steps.length > 1 ? ' …' : ''}
                      </p>
                    ) : null}
                  </LocaleLink>
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
