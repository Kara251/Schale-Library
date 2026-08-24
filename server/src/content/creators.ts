/**
 * 公开内容 API — creators 域。
 * 端点（对拍 frontend/src/lib/api/creators.ts）：
 * - GET /creators：列表；locale 回退（bio_json）、featured 过滤（filters[isFeatured][$eq]=true）
 *   + 置顶排序（sort isFeatured:desc → featuredPriority:desc）、name containsi 搜索、分页
 * - GET /creators/:slug：详情；students populate（经 creator_students JOIN students，
 *   草稿学生不出现）+ representativeWorks 按 sort_order 输出
 *
 * bio 为服务端按 locale 解析后的单字符串（pickLocale 回退 zh-Hans → en → ja）；
 * 列表不 populate 关联，students/representativeWorks 恒为空数组（形状与详情一致）。
 */
import { Hono } from 'hono'
import type { Env } from '../index'
import { pickLocale } from '../lib/i18n'
import { ok, okPaginated, fail, paginationOf } from '../lib/respond'
import { cond, andAll, limitOffset, camelToSnake } from './sql'
import type { SqlCond } from './sql'
import { parseContentQuery } from './query'
import type { ParsedContentQuery } from './query'
import { studentToJson } from './students'
import type { StudentRow } from './students'
import { buildOrderBy } from '../lib/sort'
import { publishedCondition, publishedSql } from '../lib/published'

type Row = Record<string, unknown>

interface CreatorRow {
  id: number
  document_id: string
  slug: string
  name: string
  avatar_url: string | null
  bio_json: string | null
  platform: string
  platform_uid: string | null
  homepage_url: string | null
  is_featured: number
  featured_priority: number
  created_at: number
  updated_at: number
  published_at: number | null
}

interface RepresentativeWorkRow {
  id: number
  sort_order: number
  title: string
  url: string
  cover_url: string | null
  note_json: string | null
}

const CREATORS_SELECT = `SELECT cr.* FROM creators cr`

function creatorToJson(r: CreatorRow, locale: string): Row {
  return {
    id: r.id,
    documentId: r.document_id,
    slug: r.slug,
    name: r.name,
    avatarUrl: r.avatar_url ?? undefined,
    bio: pickLocale(r.bio_json, locale) || undefined,
    platform: r.platform,
    platformUid: r.platform_uid ?? undefined,
    homepageUrl: r.homepage_url ?? undefined,
    isFeatured: r.is_featured === 1,
    featuredPriority: r.featured_priority,
    students: [],
    representativeWorks: [],
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
    publishedAt: r.published_at === null ? null : new Date(r.published_at).toISOString(),
    locale,
  }
}

function workToJson(w: RepresentativeWorkRow, locale: string): Row {
  return {
    id: w.id,
    title: w.title,
    url: w.url,
    coverUrl: w.cover_url ?? undefined,
    note: pickLocale(w.note_json, locale) || undefined,
    sortOrder: w.sort_order,
  }
}

const CREATOR_SORT_COLUMNS: Record<string, string> = {
  is_featured: 'cr.is_featured',
  featured_priority: 'cr.featured_priority',
  name: 'cr.name',
  created_at: 'cr.created_at',
  updated_at: 'cr.updated_at',
}

/** 解析后的排序键 → SQL ORDER BY 片段；默认 featured 置顶（isFeatured desc → featuredPriority desc） */
function orderByOf(sorts: Array<{ field: string; dir: 'asc' | 'desc' }>): string {
  const normalized = sorts.map((s) => ({ field: camelToSnake(s.field), dir: s.dir }))
  // 中立收录站：默认最新收录优先（无推荐/精选语义）；显式 sort 参数仍可按 featured 列排序
  return buildOrderBy(CREATOR_SORT_COLUMNS, normalized, 'cr.created_at DESC')
}

/**
 * 过滤条件映射到 SQL。支持：
 * - filters[isFeatured][$eq]=true|false（布尔归一为 1/0）
 * - filters[name][$containsi]=x（global-search）
 * 其余未知字段静默忽略（Strapi 宽容语义）。
 */
