'use client'

import { EyeOff } from 'lucide-react'
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
    <article className="group ba-card relative flex flex-col gap-3 p-5">
      <div className="flex flex-wrap gap-2">
        <span className="inline-block rounded px-2.5 py-1 text-sm font-medium bg-secondary text-secondary-foreground">
          {mediaLabels[entry.media_type]}
        </span>
        {entry.spoiler_tier?.name && (
          <span className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-sm font-medium bg-destructive/10 text-destructive">
            <EyeOff className="h-3.5 w-3.5" />
            {entry.spoiler_tier.name}
          </span>
        )}
        <span className={`inline-block rounded px-2.5 py-1 text-sm font-medium ${stanceColors[entry.stance] || stanceColors.speculative}`}>
          {stanceLabels[entry.stance]}
        </span>
        {entry.themes?.slice(0, 2).map((theme) => {
          const className = 'inline-block rounded px-2.5 py-1 text-sm bg-secondary text-secondary-foreground hover:text-primary transition-colors'
          return theme.slug ? (
            <LocaleLink key={theme.id} href={`/research-archives/themes/${theme.slug}`} className={className}>
              {theme.name}
            </LocaleLink>
          ) : (
            <span key={theme.id} className={className}>
              {theme.name}
            </span>
          )
        })}
        {entry.subjects?.slice(0, 2).map((subject) => {
          const className = 'inline-block rounded px-2.5 py-1 text-sm bg-secondary/80 text-secondary-foreground hover:bg-primary/10 hover:text-primary transition-colors'
          return subject.slug ? (
            <LocaleLink key={subject.id} href={`/research-archives/subjects/${subject.slug}`} className={className}>
              {subject.name}
            </LocaleLink>
          ) : (
            <span key={subject.id} className={className}>
              {subject.name}
            </span>
          )
        })}
      </div>

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
