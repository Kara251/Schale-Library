'use client'

import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { LocaleLink } from '@/components/locale-link'
import { isSpoilerBlocked, useSpoilerProgress } from '@/hooks/use-spoiler-progress'
import {
  type ResearchEntry,
  researchMediaTypeLabels,
  researchSpoilerScopeLabels,
  researchStanceLabels,
} from '@/lib/api'
import { translations, type Locale } from '@/lib/i18n'
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
  const t = translations[locale] || translations['zh-Hans']
  const mediaLabels = researchMediaTypeLabels[locale] || researchMediaTypeLabels['zh-Hans']
  const stanceLabels = researchStanceLabels[locale] || researchStanceLabels['zh-Hans']
  const spoilerLabels = researchSpoilerScopeLabels[locale] || researchSpoilerScopeLabels['zh-Hans']
  const dateLocale = dateLocales[locale] || zhCN

  const [progress] = useSpoilerProgress()
  const [revealed, setRevealed] = useState(false)
  const blocked = isSpoilerBlocked(entry.spoiler_scope, progress) && !revealed

  const updatedAt = (() => {
    try {
      return format(new Date(entry.updatedAt), 'yyyy-MM-dd', { locale: dateLocale })
    } catch {
      return ''
    }
  })()

  return (
    <article className="group ba-card relative flex flex-col gap-3 p-5">
      <div className="flex flex-wrap gap-2">
        <span className="inline-block rounded px-2.5 py-1 text-sm font-medium bg-secondary text-secondary-foreground">
          {mediaLabels[entry.media_type]}
        </span>
        <span className={`inline-block rounded px-2.5 py-1 text-sm font-medium ${stanceColors[entry.stance] || stanceColors.speculative}`}>
          {stanceLabels[entry.stance]}
        </span>
        {entry.themes?.slice(0, 2).map((theme) => (
          <LocaleLink
            key={theme.id}
            href={`/research-archives/themes/${theme.slug}`}
            className="inline-block rounded px-2.5 py-1 text-sm bg-ba-blue/10 text-primary hover:bg-ba-blue/20 transition-colors"
          >
            {theme.name}
          </LocaleLink>
        ))}
        {entry.subjects?.slice(0, 2).map((subject) => (
          <LocaleLink
            key={subject.id}
            href={`/research-archives/subjects/${subject.slug}`}
            className="inline-block rounded px-2.5 py-1 text-sm bg-secondary/80 text-secondary-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          >
            {subject.name}
          </LocaleLink>
        ))}
      </div>

      <div className={blocked ? 'spoiler-blur' : undefined} aria-hidden={blocked}>
        <LocaleLink href={`/research-archives/${entry.slug}`}>
          <h3 className="ba-title text-[1.0625rem] leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {entry.title}
          </h3>
        </LocaleLink>

        {entry.summary && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-3 leading-relaxed">
            {entry.summary}
          </p>
        )}
      </div>

      {blocked ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="absolute inset-x-4 top-1/2 z-10 -translate-y-1/2 rounded-md border border-dashed bg-background/90 px-3 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:text-primary hover:border-primary/50 cursor-pointer"
        >
          <span className="inline-flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4" />
            {(t['research.spoiler.cardHint'] as string).replace('{scope}', spoilerLabels[entry.spoiler_scope || 'none'])}
          </span>
        </button>
      ) : null}

      <div className="mt-auto flex items-center justify-between text-sm text-muted-foreground pt-1">
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