function buildWhere(q: ParsedContentQuery): SqlCond {
  const conds: SqlCond[] = [publishedCondition('cr.')]

  for (const leaf of q.leaves) {
    const [head] = leaf.path
    if (head === 'is_featured' && leaf.op === 'eq') {
      conds.push(cond('cr.is_featured', 'eq', leaf.value === 'true' || leaf.value === '1' ? 1 : 0))
      continue
    }
    if (head === 'name' && leaf.op === 'containsi') {
      conds.push(cond('LOWER(cr.name)', 'containsi', leaf.value))
      continue
    }
  }

  return andAll(conds)
}

export const creatorsRoutes = new Hono<{ Bindings: Env }>()

async function fetchCreatorRows(db: D1Database, whereSql: SqlCond, orderSql: string, limOff: SqlCond): Promise<CreatorRow[]> {
  const stmt = db.prepare(`${CREATORS_SELECT} WHERE ${whereSql.sql} ORDER BY ${orderSql} ${limOff.sql}`)
  const out = await stmt.bind(...whereSql.params, ...limOff.params).all<CreatorRow>()
  return out.results ?? []
}

async function countCreators(db: D1Database, whereSql: SqlCond): Promise<number> {
  const row = await db.prepare(`SELECT COUNT(*) AS n FROM creators cr WHERE ${whereSql.sql}`).bind(...whereSql.params).first<{ n: number }>()
  return row?.n ?? 0
}

/** 详情关联：经 creator_students JOIN students（含 schools 供 school_ref），草稿学生不可见 */
async function fetchCreatorStudents(db: D1Database, creatorId: number): Promise<StudentRow[]> {
  const out = await db
    .prepare(
      `SELECT st.*, sc.id AS school_id2, sc.name_json AS school_name, sc.document_id AS school_document_id, sc.slug AS school_slug, sc.color AS school_color
FROM creator_students cs
JOIN students st ON st.id = cs.student_id
LEFT JOIN schools sc ON sc.id = st.school_id
WHERE cs.creator_id = ? AND ${publishedSql('st.')}
ORDER BY st.name ASC`
    )
    .bind(creatorId)
    .all<StudentRow>()
  return out.results ?? []
}

async function fetchRepresentativeWorks(db: D1Database, creatorId: number): Promise<RepresentativeWorkRow[]> {
  const out = await db
    .prepare(`SELECT id, sort_order, title, url, cover_url, note_json FROM representative_works WHERE creator_id = ? ORDER BY sort_order ASC, id ASC`)
    .bind(creatorId)
    .all<RepresentativeWorkRow>()
  return out.results ?? []
}

creatorsRoutes.get('/creators', async (c) => {
  const q = parseContentQuery(new URL(c.req.url))
  const whereSql = buildWhere(q)

  const offset = q.start ?? (q.page - 1) * q.pageSize
  const size = q.limit ?? q.pageSize

  const [rows, total] = await Promise.all([
    fetchCreatorRows(c.env.DB, whereSql, orderByOf(q.sorts), limitOffset(size, offset)),
    countCreators(c.env.DB, whereSql),
  ])
  return okPaginated(
    rows.map((r) => creatorToJson(r, q.locale)),
    paginationOf(q.page, q.pageSize, total)
  )
})

creatorsRoutes.get('/creators/:slug', async (c) => {
  const key = c.req.param('slug').trim()
  const q = parseContentQuery(new URL(c.req.url))
  const numeric = /^\d+$/.test(key)
  const whereSql = andAll([
    publishedCondition('cr.'),
    numeric
      ? cond('cr.id', 'eq', parseInt(key, 10))
      : { sql: '(cr.slug = ? OR cr.document_id = ?)', params: [key, key] },
  ])

  const rows = await fetchCreatorRows(c.env.DB, whereSql, 'cr.updated_at DESC', limitOffset(1, 0))
  if (rows.length === 0) return fail(404, 'not_found')

  const creator = rows[0]
  const [students, works] = await Promise.all([
    fetchCreatorStudents(c.env.DB, creator.id),
    fetchRepresentativeWorks(c.env.DB, creator.id),
  ])
  return ok({
    ...creatorToJson(creator, q.locale),
    students: students.map(studentToJson),
    representativeWorks: works.map((w) => workToJson(w, q.locale)),
  })
})
