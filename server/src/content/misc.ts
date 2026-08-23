/**
 * 公开内容 API — misc 域：公告 / 友链 / 学院 / 剧透档位。
 *
 * 端点（对拍 frontend/tests/contracts/misc.ts + frontend/src/lib/api/misc.ts）：
 * - GET /announcements：isActive 过滤、isPinned/priority/publishedAt 三键排序、分页；
 *   $or 组（title/content containsi）供搜索；:key 详情（数字 → id，否则 documentId）
 * - GET /friend-links：全量列表
 * - GET /schools：order/name 双键排序
 * - GET /spoiler-tiers：sort_order 升序全量
 *
 * *_json 列经 pickLocale 输出单字符串；is_active=false 的行对公开 API 隐藏。
 */
import { Hono } from 'hono'
import type { Env } from '../index'
import { ok, okPaginated, fail, paginationOf } from '../lib/respond'
import { pickLocale } from '../lib/i18n'
import { parseContentQuery } from './query'
import type { ParsedContentQuery } from './query'
import { cond, andAll, orAny, limitOffset } from './sql'
import type { SqlCond } from './sql'
import { buildOrderBy } from '../lib/sort'

type Row = Record<string, unknown>

function toIso(ms: number | null | undefined): string | null {
  return ms === null || ms === undefined ? null : new Date(ms).toISOString()
}

// ── announcements ──

interface AnnouncementRow {
  id: number
  document_id: string
  title_json: string
  content_json: string | null
  cover_image_url: string | null
  link: string | null
  priority: number
  is_pinned: number
  is_active: number
  created_at: number
  updated_at: number
  published_at: number | null
}

function announcementToJson(r: AnnouncementRow, locale: string): Row {
  return {
    id: r.id,
    documentId: r.document_id,
    title: pickLocale(r.title_json, locale),
    content: pickLocale(r.content_json, locale),
    coverImage: r.cover_image_url ? { url: r.cover_image_url } : null,
    link: r.link ?? null,
    priority: r.priority,
    isPinned: r.is_pinned === 1,
    isActive: r.is_active === 1,
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
    publishedAt: toIso(r.published_at),
    locale,
  }
}

const ANNOUNCEMENT_SORT_COLUMNS: Record<string, string> = {
  is_pinned: 'is_pinned',
  priority: 'priority',
  published_at: 'published_at',
  created_at: 'created_at',
}

function orderByOf(sorts: Array<{ field: string; dir: 'asc' | 'desc' }>, fallback: string): string {
  return buildOrderBy(ANNOUNCEMENT_SORT_COLUMNS, sorts, fallback)
}

export const miscRoutes = new Hono<{ Bindings: Env }>()

miscRoutes.get('/announcements', async (c) => {
  const q = parseContentQuery(new URL(c.req.url))
  const conds: SqlCond[] = [
    { sql: 'is_active = 1', params: [] },
    { sql: 'published_at IS NOT NULL', params: [] },
  ]

  // Strapi 语义：$or[i] 组间为 OR（任一组命中即可），组内字段亦 OR
  if (q.orGroups.length > 0) {
    const allOrs = q.orGroups.flatMap((group) =>
      group.map((leaf) => {
        const field = leaf.path[leaf.path.length - 1]
        if (field === 'title') return cond('LOWER(title_json)', 'containsi', leaf.value)
        if (field === 'content') return cond('LOWER(content_json)', 'containsi', leaf.value)
        return null
      }).filter((x): x is NonNullable<typeof x> => x !== null),
    )
    conds.push(orAny(allOrs))
  }
  const whereSql = andAll(conds)

  const offset = q.start ?? (q.page - 1) * q.pageSize
  const size = q.limit ?? q.pageSize

  const stmt = c.env.DB.prepare(
    `SELECT * FROM announcements WHERE ${whereSql.sql} ORDER BY ${orderByOf(q.sorts, 'priority DESC, published_at DESC')} LIMIT ? OFFSET ?`
  )
  const [out, countRow] = await Promise.all([
    stmt.bind(...whereSql.params, size, offset).all<AnnouncementRow>(),
    c.env.DB.prepare(`SELECT COUNT(*) AS n FROM announcements WHERE ${whereSql.sql}`).bind(...whereSql.params).first<{ n: number }>(),
  ])
  return okPaginated(
    (out.results ?? []).map((r) => announcementToJson(r, q.locale)),
    paginationOf(q.page, q.pageSize, countRow?.n ?? 0)
  )
})

miscRoutes.get('/announcements/:key', async (c) => {
  const key = c.req.param('key').trim()
  const numeric = /^\d+$/.test(key)
  const whereSql = andAll([
    { sql: 'is_active = 1', params: [] },
    { sql: 'published_at IS NOT NULL', params: [] },
    numeric ? cond('id', 'eq', parseInt(key, 10)) : cond('document_id', 'eq', key),
  ])
  const row = await c.env.DB.prepare(`SELECT * FROM announcements WHERE ${whereSql.sql} LIMIT 1`).bind(...whereSql.params).first<AnnouncementRow>()
  if (!row) return fail(404, 'not_found')
  const locale = parseContentQuery(new URL(c.req.url)).locale
  return ok(announcementToJson(row, locale))
})

