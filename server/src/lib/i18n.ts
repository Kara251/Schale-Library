/**
 * i18n JSON 列解析：{"zh-Hans":"...","en":"...","ja":"..."}
 * 回退顺序：请求 locale → zh-Hans → en → ja → 首个非空值。
 * 非 JSON 输入原样返回（容错 ETL 脏数据）。
 */
const FALLBACK_ORDER = ['zh-Hans', 'en', 'ja'] as const

export function pickLocale(json: string | null | undefined, locale: string): string {
  if (!json) return ''
  let parsed: Record<string, unknown> | null = null
  if (json.trimStart().startsWith('{')) {
    try {
      parsed = JSON.parse(json) as Record<string, unknown>
    } catch {
      parsed = null
    }
  }
  if (!parsed || typeof parsed !== 'object') {
    return typeof json === 'string' ? json : ''
  }
  const wanted = (value: unknown): value is string => typeof value === 'string' && value.length > 0
  if (wanted(parsed[locale])) return parsed[locale]
  for (const fallback of FALLBACK_ORDER) {
    if (wanted(parsed[fallback])) return parsed[fallback]
  }
  for (const value of Object.values(parsed)) {
    if (wanted(value)) return value
  }
  return ''
}

export function parseJsonArray(json: string | null | undefined): string[] {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}
