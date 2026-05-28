'use client'

import { useState, useMemo, useCallback } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { LocaleLink } from '@/components/locale-link'
import { ResearchEntryCard } from '@/components/research-entry-card'
import {
  type ResearchEntry,
  type ResearchTheme,
  type ResearchMediaType,
  type ResearchAffiliation,
  RESEARCH_MEDIA_TYPES,
  RESEARCH_AFFILIATIONS,
  researchMediaTypeLabels,
  researchAffiliationLabels,
} from '@/lib/api'
import { translations, type Locale } from '@/lib/i18n'

interface ResearchFilterProps {
  entries: ResearchEntry[]
  themes: ResearchTheme[]
  locale: Locale
}

type FilterMode = 'and' | 'or'

interface FilterState {
  mode: FilterMode
  mediaTypes: Set<ResearchMediaType>
  affiliations: Set<ResearchAffiliation>
  themeIds: Set<number>
}

function applyFilter(entries: ResearchEntry[], filter: FilterState): ResearchEntry[] {
  const hasMedia = filter.mediaTypes.size > 0
  const hasAff = filter.affiliations.size > 0
  const hasTheme = filter.themeIds.size > 0

  if (!hasMedia && !hasAff && !hasTheme) return entries

  return entries.filter((entry) => {
    const matchMedia = !hasMedia || filter.mediaTypes.has(entry.media_type)
    const matchAff =
      !hasAff || (entry.affiliations || []).some((a) => filter.affiliations.has(a))
    const matchTheme =
      !hasTheme || (entry.themes || []).some((t) => filter.themeIds.has(t.id))

    const checks: boolean[] = []
    if (hasMedia) checks.push(matchMedia)
    if (hasAff) checks.push(matchAff)
    if (hasTheme) checks.push(matchTheme)

    return filter.mode === 'and' ? checks.every(Boolean) : checks.some(Boolean)
  })
}

export function ResearchFilter({ entries, themes, locale }: ResearchFilterProps) {
  const t = translations[locale] || translations['zh-Hans']
  const mediaLabels = researchMediaTypeLabels[locale] || researchMediaTypeLabels['zh-Hans']
  const affLabels = researchAffiliationLabels[locale] || researchAffiliationLabels['zh-Hans']

  const [filter, setFilter] = useState<FilterState>({
    mode: 'and',
    mediaTypes: new Set(),
    affiliations: new Set(),
    themeIds: new Set(),
  })

  const filtered = useMemo(() => applyFilter(entries, filter), [entries, filter])

  const toggleMode = useCallback(() => {
    setFilter((prev) => ({ ...prev, mode: prev.mode === 'and' ? 'or' : 'and' }))
  }, [])

  const toggleMediaType = useCallback((value: ResearchMediaType) => {
    setFilter((prev) => {
      const next = new Set(prev.mediaTypes)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return { ...prev, mediaTypes: next }
    })
  }, [])

  const toggleAffiliation = useCallback((value: ResearchAffiliation) => {
    setFilter((prev) => {
      const next = new Set(prev.affiliations)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return { ...prev, affiliations: next }
    })
  }, [])

  const toggleTheme = useCallback((id: number) => {
    setFilter((prev) => {
      const next = new Set(prev.themeIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { ...prev, themeIds: next }
    })
  }, [])

  const clearAll = useCallback(() => {
    setFilter({ mode: filter.mode, mediaTypes: new Set(), affiliations: new Set(), themeIds: new Set() })
  }, [filter.mode])

  const hasActiveFilters =
    filter.mediaTypes.size > 0 || filter.affiliations.size > 0 || filter.themeIds.size > 0

  const countLabel = (t['research.filter.count'] as string || '{count} found').replace(
    '{count}',
    String(filtered.length)
  )
  const emptyLabel = t['research.filter.empty'] as string || 'No entries match'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
      {/* Left: Filter panel */}
      <aside className="space-y-5">
        {/* Mode toggle */}
        <div className="rounded-lg border bg-card p-3">
          <button
            type="button"
            onClick={toggleMode}
            title={filter.mode === 'and'
              ? (t['research.filter.mode.hint.and'] as string)
              : (t['research.filter.mode.hint.or'] as string)}
            className="w-full flex items-center justify-between gap-2 text-sm"
          >
            <span className="text-muted-foreground text-xs">
              {filter.mode === 'and'
                ? (t['research.filter.mode.hint.and'] as string)
                : (t['research.filter.mode.hint.or'] as string)}
            </span>
            <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold transition-colors ${
              filter.mode === 'and'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}>
              {filter.mode === 'and'
                ? (t['research.filter.mode.and'] as string)
                : (t['research.filter.mode.or'] as string)}
            </span>
          </button>
        </div>

        {/* Media types */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {t['research.filter.mediaType'] as string}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {RESEARCH_MEDIA_TYPES.map((mt) => (
              <button
                key={mt}
                type="button"
                onClick={() => toggleMediaType(mt)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  filter.mediaTypes.has(mt)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary'
                }`}
              >
                {mediaLabels[mt]}
              </button>
            ))}
          </div>
        </section>

        {/* Affiliations */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {t['research.filter.affiliation'] as string}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {RESEARCH_AFFILIATIONS.map((aff) => (
              <button
                key={aff}
                type="button"
                onClick={() => toggleAffiliation(aff)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  filter.affiliations.has(aff)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary'
                }`}
              >
                {affLabels[aff]}
              </button>
            ))}
          </div>
        </section>

        {/* Themes (from Strapi) */}
        {themes.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              {t['research.filter.theme'] as string}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {themes.map((theme) => (
                <span key={theme.id} className="inline-flex overflow-hidden rounded">
                  <button
                    type="button"
                    onClick={() => toggleTheme(theme.id)}
                    className={`px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      filter.themeIds.has(theme.id)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary'
                    }`}
                  >
                    {theme.name}
                  </button>
                  <LocaleLink
                    href={`/research-archives/themes/${theme.slug}`}
                    className={`inline-flex items-center px-1.5 transition-colors ${
                      filter.themeIds.has(theme.id)
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary'
                    }`}
                    aria-label={`${theme.name} ${t['research.theme.open'] as string || ''}`.trim()}
                  >
                    <ArrowUpRight className="h-3 w-3" />
                  </LocaleLink>
                </span>
              ))}
            </div>
          </section>
        )}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          >
            {t['research.filter.clear'] as string}
          </button>
        )}
      </aside>

      {/* Center: Entry grid */}
      <div>
        <p className="text-sm text-muted-foreground mb-4">{countLabel}</p>
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((entry) => (
              <ResearchEntryCard key={entry.id} entry={entry} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{emptyLabel}</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="mt-3 text-sm text-primary hover:underline cursor-pointer"
              >
                {t['research.filter.clear'] as string}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
