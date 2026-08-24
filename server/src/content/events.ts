/**
 * 公开内容 API — events 域。
 * 端点（对拍 frontend/tests/contracts/events.ts + frontend/src/lib/api/events.ts）：
 * - GET /online-events、/offline-events：列表（relevant 双段排序 / startTime / endTime 模式）
 * - GET /online-events/:idOrDocId、/offline-events/:idOrDocId：详情（数字 → id，否则 documentId）
 * - GET /events-bundle：一次全量扫描同时产出合并分页列表 + 去重地区筛选项
 *
 * 响应形状对齐前端消费字段：title/nature/eventFormat/startTime/…/coverImage.url；
 * i18n 列（*_json）经 pickLocale 输出单字符串。草稿（published_at IS NULL）永不出现在公开 API。
 */
import { Hono } from 'hono'
import type { Env } from '../index'
import { pickLocale, parseJsonArray } from '../lib/i18n'
import { ok, okPaginated, fail, paginationOf } from '../lib/respond'
import type { StrapiPagination } from '../lib/respond'
import { cond, andAll, orAny, limitOffset, camelToSnake } from './sql'
import type { SqlCond } from './sql'
import { parseContentQuery } from './query'
import type { ParsedContentQuery } from './query'
import { buildOrderBy } from '../lib/sort'
import { publishedCondition, publishedSql } from '../lib/published'

type Row = Record<string, unknown>

interface EventRow extends Row {
  id: number
  document_id: string
  kind: string
  title_json: string | null
  description_json: string | null
  nature: string
  event_format: string | null
  status_override: string | null
  start_time: number | null
  end_time: number | null
  link: string | null
  cover_image_url: string | null
  organizer: string | null
  organizer_verified: number
  source_platform: string | null
  source_url: string | null
  last_verified_at: number | null
  tags_json: string | null
  guests_json: string | null
  ticket_price_text_json: string | null
  price_min: number | null
  price_max: number | null
  currency: string | null
  ticket_status: string | null
  ticket_url: string | null
  created_at: number
  updated_at: number
  published_at: number | null
}

interface LocationRow {
  country: string | null
  region: string | null
  city: string | null
  venue: string | null
  address: string | null
  location_note: string | null
  map_url: string | null
}

const EVENTS_SELECT = `SELECT e.*, l.country, l.region, l.city, l.venue, l.address, l.location_note, l.map_url
FROM events e LEFT JOIN event_locations l ON l.event_id = e.id`

/** unixepoch ms → ISO 字符串；NULL → NULL */
function toIso(ms: number | null): string | null {
  return ms === null ? null : new Date(ms).toISOString()
}

/** 行 → OnlineEvent / OfflineEvent JSON 形状 */
function eventToJson(row: EventRow & LocationRow, locale: string): Row {
  const base = {
    id: row.id,
    documentId: row.document_id,
    title: pickLocale(row.title_json, locale),
    nature: row.nature,
    eventFormat: row.event_format,
    statusOverride: row.status_override,
    country: row.country ?? undefined,
    region: row.region ?? undefined,
    startTime: toIso(row.start_time),
    endTime: toIso(row.end_time),
    link: row.link ?? undefined,
    ticketUrl: row.ticket_url ?? undefined,
    ticketStatus: row.ticket_status,
    ticketPriceText: pickLocale(row.ticket_price_text_json, locale) || undefined,
    priceMin: row.price_min,
    priceMax: row.price_max,
    currency: row.currency ?? undefined,
    coverImage: row.cover_image_url ? { url: row.cover_image_url } : undefined,
    // 契约 consume 含 organizer/tags：null/空时保留键（Strapi 语义为 null）
    organizer: row.organizer ?? null,
    organizerVerified: row.organizer_verified === 1,
    tags: parseJsonArray(row.tags_json).join(','),
    guests: parseJsonArray(row.guests_json).join(','),
    sourcePlatform: row.source_platform,
    sourceName: row.source_platform ? row.source_platform : undefined,
    sourceUrl: row.source_url ?? undefined,
    lastVerifiedAt: toIso(row.last_verified_at),
    description: pickLocale(row.description_json, locale) || undefined,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    publishedAt: toIso(row.published_at),
    locale,
  }
  if (row.kind === 'offline') {
    const location = [row.venue, row.address, row.city].filter(Boolean).join(' ')
    return { ...base, kind: 'offline', location, venue: row.venue ?? undefined, address: row.address ?? undefined, city: row.city ?? undefined, mapUrl: row.map_url ?? undefined }
  }
  return { ...base, kind: 'online', platform: row.source_platform ?? undefined }
}

const EVENT_SORT_COLUMNS: Record<string, string> = {
  start_time: 'e.start_time',
  end_time: 'e.end_time',
  published_at: 'e.published_at',
  created_at: 'e.created_at',
}

/**
 * 解析后的排序键 → SQL ORDER BY 片段；未知字段回退 start_time DESC。
 * 此前对"含点"的字段名原样透传进 ORDER BY（本意是支持 e.xxx 这类限定列名），
 * 等于把用户输入直接拼进 SQL。一律改走白名单。
 */
