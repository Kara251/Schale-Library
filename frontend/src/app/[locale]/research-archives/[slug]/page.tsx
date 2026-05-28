import { notFound } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { LocaleLink } from '@/components/locale-link'
import { ArrowLeft } from 'lucide-react'
import { getResearchEntryBySlug } from '@/lib/api'
import {
  researchStanceLabels,
  researchConfidenceLabels,
  researchSourceTypeLabels,
} from '@/lib/api'
import { sanitizeHtml } from '@/lib/sanitize'
import { translations, type Locale } from '@/lib/i18n'
import { format } from 'date-fns'
import { zhCN, enUS, ja } from 'date-fns/locale'

interface ResearchEntryPageProps {
  params: Promise<{ slug: string; locale: string }>
}

export const revalidate = 60

const dateLocales = { 'zh-Hans': zhCN, 'en': enUS, 'ja': ja } as const

const stanceColors: Record<string, string> = {
  official: 'bg-primary/10 text-primary border-primary/20',
  personal: 'bg-accent/20 text-accent-foreground border-accent/20',
  speculative: 'bg-muted text-muted-foreground border-border',
}

const confidenceBadge: Record<string, string> = {
  official: 'bg-primary/10 text-primary',
  derived: 'bg-muted text-muted-foreground',
  conjecture: 'bg-destructive/10 text-destructive',
}

const tocLabels: Record<Locale, string> = {
  'zh-Hans': '目录',
  en: 'Contents',
  ja: '目次',
}

interface TocHeading {
  id: string
  text: string
  level: 2 | 3
}

