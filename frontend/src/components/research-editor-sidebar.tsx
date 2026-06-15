import { LocaleLink } from '@/components/locale-link'
import {
  type ResearchCuratorData,
  type ResearchEntry,
} from '@/lib/api'
import { translations, type Locale } from '@/lib/i18n'
import { format } from 'date-fns'
import { zhCN, enUS, ja } from 'date-fns/locale'

interface ResearchEditorSidebarProps {
  curator: ResearchCuratorData | null
  recentEntries: ResearchEntry[]
  locale: Locale
}

const dateLocales = { 'zh-Hans': zhCN, 'en': enUS, 'ja': ja } as const

export function ResearchEditorSidebar({ curator, recentEntries, locale }: ResearchEditorSidebarProps) {
  const t = translations[locale] || translations['zh-Hans']
  const dateLocale = dateLocales[locale] || zhCN

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MM-dd', { locale: dateLocale })
    } catch {
      return ''
    }
  }

  return (
    <aside className="space-y-5">
      {/* Editor's pick */}
      <section className="rounded-lg border bg-card p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          {t['research.sidebar.featured'] as string}
        </h2>
        {curator?.featured_entry ? (
          <div>
            <LocaleLink
              href={`/research-archives/${curator.featured_entry.slug}`}
              className="block ba-title text-sm leading-snug hover:text-primary transition-colors mb-2"
            >
              {curator.featured_entry.title}
            </LocaleLink>
            {curator.pick_note && (
              <p className="text-sm text-muted-foreground leading-relaxed">{curator.pick_note}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t['research.sidebar.empty'] as string}</p>
        )}
      </section>

      {/* Recommended path */}
      {curator?.path_steps && curator.path_steps.length > 0 && (
        <section className="rounded-lg border bg-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            {t['research.sidebar.recommendedPath'] as string}
          </h2>
          {curator.path_description && (
            <p className="text-sm text-muted-foreground mb-3">{curator.path_description}</p>
          )}
          <ol className="space-y-2.5">
            {curator.path_steps.map((step, index) => (
              <li key={step.id} className="flex items-start gap-2 text-sm">
                <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
                  {index + 1}
                </span>
                {step.entry ? (
                  <LocaleLink
                    href={`/research-archives/${step.entry.slug}`}
                    className="text-foreground hover:text-primary transition-colors leading-relaxed"
                  >
                    {step.entry.title}
                    {step.step_note && (
                      <span className="block text-muted-foreground text-sm">{step.step_note}</span>
                    )}
                  </LocaleLink>
                ) : (
                  <span className="text-muted-foreground">{step.step_note}</span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Recent updates */}
      {recentEntries.length > 0 && (
        <section className="rounded-lg border bg-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            {t['research.sidebar.recent'] as string}
          </h2>
          <ul className="space-y-2.5">
            {recentEntries.map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-2 text-sm">
                <LocaleLink
                  href={`/research-archives/${entry.slug}`}
                  className="text-foreground hover:text-primary transition-colors line-clamp-2 leading-snug"
                >
                  {entry.title}
                </LocaleLink>
                <span className="shrink-0 text-muted-foreground">{formatDate(entry.updatedAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  )
}
