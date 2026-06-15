import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { LocaleLink } from '@/components/locale-link'
import { ResearchFilter } from '@/components/research-filter'
import { ResearchEditorSidebar } from '@/components/research-editor-sidebar'
import {
  getResearchCurator,
  getResearchEntries,
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
  const currentLocale = locale as Locale
  const t = translations[currentLocale] || translations['zh-Hans']

  const [entriesRes, themesRes, curatorRes, recentRes] = await Promise.all([
    getResearchEntries(locale).catch(() => ({ data: [] })),
    getResearchThemes(locale).catch(() => ({ data: [] })),
    getResearchCurator(locale).catch(() => ({ data: null })),
    getRecentResearchEntries(locale, 3).catch(() => ({ data: [] })),
  ])

  const entries = entriesRes.data || []
  const themes = themesRes.data || []
  const curator = curatorRes.data || null
  const recentEntries = recentRes.data || []
  const navLinks = [
    { href: '/research-archives/themes', label: t['research.nav.themes'] as string },
    { href: '/research-archives/subjects', label: t['research.nav.subjects'] as string },
    { href: '/research-archives/paths', label: t['research.nav.paths'] as string },
    { href: '/research-archives/graph', label: t['research.nav.graph'] as string },
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

          <nav className="mb-8 flex flex-wrap gap-2 text-sm">
            {navLinks.map((link) => (
              <LocaleLink
                key={link.href}
                href={link.href}
                className="rounded bg-secondary/70 px-3 py-1.5 text-secondary-foreground transition-colors hover:text-primary"
              >
                {link.label}
              </LocaleLink>
            ))}
          </nav>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
            <div>
              <ResearchFilter
                entries={entries}
                themes={themes}
                locale={currentLocale}
              />
            </div>

            <ResearchEditorSidebar
              curator={curator}
              recentEntries={recentEntries}
              locale={currentLocale}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