function orderByOf(sorts: Array<{ field: string; dir: 'asc' | 'desc' }>): string {
  return buildOrderBy(EVENT_SORT_COLUMNS, sorts, 'e.start_time DESC')
}

/**
 * 把解析出的过滤条件映射到 SQL（kind 已由路由固定）。
 * 支持：nature eq、country/region/city containsi（线上无 city → 显式空集）、
 * endTime gte（relevant 模式）、$or 组（title/organizer/description/…）、excludeId ne。
 */
function buildEventWhere(q: ParsedContentQuery, kind: 'online' | 'offline', nowMs: number): SqlCond {
  const conds: SqlCond[] = [
    { sql: 'e.kind = ?', params: [kind] },
    publishedCondition('e.'),
  ]

  for (const leaf of q.leaves) {
    const [head, rel] = leaf.path
    if (head === 'id' && leaf.op === 'ne') {
      conds.push(cond('e.id', 'ne', parseInt(leaf.value, 10)))
      continue
    }
    if (head === 'end_time' && (leaf.op === 'gte' || leaf.op === 'gt')) {
      conds.push(cond('e.end_time', 'gte', Date.parse(leaf.value)))
      continue
    }
    if (head === 'start_time' && (leaf.op === 'gt' || leaf.op === 'lte')) {
      conds.push(cond('e.start_time', leaf.op, Date.parse(leaf.value)))
      continue
    }
    if (head === 'nature' && leaf.op === 'eq') {
      conds.push(cond('e.nature', 'eq', leaf.value))
      continue
    }
    // 地点类字段：country/region/city（city 仅 offline 有意义）
    if ((head === 'country' || head === 'region' || head === 'city') && leaf.op === 'containsi') {
      if (head === 'city' && kind === 'online') continue // 线上无城市维度：静默忽略该子句
      conds.push(cond(`l.${camelToSnake(head)}`, 'containsi', leaf.value))
      continue
    }
    void rel
  }

  // $or 组：搜索字段集合按 kind 区分
  for (const group of q.orGroups) {
    const ors: SqlCond[] = []
    for (const leaf of group) {
      const field = leaf.path[leaf.path.length - 1]
      if (field === 'title') ors.push(cond('LOWER(e.title_json)', 'containsi', leaf.value))
      else if (field === 'organizer') ors.push(cond('e.organizer', 'containsi', leaf.value))
      else if (field === 'description') ors.push(cond('LOWER(e.description_json)', 'containsi', leaf.value))
      else if (field === 'platform' && kind === 'online') ors.push(cond('e.source_platform', 'containsi', leaf.value))
      else if (field === 'location' && kind === 'offline')
        ors.push(
          orAny([
            cond('l.venue', 'containsi', leaf.value),
            cond('l.address', 'containsi', leaf.value),
            cond('l.location_note', 'containsi', leaf.value),
          ])
        )
      else if (field === 'guests' && kind === 'offline') ors.push(cond('e.guests_json', 'containsi', leaf.value))
      else if (field === 'tags') ors.push(cond('e.tags_json', 'containsi', leaf.value))
      else if (field === 'ticket_price_text') ors.push(cond('e.ticket_price_text_json', 'containsi', leaf.value))
      else if (field === 'source_name') ors.push(cond('e.source_platform', 'containsi', leaf.value))
      else if (field === 'country' || field === 'region' || field === 'city') {
        if (field === 'city' && kind === 'online') continue
        ors.push(cond(`l.${camelToSnake(field)}`, 'containsi', leaf.value))
      }
    }
    conds.push(orAny(ors))
  }
  return andAll(conds)
}

export const eventsRoutes = new Hono<{ Bindings: Env }>()

async function fetchRows(db: D1Database, whereSql: SqlCond, orderSql: string, limOff: SqlCond): Promise<(EventRow & LocationRow)[]> {
  const stmt = db.prepare(`${EVENTS_SELECT} WHERE ${whereSql.sql} ORDER BY ${orderSql} ${limOff.sql}`)
  const out = await stmt.bind(...whereSql.params, ...limOff.params).all<EventRow & LocationRow>()
  return out.results ?? []
}

async function countRows(db: D1Database, whereSql: SqlCond): Promise<number> {
  const stmt = db.prepare(`SELECT COUNT(*) AS n FROM events e LEFT JOIN event_locations l ON l.event_id = e.id WHERE ${whereSql.sql}`)
  const row = await stmt.bind(...whereSql.params).first<{ n: number }>()
  return row?.n ?? 0
}