// ── friend-links ──

interface FriendLinkRow {
  id: number
  document_id: string
  title_json: string
  description_json: string | null
  url: string
  icon_url: string | null
  priority: number
  is_active: number
  created_at: number
  updated_at: number
  published_at: number | null
}

miscRoutes.get('/friend-links', async (c) => {
  const q = parseContentQuery(new URL(c.req.url))
  const whereSql = andAll([{ sql: 'is_active = 1', params: [] }, { sql: 'published_at IS NOT NULL', params: [] }])
  const totalRow = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM friend_links WHERE ${whereSql.sql}`)
    .bind(...whereSql.params)
    .first<{ n: number }>()
  const out = await c.env.DB.prepare(`SELECT * FROM friend_links WHERE ${whereSql.sql} ORDER BY priority DESC, created_at ASC LIMIT ? OFFSET ?`)
    .bind(...whereSql.params, q.pageSize, (q.page - 1) * q.pageSize)
    .all<FriendLinkRow>()
  const data = (out.results ?? []).map((r) => ({
    id: r.id,
    documentId: r.document_id,
    title: pickLocale(r.title_json, q.locale),
    description: pickLocale(r.description_json, q.locale) || undefined,
    url: r.url,
    icon: r.icon_url ? { url: r.icon_url } : undefined,
    priority: r.priority,
    isActive: r.is_active === 1,
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
    publishedAt: toIso(r.published_at),
    locale: q.locale,
  }))
  // total 必须是全表计数；此前传的是当前页行数，pageCount 永远算成 1
  return okPaginated(data, paginationOf(q.page, q.pageSize, totalRow?.n ?? 0))
})

// ── schools ──

interface SchoolRow {
  id: number
  document_id: string
  slug: string
  name_json: string
  description_json: string | null
  short_name_json: string | null
  color: string | null
  logo_url: string | null
  sort_order: number
  published_at: number | null
}

miscRoutes.get('/schools', async (c) => {
  const q = parseContentQuery(new URL(c.req.url))
  const whereSql = andAll([{ sql: 'published_at IS NOT NULL', params: [] }])
  const totalRow = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM schools WHERE ${whereSql.sql}`)
    .bind(...whereSql.params)
    .first<{ n: number }>()
  const out = await c.env.DB.prepare(`SELECT * FROM schools WHERE ${whereSql.sql} ORDER BY ${orderByOf(q.sorts, 'sort_order ASC')} LIMIT ? OFFSET ?`)
    .bind(...whereSql.params, q.pageSize, (q.page - 1) * q.pageSize)
    .all<SchoolRow>()
  const data = (out.results ?? []).map((r) => ({
    id: r.id,
    documentId: r.document_id,
    name: pickLocale(r.name_json, q.locale),
    slug: r.slug,
    description: pickLocale(r.description_json, q.locale) || undefined,
    color: r.color ?? undefined,
    order: r.sort_order,
    logo: r.logo_url ? { url: r.logo_url } : undefined,
    locale: q.locale,
  }))
  // total 必须是全表计数；此前传的是当前页行数，pageCount 永远算成 1
  return okPaginated(data, paginationOf(q.page, q.pageSize, totalRow?.n ?? 0))
})

// ── spoiler-tiers ──

interface SpoilerTierRow {
  id: number
  document_id: string
  key: string
  title_json: string
  sort_order: number
}

miscRoutes.get('/spoiler-tiers', async (c) => {
  const q = parseContentQuery(new URL(c.req.url))
  // 草稿不进公开 API：面板可以取消发布，此前这里从不过滤，取消发布等于无效
  const totalRow = await c.env.DB.prepare(
    'SELECT COUNT(*) AS n FROM spoiler_tiers WHERE published_at IS NOT NULL'
  ).first<{ n: number }>()
  const out = await c.env.DB.prepare(
    'SELECT * FROM spoiler_tiers WHERE published_at IS NOT NULL ORDER BY sort_order ASC LIMIT ? OFFSET ?'
  )
    .bind(q.pageSize, (q.page - 1) * q.pageSize)
    .all<SpoilerTierRow>()
  const data = (out.results ?? []).map((r) => ({
    id: r.id,
    documentId: r.document_id,
    name: pickLocale(r.title_json, q.locale),
    key: r.key,
    order: r.sort_order,
    locale: q.locale,
  }))
  // total 必须是全表计数；此前传的是当前页行数，pageCount 永远算成 1
  return okPaginated(data, paginationOf(q.page, q.pageSize, totalRow?.n ?? 0))
})
