import { notFound } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { LocaleLink } from '@/components/locale-link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import {
  getResearchPathBySlug,
  researchPathDifficultyLabels,
} from '@/lib/api'
import { translations, type Locale } from '@/lib/i18n'

interface PathPageProps {
  params: Promise<{ slug: string; locale: string }>
}

export const revalidate = 60

const difficultyBadge: Record<string, string> = {
  intro: 'bg-primary/10 text-primary',
  deep: 'bg-accent/20 text-accent-foreground',
  expert: 'bg-destructive/10 text-destructive',
}

export async function generateMetadata({ params }: PathPageProps) {
  const { slug, locale } = await params
  const t = translations[locale as Locale] || translations['zh-Hans']
  const res = await getResearchPathBySlug(slug, locale).catch(() => null)
  const sectionTitle = t['research.paths.title'] as string
  if (!res?.data) return { title: `${sectionTitle} – Schale Library` }
  return {
    title: `${res.data.title} – ${sectionTitle} – Schale Library`,
    description: res.data.description || '',
  }
}

export default async function ResearchPathPage({ params }: PathPageProps) {
  const { slug, locale } = await params
  const t = translations[locale as Locale] || translations['zh-Hans']
  const diffLabels = researchPathDifficultyLabels[locale] || researchPathDifficultyLabels['zh-Hans']

  const pathRes = await getResearchPathBySlug(slug, locale).catch(() => null)
  if (!pathRes?.data) notFound()
  const path = pathRes.data
  const steps = (path.steps || []).filter((step) => step.entry)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
        <div className="content-panel">
          <LocaleLink
            href="/research-archives/paths"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            {t['research.paths.title'] as string}
          </LocaleLink>

          <div className="mb-8 max-w-2xl">
            <div className="mb-3 flex items-center gap-2">
              {path.difficulty ? (
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${difficultyBadge[path.difficulty] || difficultyBadge.intro}`}>
                  {diffLabels[path.difficulty]}
                </span>
              ) : null}
              <span className="text-sm text-muted-foreground">
                {(t['research.paths.steps'] as string).replace('{count}', String(steps.length))}
              </span>
            </div>
            <h1 className="text-4xl font-bold mb-3">{path.title}</h1>
            {path.description ? (
              <p className="text-muted-foreground leading-relaxed">{path.description}</p>
            ) : null}
          </div>

          {steps.length > 0 ? (
            <ol className="relative max-w-2xl space-y-4 border-l-2 border-border pl-8">
              {steps.map((step, index) => (
                <li key={step.id} className="relative">
                  <span className="absolute -left-[2.45rem] top-3 flex h-7 w-7 items-center justify-center rounded-full border-2 border-border bg-background text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <LocaleLink
                    href={`/research-archives/${step.entry!.slug}`}
                    className="ba-card group block p-4 transition-colors hover:border-primary/50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate font-medium group-hover:text-primary transition-colors">
                          {step.entry!.title}
                        </span>
                        {step.step_note ? (
                          <span className="mt-0.5 block text-sm text-muted-foreground">{step.step_note}</span>
                        ) : step.entry!.summary ? (
                          <span className="mt-0.5 block text-sm text-muted-foreground line-clamp-2">
                            {step.entry!.summary}
                          </span>
                        ) : null}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>
                  </LocaleLink>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-12 text-center text-muted-foreground">{t['research.paths.empty'] as string}</p>
          )}

          {steps.length > 0 ? (
            <div className="mt-8 max-w-2xl">
              <LocaleLink
                href={`/research-archives/${steps[0].entry!.slug}`}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                {t['research.paths.start'] as string}
                <ArrowRight className="h-4 w-4" />
              </LocaleLink>
            </div>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  )
}
