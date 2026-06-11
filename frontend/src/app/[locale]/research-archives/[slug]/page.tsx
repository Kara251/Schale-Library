import { notFound } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { LocaleLink } from '@/components/locale-link'
import { SpoilerGate } from '@/components/spoiler-gate'
import { ArrowLeft, ArrowRight, CornerDownLeft, History, Route } from 'lucide-react'
import {
  getEntriesSharingCitations,
  getResearchBacklinks,
  getResearchEntries,
  getResearchEntryBySlug,
  getResearchPathsContainingEntry,
  researchConfidenceLabels,
  researchRelationTypeLabels,
  researchRevisionTypeLabels,
  researchSourceTypeLabels,
  researchStanceLabels,
  type ResearchEntry,
  type ResearchPath,
  type ResearchRelationType,
} from '@/lib/api'
import { sanitizeHtml } from '@/lib/sanitize'
import { renderWikiLinks } from '@/lib/wiki-links'
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

const relationBadge: Record<string, string> = {
  related: 'bg-secondary text-secondary-foreground',
  prototype: 'bg-primary/10 text-primary',
  echoes: 'bg-accent/20 text-accent-foreground',
  extends: 'bg-ba-blue/10 text-primary',
  contradicts: 'bg-destructive/10 text-destructive',
  prerequisite: 'bg-muted text-muted-foreground',
}

