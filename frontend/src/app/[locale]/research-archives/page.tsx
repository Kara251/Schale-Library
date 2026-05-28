import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { ResearchFilter } from '@/components/research-filter'
import { ResearchEditorSidebar } from '@/components/research-editor-sidebar'
import {
  getResearchEntries,
  getResearchThemes,
  getResearchCurator,
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
        <div className="content-panel">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">
              {t['research.title'] as string}
            </h1>
            <p className="text-muted-foreground">
              {t['research.description'] as string}
            </p>
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
              locale={locale as Locale}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
