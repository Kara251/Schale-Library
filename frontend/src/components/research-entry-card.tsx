import { LocaleLink } from '@/components/locale-link'
import {
  type ResearchEntry,
  researchMediaTypeLabels,
  researchStanceLabels,
} from '@/lib/api'
import type { Locale } from '@/lib/i18n'
import { format } from 'date-fns'
import { zhCN, enUS, ja } from 'date-fns/locale'

interface ResearchEntryCardProps {
  entry: ResearchEntry
  locale: Locale
}

const dateLocales = { 'zh-Hans': zhCN, 'en': enUS, 'ja': ja } as const

const stanceColors: Record<string, string> = {
  official: 'bg-primary/10 text-primary',
  personal: 'bg-accent/20 text-accent-foreground',
  speculative: 'bg-muted text-muted-foreground',
}

export function ResearchEntryCard({ entry, locale }: ResearchEntryCardProps) {
  const mediaLabels = researchMediaTypeLabels[locale] || researchMediaTypeLabels['zh-Hans']
  const stanceLabels = researchStanceLabels[locale] || researchStanceLabels['zh-Hans']
  const dateLocale = dateLocales[locale] || zhCN

  const updatedAt = (() => {
    try {
      return format(new Date(entry.updatedAt), 'yyyy-MM-dd', { locale: dateLocale })
    } catch {
      return ''
    }
  })()

  return (
    <article className="group ba-card p-4 flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        <span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground">
          {mediaLabels[entry.media_type]}
        </span>
        <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${stanceColors[entry.stance] || stanceColors.speculative}`}>
          {stanceLabels[entry.stance]}
        </span>
        {entry.themes?.slice(0, 2).map((theme) => (
          <span key={theme.id} className="inline-block rounded px-2 py-0.5 text-xs bg-ba-blue/10 text-primary">
            {theme.name}
          </span>
        ))}
      </div>

      <LocaleLink href={`/research-archives/${entry.slug}`}>
        <h3 className="ba-title text-base leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {entry.title}
        </h3>
      </LocaleLink>

      {entry.summary && (
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {entry.summary}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
        {updatedAt && <span>{updatedAt}</span>}
        <LocaleLink
          href={`/research-archives/${entry.slug}`}
          className="text-primary hover:underline"
        >
          {locale === 'zh-Hans' ? '阅读全文' : locale === 'ja' ? '続きを読む' : 'Read more'}
        </LocaleLink>
      </div>
    </article>
  )
}