function stripTags(value: string) {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

function toHeadingId(text: string, index: number) {
  const slug = text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{Letter}\p{Number}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return slug || `section-${index + 1}`
}

function escapeAttribute(value: string) {
  return value.replace(/"/g, '&quot;')
}

function addTableOfContents(html: string) {
  const headings: TocHeading[] = []
  const seen = new Map<string, number>()

  const processedHtml = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, level, attrs, inner) => {
    const text = stripTags(inner)
    if (!text) {
      return match
    }

    const existingId = attrs.match(/\sid=(["'])(.*?)\1/i)?.[2]
    const baseId = existingId || toHeadingId(text, headings.length)
    const count = seen.get(baseId) || 0
    seen.set(baseId, count + 1)
    const id = count > 0 ? `${baseId}-${count + 1}` : baseId

    headings.push({ id, text, level: Number(level) as 2 | 3 })

    if (existingId) {
      const nextAttrs = id === existingId
        ? attrs
        : attrs.replace(/\sid=(["'])(.*?)\1/i, ` id="${escapeAttribute(id)}"`)
      return `<h${level}${nextAttrs}>${inner}</h${level}>`
    }

    return `<h${level}${attrs} id="${escapeAttribute(id)}">${inner}</h${level}>`
  })

  return { html: processedHtml, headings }
}

export async function generateMetadata({ params }: ResearchEntryPageProps) {
  const { slug, locale } = await params
  const t = translations[locale as Locale] || translations['zh-Hans']
  const res = await getResearchEntryBySlug(slug, locale).catch(() => null)
  const researchTitle = t['research.title'] as string || 'Research Archives'
  if (!res?.data) return { title: `${researchTitle} – Schale Library` }
  const entry = res.data
  return {
    title: `${entry.title} – ${researchTitle} – Schale Library`,
    description: entry.summary || '',
  }
}

export default async function ResearchEntryPage({ params }: ResearchEntryPageProps) {
  const { slug, locale } = await params
  const t = translations[locale as Locale] || translations['zh-Hans']
  const dateLocale = dateLocales[locale as Locale] || zhCN

  const res = await getResearchEntryBySlug(slug, locale).catch(() => null)
  if (!res?.data) notFound()

  const entry = res.data
  const stanceL = researchStanceLabels[locale] || researchStanceLabels['zh-Hans']
  const confL = researchConfidenceLabels[locale] || researchConfidenceLabels['zh-Hans']
  const srcL = researchSourceTypeLabels[locale] || researchSourceTypeLabels['zh-Hans']

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd', { locale: dateLocale })
    } catch {
      return dateString
    }
  }

  const relatedLinks = (entry.related_links || []).sort((a, b) => a.order - b.order)
  const body = entry.body ? addTableOfContents(sanitizeHtml(entry.body)) : { html: '', headings: [] }
  const hasToc = body.headings.length > 0
  const citations = entry.citations || []
  const hasCitations = citations.length > 0
  const contentGridClass = hasToc && hasCitations
    ? 'grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)_300px] gap-8'
    : hasToc
      ? 'grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)] gap-8'
      : hasCitations
        ? 'grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-8'
        : 'grid grid-cols-1 gap-8'

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

          <div className={contentGridClass}>
            {hasToc ? (
              <aside className="hidden xl:block">
                <nav className="sticky top-4 space-y-2 text-sm">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {tocLabels[locale as Locale] || tocLabels['zh-Hans']}
                  </h2>
                  <ol className="space-y-1">
                    {body.headings.map((heading) => (
                      <li key={heading.id} className={heading.level === 3 ? 'pl-3' : ''}>
                        <a href={`#${heading.id}`} className="text-muted-foreground hover:text-primary">
                          {heading.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              </aside>
            ) : null}

            {/* Main content */}
            <article>
              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${stanceColors[entry.stance] || stanceColors.speculative}`}>
                  {stanceL[entry.stance]}
                </span>
                {entry.themes?.map((theme) => (
                  <LocaleLink
                    key={theme.id}
                    href={`/research-archives/themes/${theme.slug}`}
                    className="inline-block rounded px-2 py-0.5 text-xs bg-ba-blue/10 text-primary hover:bg-ba-blue/20 transition-colors"
                  >
                    {theme.name}
                  </LocaleLink>
                ))}
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatDate(entry.updatedAt)}
                </span>
              </div>

              <h1 className="text-3xl font-bold mb-4">{entry.title}</h1>

              {entry.summary && (
                <p className="text-muted-foreground leading-relaxed mb-6 border-l-4 border-border pl-4 italic">
                  {entry.summary}
                </p>
              )}

              {entry.body ? (
                <div
                  className="prose prose-slate dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: body.html }}
                />
              ) : (
                <p className="text-muted-foreground">{t['research.entry.noContent'] as string}</p>
              )}

              {/* Further reading */}
              {relatedLinks.length > 0 && (
                <section className="mt-10 pt-6 border-t">
                  <h2 className="text-lg font-semibold mb-4">{t['research.entry.relatedLinks'] as string}</h2>
                  <ul className="space-y-3">
                    {relatedLinks.map((link) => (
                      link.target_entry && (
                        <li key={link.id} className="ba-card p-3">
                          <LocaleLink
                            href={`/research-archives/${link.target_entry.slug}`}
                            className="font-medium text-sm hover:text-primary transition-colors"
                          >
                            {link.target_entry.title}
                          </LocaleLink>
                          {link.curate_note && (
                            <p className="text-xs text-muted-foreground mt-1">{link.curate_note}</p>
                          )}
                        </li>
                      )
                    ))}
                  </ul>
                </section>
              )}
            </article>

            {/* Right: citations sidebar */}
            {hasCitations && (
              <aside className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground sticky top-4">
                  {t['research.entry.citations'] as string}
                </h2>
                {citations.map((citation) => (
                  <div key={citation.id} className="rounded-lg border bg-card p-3 text-xs space-y-1.5">
                    <p className="font-medium text-foreground">{citation.claim_short}</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="rounded px-1.5 py-0.5 bg-muted text-muted-foreground">
                        {srcL[citation.source_type]}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 ${confidenceBadge[citation.confidence] || confidenceBadge.derived}`}>
                        {confL[citation.confidence]}
                      </span>
                    </div>
                    {citation.source_ref && (
                      <p className="text-muted-foreground">{citation.source_ref}</p>
                    )}
                    {citation.source_quote && (
                      <blockquote className="border-l-2 border-border pl-2 text-muted-foreground italic">
                        {citation.source_quote}
                      </blockquote>
                    )}
                  </div>
                ))}
              </aside>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