for (const kind of ['online', 'offline'] as const) {
  const path = kind === 'online' ? '/online-events' : '/offline-events'

  eventsRoutes.get(path, async (c) => {
    const q = parseContentQuery(new URL(c.req.url))
    const sortMode = q.sorts[0]?.field
    const nowMs = Date.now()

    let rows: (EventRow & LocationRow)[]
    let total: number

    if (!q.limit && !q.start && (sortMode === undefined)) {
      // relevant 默认模式：进行中/未来在前（startTime asc），已结束补齐（endTime desc）
      // end_time 为 NULL 的已发布活动视为进行中（避免被时间窗两个分支同时排除）
      // 用户显式 filters（nature/city 等）在两个分支都要生效
      const activeWhere = andAll([
        buildBaseWhere(kind),
        buildEventWhere(q, kind, nowMs),
        { sql: '(e.end_time >= ? OR e.end_time IS NULL)', params: [nowMs] },
      ])
      const endedWhere = andAll([buildBaseWhere(kind), buildEventWhere(q, kind, nowMs), cond('e.end_time', 'lt', nowMs)])
      const pageSize = q.pageSize
      const [active, ended, activeCount, endedCount] = await Promise.all([
        fetchRows(c.env.DB, activeWhere, 'e.start_time ASC', limitOffset(pageSize, 0)),
        fetchRows(c.env.DB, endedWhere, 'e.end_time DESC', limitOffset(Math.max(0, pageSize), 0)),
        countRows(c.env.DB, activeWhere),
        countRows(c.env.DB, endedWhere),
      ])
      rows = [...active, ...ended].slice(0, pageSize)
      total = activeCount + endedCount
    } else {
      const where = buildEventWhere(q, kind, nowMs)
      const offset = q.start ?? (q.page - 1) * q.pageSize
      const size = q.limit ?? q.pageSize
      ;[rows, total] = await Promise.all([
        fetchRows(c.env.DB, where, orderByOf(q.sorts.length > 0 ? q.sorts : [{ field: 'start_time', dir: 'desc' }]), limitOffset(size, offset)),
        countRows(c.env.DB, where),
      ])
    }

    const data = rows.map((r) => eventToJson(r, q.locale))
    if (q.limit !== null || q.start !== null) {
      return okPaginated(data, paginationOf(q.page, q.pageSize, total))
    }
    return okPaginated(data, paginationOf(q.page, q.pageSize, total))
  })

  eventsRoutes.get(`${path}/:key`, async (c) => {
    const key = c.req.param('key').trim()
    const q = parseContentQuery(new URL(c.req.url))
    const numeric = /^\d+$/.test(key)
    const where = andAll([
      { sql: 'e.kind = ?', params: [kind] },
      publishedCondition('e.'),
      numeric ? cond('e.id', 'eq', parseInt(key, 10)) : cond('e.document_id', 'eq', key),
    ])
    const rows = await fetchRows(c.env.DB, where, 'e.start_time DESC', limitOffset(1, 0))
    if (rows.length === 0) return fail(404, 'not_found')
    return ok(eventToJson(rows[0], q.locale))
  })
}

/** 基础 WHERE：kind + published，不含时间窗 */
function buildBaseWhere(kind: 'online' | 'offline'): SqlCond {
  return andAll([
    { sql: 'e.kind = ?', params: [kind] },
    publishedCondition('e.'),
  ])
}

// ── /events-bundle：一次全量扫描同时产出合并列表与去重地区筛选项 ──

interface LocationRecord {
  kind: 'online' | 'offline'
  country: string
  region: string
  city: string
}

eventsRoutes.get('/events-bundle', async (c) => {
  const url = new URL(c.req.url)
  const q = parseContentQuery(url)
  const page = Number(url.searchParams.get('page') || '1') || 1
  const pageSizeRaw = Number(url.searchParams.get('pageSize') || url.searchParams.get('limit') || '24')
  const pageSize = Math.min(100, Math.max(1, pageSizeRaw))

  const online = await fetchRows(c.env.DB, buildBaseWhere('online'), 'e.start_time DESC', limitOffset(500, 0))
  const offline = await fetchRows(c.env.DB, buildBaseWhere('offline'), 'e.start_time DESC', limitOffset(500, 0))

  const seen = new Set<string>()
  const locationRecords: LocationRecord[] = []
  const collect = (rows: (EventRow & LocationRow)[], kind: 'online' | 'offline') => {
    for (const r of rows) {
      const country = (r.country ?? '').trim()
      const region = (r.region ?? '').trim()
      const city = kind === 'offline' ? (r.city ?? '').trim() : ''
      if (!country && !region && !city) continue
      const key = `${kind}|${country}|${region}|${city}`
      if (seen.has(key)) continue
      seen.add(key)
      locationRecords.push({ kind, country, region, city })
    }
  }
  collect(online, 'online')
  collect(offline, 'offline')

  const merged: Array<Row & { type: string }> = [
    ...online.map((r) => ({ event: eventToJson(r, q.locale), type: 'online' })),
    ...offline.map((r) => ({ event: eventToJson(r, q.locale), type: 'offline' })),
  ]
  merged.sort((a, b) => {
    const ea = a.event as Record<string, unknown>
    const eb = b.event as Record<string, unknown>
    return String(eb.startTime ?? '').localeCompare(String(ea.startTime ?? ''))
  })

  const start = (Math.max(1, page) - 1) * pageSize
  const paged = merged.slice(start, start + pageSize)
  const pagination: StrapiPagination = paginationOf(page, pageSize, merged.length)
  return Response.json({ data: paged, meta: { pagination }, locationRecords })
})