const revisionDot: Record<string, string> = {
  created: 'bg-primary',
  updated: 'bg-muted-foreground',
  confirmed: 'bg-green-500',
  refuted: 'bg-destructive',
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

interface PathPosition {
  path: ResearchPath
  prev?: { title: string; slug: string; note?: string }
  next?: { title: string; slug: string; note?: string }
  index: number
  total: number
}

function locatePathPositions(paths: ResearchPath[], slug: string): PathPosition[] {
  const positions: PathPosition[] = []
  for (const path of paths) {
    const steps = (path.steps || []).filter((step) => step.entry)
    const index = steps.findIndex((step) => step.entry?.slug === slug)
    if (index < 0) {
      continue
    }
    const prevStep = index > 0 ? steps[index - 1] : undefined
    const nextStep = index < steps.length - 1 ? steps[index + 1] : undefined
    positions.push({
      path,
      index,
      total: steps.length,
      prev: prevStep?.entry ? { title: prevStep.entry.title, slug: prevStep.entry.slug, note: prevStep.step_note } : undefined,
      next: nextStep?.entry ? { title: nextStep.entry.title, slug: nextStep.entry.slug, note: nextStep.step_note } : undefined,
    })
  }
  return positions
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
  const citations = entry.citations || []

  const [backlinksRes, pathsRes, allEntriesRes, sharedCitationsRes] = await Promise.all([
    getResearchBacklinks(slug, locale).catch(() => ({ data: [] as ResearchEntry[] })),
    getResearchPathsContainingEntry(slug, locale).catch(() => ({ data: [] as ResearchPath[] })),
    getResearchEntries(locale).catch(() => ({ data: [] as ResearchEntry[] })),
    getEntriesSharingCitations(citations.map((citation) => citation.id), slug, locale)
      .catch(() => ({ data: [] as ResearchEntry[] })),
  ])

  const backlinks = backlinksRes.data || []
  const pathPositions = locatePathPositions(pathsRes.data || [], slug)

  // wiki 链接解析表：slug → 标题/摘要
  const wikiTargets = new Map((allEntriesRes.data || []).map((item) => [
    item.slug,
    { title: item.title, summary: item.summary },
  ]))

  // 引用源反查：citationId → 其他也引用了它的条目
  const sharedByCitation = new Map<number, ResearchEntry[]>()
  for (const other of sharedCitationsRes.data || []) {
    for (const citation of other.citations || []) {
      const list = sharedByCitation.get(citation.id) || []
      list.push(other)
      sharedByCitation.set(citation.id, list)
    }
  }

  const stanceL = researchStanceLabels[locale] || researchStanceLabels['zh-Hans']
  const confL = researchConfidenceLabels[locale] || researchConfidenceLabels['zh-Hans']
  const srcL = researchSourceTypeLabels[locale] || researchSourceTypeLabels['zh-Hans']
  const relL = researchRelationTypeLabels[locale] || researchRelationTypeLabels['zh-Hans']
  const revL = researchRevisionTypeLabels[locale] || researchRevisionTypeLabels['zh-Hans']

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd', { locale: dateLocale })
    } catch {
      return dateString
    }
  }

  // 关联条目按语义关系分组
  const relatedLinks = (entry.related_links || [])
    .filter((link) => link.target_entry)
    .sort((a, b) => a.order - b.order)
  const relatedGroups = new Map<ResearchRelationType, typeof relatedLinks>()
  for (const link of relatedLinks) {
    const type = link.relation_type || 'related'
    const list = relatedGroups.get(type) || []
    list.push(link)
    relatedGroups.set(type, list)
  }

  const revisions = [...(entry.revisions || [])].sort((a, b) => b.date.localeCompare(a.date))

  const rawBody = entry.body
    ? renderWikiLinks(sanitizeHtml(entry.body), locale, (target) => wikiTargets.get(target))
    : ''
  const body = rawBody ? addTableOfContents(rawBody) : { html: '', headings: [] }
  const hasToc = body.headings.length > 0
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

          <SpoilerGate scope={entry.spoiler_scope} locale={locale as Locale}>
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
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className={`inline-block rounded border px-2.5 py-1 text-sm font-medium ${stanceColors[entry.stance] || stanceColors.speculative}`}>
                    {stanceL[entry.stance]}
                  </span>
                  {entry.themes?.map((theme) => (
                    <LocaleLink
                      key={theme.id}
                      href={`/research-archives/themes/${theme.slug}`}
                      className="inline-block rounded px-2.5 py-1 text-sm bg-ba-blue/10 text-primary hover:bg-ba-blue/20 transition-colors"
                    >
                      {theme.name}
                    </LocaleLink>
                  ))}
                  {entry.subjects?.map((subject) => (
                    <LocaleLink
                      key={subject.id}
                      href={`/research-archives/subjects/${subject.slug}`}
                      className="inline-block rounded px-2.5 py-1 text-sm bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      {subject.name}
                    </LocaleLink>
                  ))}
                  <span className="text-sm text-muted-foreground ml-auto">
                    {formatDate(entry.updatedAt)}
                  </span>
                </div>

                <h1 className="text-3xl font-bold mb-4">{entry.title}</h1>

                {entry.summary && (
                  <p className="text-muted-foreground leading-relaxed mb-6 border-l-4 border-border pl-4 italic">
                    {entry.summary}
                  </p>
                )}

                {body.html ? (
                  <div
                    className="prose prose-slate dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: body.html }}
                  />
                ) : (
                  <p className="text-muted-foreground">{t['research.entry.noContent'] as string}</p>
                )}

                {/* 所属阅读路径：上一篇 / 下一篇 */}
                {pathPositions.length > 0 && (
                  <section className="mt-10 space-y-3">
                    {pathPositions.map(({ path, prev, next, index, total }) => (
                      <div key={path.id} className="rounded-lg border bg-card p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                          <Route className="h-4 w-4 shrink-0 text-primary" />
                          <span>{t['research.entry.inPath'] as string}</span>
                          <LocaleLink
                            href={`/research-archives/paths/${path.slug}`}
                            className="font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {path.title}
                          </LocaleLink>
                          <span className="ml-auto tabular-nums">{index + 1} / {total}</span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {prev ? (
                            <LocaleLink
                              href={`/research-archives/${prev.slug}`}
                              className="group flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:border-primary/50"
                            >
                              <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                              <span className="min-w-0">
                                <span className="block text-xs text-muted-foreground">{t['research.entry.pathPrev'] as string}</span>
                                <span className="block truncate group-hover:text-primary transition-colors">{prev.title}</span>
                              </span>
                            </LocaleLink>
                          ) : <span className="hidden sm:block" />}
                          {next ? (
                            <LocaleLink
                              href={`/research-archives/${next.slug}`}
                              className="group flex items-center justify-end gap-2 rounded-md border px-3 py-2 text-sm text-right transition-colors hover:border-primary/50"
                            >
                              <span className="min-w-0">
                                <span className="block text-xs text-muted-foreground">{t['research.entry.pathNext'] as string}</span>
                                <span className="block truncate group-hover:text-primary transition-colors">{next.title}</span>
                              </span>
                              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                            </LocaleLink>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </section>
                )}

                {/* 关联条目（按语义关系分组） */}
                {relatedGroups.size > 0 && (
                  <section className="mt-10 pt-6 border-t">
                    <h2 className="text-lg font-semibold mb-4">{t['research.entry.relatedLinks'] as string}</h2>
                    <div className="space-y-5">
                      {Array.from(relatedGroups.entries()).map(([type, links]) => (
                        <div key={type}>
                          <span className={`mb-2 inline-block rounded px-2 py-0.5 text-xs font-semibold ${relationBadge[type] || relationBadge.related}`}>
                            {relL[type]}
                          </span>
                          <ul className="space-y-2">
                            {links.map((link) => (
                              <li key={link.id} className="ba-card p-3">
                                <LocaleLink
                                  href={`/research-archives/${link.target_entry!.slug}`}
                                  className="font-medium text-sm hover:text-primary transition-colors"
                                >
                                  {link.target_entry!.title}
                                </LocaleLink>
                                {link.curate_note && (
                                  <p className="text-sm text-muted-foreground mt-1">{link.curate_note}</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* 反向链接 */}
                {backlinks.length > 0 && (
                  <section className="mt-10 pt-6 border-t">
                    <div className="mb-4 flex items-center gap-2">
                      <CornerDownLeft className="h-4 w-4 text-primary" />
                      <h2 className="text-lg font-semibold">{t['research.entry.backlinks'] as string}</h2>
                      <span className="text-sm text-muted-foreground">{t['research.entry.backlinksHint'] as string}</span>
                    </div>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {backlinks.map((source) => {
                        const incoming = (source.related_links || []).find(
                          (link) => link.target_entry?.slug === slug && link.relation_type
                        )
                        return (
                          <li key={source.id} className="ba-card p-3">
                            <div className="flex items-start justify-between gap-2">
                              <LocaleLink
                                href={`/research-archives/${source.slug}`}
                                className="font-medium text-sm hover:text-primary transition-colors"
                              >
                                {source.title}
                              </LocaleLink>
                              {incoming?.relation_type ? (
                                <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${relationBadge[incoming.relation_type] || relationBadge.related}`}>
                                  {relL[incoming.relation_type]}
                                </span>
                              ) : null}
                            </div>
                            {source.summary && (
                              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{source.summary}</p>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )}

                {/* 修订记录时间线 */}
                {revisions.length > 0 && (
                  <section className="mt-10 pt-6 border-t">
                    <div className="mb-4 flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" />
                      <h2 className="text-lg font-semibold">{t['research.entry.revisions'] as string}</h2>
                    </div>
                    <ol className="relative space-y-4 border-l border-border pl-5">
                      {revisions.map((revision) => (
                        <li key={revision.id} className="relative">
                          <span className={`absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full ${revisionDot[revision.revision_type] || revisionDot.updated}`} />
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="tabular-nums text-muted-foreground">{revision.date}</span>
                            <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground">
                              {revL[revision.revision_type]}
                            </span>
                          </div>
                          {revision.note && (
                            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{revision.note}</p>
                          )}
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
              </article>

              {/* Right: citations sidebar */}
              {hasCitations && (
                <aside className="space-y-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground sticky top-4">
                    {t['research.entry.citations'] as string}
                  </h2>
                  {citations.map((citation) => {
                    const alsoCitedIn = sharedByCitation.get(citation.id) || []
                    return (
                      <div key={citation.id} className="rounded-lg border bg-card p-4 space-y-2">
                        <p className="text-sm font-medium text-foreground leading-snug">{citation.claim_short}</p>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="rounded px-2 py-0.5 text-xs bg-muted text-muted-foreground">
                            {srcL[citation.source_type]}
                          </span>
                          <span className={`rounded px-2 py-0.5 text-xs ${confidenceBadge[citation.confidence] || confidenceBadge.derived}`}>
                            {confL[citation.confidence]}
                          </span>
                        </div>
                        {citation.source_ref && (
                          <p className="text-sm text-muted-foreground">{citation.source_ref}</p>
                        )}
                        {citation.source_quote && (
                          <blockquote className="border-l-2 border-border pl-2 text-sm text-muted-foreground italic leading-relaxed">
                            {citation.source_quote}
                          </blockquote>
                        )}
                        {alsoCitedIn.length > 0 && (
                          <div className="border-t pt-2">
                            <p className="mb-1 text-xs text-muted-foreground">{t['research.entry.alsoCited'] as string}</p>
                            <ul className="space-y-1">
                              {alsoCitedIn.slice(0, 4).map((other) => (
                                <li key={other.id}>
                                  <LocaleLink
                                    href={`/research-archives/${other.slug}`}
                                    className="text-xs text-primary hover:underline"
                                  >
                                    {other.title}
                                  </LocaleLink>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </aside>
              )}
            </div>
          </SpoilerGate>
        </div>
      </main>

      <Footer />
    </div>
  )
}
