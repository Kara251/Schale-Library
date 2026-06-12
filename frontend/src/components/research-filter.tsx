'use client'

import { useState, useMemo, useCallback } from 'react'
import { ResearchEntryCard } from '@/components/research-entry-card'
import {
  type ResearchEntry,
  type ResearchTheme,
  type ResearchMediaType,
  RESEARCH_MEDIA_TYPES,
  researchMediaTypeLabels,
} from '@/lib/api'
import { translations, type Locale } from '@/lib/i18n'

interface ResearchFilterProps {
  entries: ResearchEntry[]
  themes: ResearchTheme[]
  locale: Locale
}

interface FilterState {
  mediaTypes: Set<ResearchMediaType>
  themeIds: Set<number>
}

function applyFilter(entries: ResearchEntry[], filter: FilterState): ResearchEntry[] {
  const hasMedia = filter.mediaTypes.size > 0
  const hasTheme = filter.themeIds.size > 0

  if (!hasMedia && !hasTheme) return entries

  return entries.filter((entry) => {
    const matchMedia = !hasMedia || filter.mediaTypes.has(entry.media_type)
    const matchTheme =
      !hasTheme || (entry.themes || []).some((t) => filter.themeIds.has(t.id))

    const checks: boolean[] = []
    if (hasMedia) checks.push(matchMedia)
    if (hasTheme) checks.push(matchTheme)

    return checks.every(Boolean)
  })
}

export function ResearchFilter({ entries, themes, locale }: ResearchFilterProps) {
  const t = translations[locale] || translations['zh-Hans']
  const mediaLabels = researchMediaTypeLabels[locale] || researchMediaTypeLabels['zh-Hans']

  const [filter, setFilter] = useState<FilterState>({
    mediaTypes: new Set(),
    themeIds: new Set(),
  })

  // Derive available filter options from actual data so empty/offline state shows nothing
  const availableMediaTypes = useMemo(
    () => RESEARCH_MEDIA_TYPES.filter((mt) => entries.some((e) => e.media_type === mt)),
    [entries]
  )
  const filtered = useMemo(() => applyFilter(entries, filter), [entries, filter])

  const toggleMediaType = useCallback((value: ResearchMediaType) => {
    setFilter((prev) => {
      const next = new Set(prev.mediaTypes)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return { ...prev, mediaTypes: next }
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
    setFilter({ mediaTypes: new Set(), themeIds: new Set() })
  }, [])

  const hasActiveFilters =
    filter.mediaTypes.size > 0 || filter.themeIds.size > 0

  const countLabel = (t['research.filter.count'] as string || '{count} found').replace(
    '{count}',
    String(filtered.length)
  )
  const emptyLabel = t['research.filter.empty'] as string || 'No entries match'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
      {/* Left: Filter panel */}
      <aside className="space-y-5">
        {/* Media types — only show options present in data */}
        {availableMediaTypes.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              {t['research.filter.mediaType'] as string}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {availableMediaTypes.map((mt) => (
                <button
                  key={mt}
                  type="button"
                  onClick={() => toggleMediaType(mt)}
                  className={`rounded px-3 py-1.5 text-sm transition-colors cursor-pointer ${
                    filter.mediaTypes.has(mt)
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  {mediaLabels[mt]}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Themes (from Strapi) */}
        {themes.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              {t['research.filter.theme'] as string}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => toggleTheme(theme.id)}
                  className={`rounded px-3 py-1.5 text-sm transition-colors cursor-pointer ${
                    filter.themeIds.has(theme.id)
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  {theme.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          >
            {t['research.filter.clear'] as string}
          </button>
        )}
      </aside>

      {/* Center: Entry grid */}
      <div>
        <p className="text-sm text-muted-foreground mb-4">{countLabel}</p>
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((entry) => (
              <ResearchEntryCard key={entry.id} entry={entry} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
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
