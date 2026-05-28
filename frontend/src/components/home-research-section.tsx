import { LocaleLink } from '@/components/locale-link'
import { ResearchEntryCard } from '@/components/research-entry-card'
import type { ResearchEntry } from '@/lib/api'
import { translations, type Locale } from '@/lib/i18n'

interface HomeResearchSectionProps {
  entries: ResearchEntry[]
  locale: Locale
}

export function HomeResearchSection({ entries, locale }: HomeResearchSectionProps) {
  const t = translations[locale] || translations['zh-Hans']

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">{t['home.researchArchives'] as string}</h2>
        <LocaleLink href="/research-archives" className="text-sm text-primary hover:underline">
          {t['home.viewAll'] as string}
        </LocaleLink>
      </div>
      {entries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((entry) => (
            <ResearchEntryCard key={entry.id} entry={entry} locale={locale} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t['home.noResearch'] as string}</p>
        </div>
      )}
    </section>
  )
}
