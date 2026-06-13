import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { LocaleLink } from '@/components/locale-link'
import { ResearchFilter } from '@/components/research-filter'
import { ResearchEditorSidebar } from '@/components/research-editor-sidebar'
import { GitFork, Network, Route, Tags } from 'lucide-react'
import {
  getResearchCurator,
  getResearchEntries,
  getResearchPaths,
  getResearchSubjects,
  getResearchThemes,
  getRecentResearchEntries,
  researchSubjectTypeLabels,
} from '@/lib/api'
import { translations, type Locale } from '@/lib/i18n'

interface ResearchArchivesPageProps {
  params: Promise<{ locale: string }>
}

export const revalidate = 60

export default async function ResearchArchivesPage({ params }: ResearchArchivesPageProps) {
  const { locale } = await params
  const currentLocale = locale as Locale
  const t = translations[currentLocale] || translations['zh-Hans']

  const [entriesRes, themesRes, subjectsRes, curatorRes, recentRes, pathsRes] = await Promise.all([
    getResearchEntries(locale).catch(() => ({ data: [] })),
    getResearchThemes(locale).catch(() => ({ data: [] })),
    getResearchSubjects(locale).catch(() => ({ data: [] })),
    getResearchCurator(locale).catch(() => ({ data: null })),
    getRecentResearchEntries(locale, 3).catch(() => ({ data: [] })),
    getResearchPaths(locale).catch(() => ({ data: [] })),
  ])

  const entries = entriesRes.data || []
  const themes = themesRes.data || []
  const subjects = subjectsRes.data || []
  const curator = curatorRes.data || null
  const recentEntries = recentRes.data || []
  const paths = pathsRes.data || []
  const subjectLabels = researchSubjectTypeLabels[currentLocale] || researchSubjectTypeLabels['zh-Hans']

  const navChips = [
    { href: '#research-themes', label: t['research.nav.themes'] as string, icon: Tags },
    { href: '#research-subjects', label: t['research.nav.subjects'] as string, icon: GitFork },
    { href: '#research-paths', label: t['research.nav.paths'] as string, icon: Route },
    { href: '#research-graph', label: t['research.nav.graph'] as string, icon: Network },
  ]
  const graphOpenLabel = currentLocale === 'zh-Hans' ? '打开完整图谱' : currentLocale === 'ja' ? '全体グラフを開く' : 'Open full graph'

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
        <div className="content-panel">
          <div className="mb-6">
            <h1 className="text-4xl font-bold mb-2">
              {t['research.title'] as string}
            </h1>
            <p className="text-muted-foreground">
              {t['research.description'] as string}
            </p>
          </div>

          <nav className="mb-8 flex flex-wrap items-center gap-4 text-sm">
            {navChips.map(({ href, label, icon: Icon }) => (
              <a
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
              >
                <Icon className="h-4 w-4" />
                {label}
              </a>
            ))}
          </nav>

          <div className="mb-8 grid gap-4 lg:grid-cols-2">
            <section id="research-themes" className="ba-card scroll-mt-24 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Tags className="h-4 w-4 text-primary" />
                <h2 className="font-bold">{t['research.nav.themes'] as string}</h2>
              </div>
              {themes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {themes.slice(0, 12).map((theme) => (
                    theme.slug ? (
                      <LocaleLink
                        key={theme.id}
                        href={`/research-archives/themes/${theme.slug}`}
                        className="rounded bg-secondary px-2.5 py-1 text-sm text-secondary-foreground transition-colors hover:text-primary"
                      >
                        {theme.name}
                      </LocaleLink>
                    ) : (
                      <span key={theme.id} className="rounded bg-secondary px-2.5 py-1 text-sm text-secondary-foreground">
                        {theme.name}
                      </span>
                    )
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t['research.themes.empty'] as string}</p>
              )}
            </section>

            <section id="research-subjects" className="ba-card scroll-mt-24 p-5">
              <div className="mb-4 flex items-center gap-2">
                <GitFork className="h-4 w-4 text-primary" />
                <h2 className="font-bold">{t['research.subjects.title'] as string}</h2>
              </div>
              {subjects.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {subjects.slice(0, 12).map((subject) => {
                    const label = subjectLabels[subject.subject_type] || subject.subject_type
                    const content = (
                      <>
                        <span>{subject.name}</span>
                        <span className="text-muted-foreground">{label}</span>
                      </>
                    )

                    return subject.slug ? (
                      <LocaleLink
                        key={subject.id}
                        href={`/research-archives/subjects/${subject.slug}`}
                        className="inline-flex items-center gap-2 rounded bg-secondary/80 px-2.5 py-1 text-sm text-secondary-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                      >
                        {content}
                      </LocaleLink>
                    ) : (
                      <span key={subject.id} className="inline-flex items-center gap-2 rounded bg-secondary/80 px-2.5 py-1 text-sm text-secondary-foreground">
                        {content}
                      </span>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t['research.subjects.empty'] as string}</p>
              )}
            </section>

            <section id="research-paths" className="ba-card scroll-mt-24 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Route className="h-4 w-4 text-primary" />
                <h2 className="font-bold">{t['research.paths.title'] as string}</h2>
              </div>
              {paths.length > 0 ? (
                <div className="space-y-3">
                  {paths.slice(0, 4).map((path) => (
                    <LocaleLink key={path.id} href={`/research-archives/paths/${path.slug}`} className="block rounded border border-border/60 p-3 transition-colors hover:border-primary/40">
                      <div className="font-medium">{path.title}</div>
                      {path.description ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{path.description}</p> : null}
                    </LocaleLink>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t['research.paths.empty'] as string}</p>
              )}
            </section>

            <section id="research-graph" className="ba-card scroll-mt-24 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Network className="h-4 w-4 text-primary" />
                <h2 className="font-bold">{t['research.graph.title'] as string}</h2>
              </div>
              <p className="text-sm text-muted-foreground">{t['research.graph.description'] as string}</p>
              {entries.length > 0 ? (
                <LocaleLink href="/research-archives/graph" className="mt-4 inline-flex text-sm text-primary hover:underline">
                  {graphOpenLabel}
                </LocaleLink>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">{t['research.graph.empty'] as string}</p>
              )}
            </section>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
            {/* Left + Center: filter + entry grid */}
            <div>
              <ResearchFilter
                entries={entries}
                themes={themes}
                locale={currentLocale}
              />
            </div>

            {/* Right: editor sidebar */}
            <ResearchEditorSidebar
              curator={curator}
              recentEntries={recentEntries}
              paths={paths}
              locale={currentLocale}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
