import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { LocaleLink } from '@/components/locale-link'
import { ResearchFilter } from '@/components/research-filter'
import { ResearchEditorSidebar } from '@/components/research-editor-sidebar'
import { SpoilerProgressSelect } from '@/components/spoiler-progress-select'
import { GitFork, Network, Route, Tags } from 'lucide-react'
import {
  getResearchCurator,
  getResearchEntries,
  getResearchPaths,
  getResearchThemes,
  getRecentResearchEntries,
} from '@/lib/api'
import { translations, type Locale } from '@/lib/i18n'

interface ResearchArchivesPageProps {
  params: Promise<{ locale: string }>
}

export const revalidate = 60

export default async function ResearchArchivesPage({ params }: ResearchArchivesPageProps) {
  const { locale } = await params
  const t = translations[locale as Locale] || translations['zh-Hans']

  const [entriesRes, themesRes, curatorRes, recentRes, pathsRes] = await Promise.all([
    getResearchEntries(locale).catch(() => ({ data: [] })),
    getResearchThemes(locale).catch(() => ({ data: [] })),
    getResearchCurator(locale).catch(() => ({ data: null })),
    getRecentResearchEntries(locale, 3).catch(() => ({ data: [] })),
    getResearchPaths(locale).catch(() => ({ data: [] })),
  ])

  const entries = entriesRes.data || []
  const themes = themesRes.data || []
  const curator = curatorRes.data || null
  const recentEntries = recentRes.data || []
  const paths = pathsRes.data || []

  const navChips = [
    { href: '/research-archives/themes', label: t['research.nav.themes'] as string, icon: Tags },
    { href: '/research-archives/subjects', label: t['research.nav.subjects'] as string, icon: GitFork },
    { href: '/research-archives/paths', label: t['research.nav.paths'] as string, icon: Route },
    { href: '/research-archives/graph', label: t['research.nav.graph'] as string, icon: Network },
  ]

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

          <div className="mb-8 flex flex-wrap items-center gap-2">
            {navChips.map(({ href, label, icon: Icon }) => (
              <LocaleLink
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary/50 hover:text-primary"
              >
                <Icon className="h-4 w-4" />
                {label}
              </LocaleLink>
            ))}
            <SpoilerProgressSelect locale={locale as Locale} className="ml-auto" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
            {/* Left + Center: filter + entry grid */}
            <div>
              <ResearchFilter
                entries={entries}
                themes={themes}
                locale={locale as Locale}
              />
            </div>

            {/* Right: editor sidebar */}
            <ResearchEditorSidebar
              curator={curator}
              recentEntries={recentEntries}
              paths={paths}
              locale={locale as Locale}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
