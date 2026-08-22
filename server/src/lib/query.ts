/**
 * Strapi 兼容查询参数解析（子集）：
 * locale / pagination[page|pageSize] / sort=field:dir /
 * filters[field][$eq|$containsi|$in]=value
 * 仅支持快照中实际出现的组合，不做通用化。
 */
export interface ParsedQuery {
  locale: string
  page: number
  pageSize: number
  sortField: string | null
  sortDir: 'asc' | 'desc'
  eqFilters: Record<string, string>
  containsiFilters: Record<string, string>
  inFilters: Record<string, string[]>
}

const ALLOWED_LOCALES = new Set(['zh-Hans', 'en', 'ja'])

export function parseContentQuery(url: URL): ParsedQuery {
  const rawLocale = url.searchParams.get('locale') || 'zh-Hans'
  const locale = ALLOWED_LOCALES.has(rawLocale) ? rawLocale : 'zh-Hans'
  const page = Math.max(1, Number(url.searchParams.get('pagination[page]') || '1') || 1)
  const pageSize = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get('pagination[pageSize]') || '24') || 24)
  )

  const result: ParsedQuery = {
    locale,
    page,
    pageSize,
    sortField: null,
    sortDir: 'desc',
    eqFilters: {},
    containsiFilters: {},
    inFilters: {},
  }

  const sort = url.searchParams.get('sort')
  if (sort) {
    const [field, dir] = sort.split(':')
    if (field) {
      result.sortField = field
      result.sortDir = dir === 'asc' ? 'asc' : 'desc'
    }
  }

  for (const [key, value] of url.searchParams.entries()) {
    const filterMatch = /^filters\[([a-z_]+)\](\[\$(eq|containsi|in)\])?$/.exec(key)
    if (!filterMatch || value === '') continue
    const [, field, opRaw] = filterMatch
    const op = opRaw ? opRaw.slice(2) : '$eq'
    if (op === 'in') {
      result.inFilters[field] = value.split(',')
    } else if (op === 'containsi') {
      result.containsiFilters[field] = value
    } else {
      result.eqFilters[field] = value
    }
  }

  return result
}
