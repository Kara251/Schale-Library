/**
 * 考据域公开 API（Research Archives）。
 * 契约来源：frontend/tests/contracts/research.ts + frontend/src/lib/api/research.ts。
 *
 * 端点：
 * - GET /research-entries                列表（themes/subjects/spoiler_tier populate，locale 回退）
 * - GET /research-entries/:slug          详情（citations/related_links/revisions populate）
 * - GET /research-entries/:documentId/backlinks   反向链接（related_links 边 ∪ 正文 [[slug]]）
 * - GET /research-citations/:documentId/also-cited 引证反查
 * - GET /research-paths                  阅读路径列表（steps 按 sort_order）
 * - GET /research-paths/:slug            路径详情
 * - GET /research-paths/:slug/neighbors/:entryDocumentId  条目在路径中的上下篇
 * - GET /research-themes, /research-themes/:slug
 * - GET /research-subjects, /research-subjects/:slug（含关联学生卡）
 * - GET /research-graph                  图谱聚合（节点+边）
 */
import { Hono } from 'hono'
import type { Env } from '../index'
import { pickLocale } from '../lib/i18n'
import { ok, okPaginated, fail, paginationOf } from '../lib/respond'
import { publishedSql } from '../lib/published'

type Bindings = { Bindings: Env }

export const researchRoutes = new Hono<Bindings>()

// ── 行类型 ──

interface EntryRow {
  id: number
  document_id: string
  slug: string
  title_json: string
  summary_json: string | null
  body_json: string | null
  stance: string
  media_type: string
  spoiler_tier_id: number | null
  created_at: number
  updated_at: number
  published_at: number | null
}

interface ThemeRow {
  id: number
  document_id: string
  slug: string
  title_json: string
  curated_intro_json: string | null
  created_at: number
  updated_at: number
  published_at: number | null
}

interface SubjectRow {
  id: number
  document_id: string
  slug: string
  title_json: string
  description_json: string | null
  subject_type: string
  cover_url: string | null
  created_at: number
  updated_at: number
  published_at: number | null
}

interface PathRow {
  id: number
  document_id: string
  slug: string
  title_json: string
  description_json: string | null
  difficulty: string | null
  sort_order: number
  created_at: number
  updated_at: number
  published_at: number | null
}

interface CitationRow {
  id: number
  document_id: string
  claim_short_json: string | null
  source_type: string | null
  source_ref: string | null
  source_quote_json: string | null
  confidence: string | null
  created_at: number
  updated_at: number
  published_at: number | null
}

/**
 * 公开可见性片段：草稿与未到点的排期都不公开（见 lib/published.ts）。
 *
 * 必须每次调用时求值。写成模块级常量的话，时间戳在 Worker isolate 启动那一刻
 * 就固定了 —— isolate 存活期间新发布的内容一律查不出来（已在线上复现）。
 */
const PUBLISHED = () => publishedSql()

function iso(ms: number | null): string {
  return ms === null ? '' : new Date(ms).toISOString()
}

/** Strapi 风格条目 → JSON：数字 id 内部保留，documentId 对外；i18n 列经 pickLocale 解析 */
export interface EntryJson {
  id: number
  documentId: string
  title: string
  slug: string
  stance: string
  summary?: string
  body?: string
  media_type: string
  spoiler_tier?: SpoilerTierJson | null
  themes?: ThemeJson[]
  subjects?: SubjectJson[]
  citations?: unknown[]
  related_links?: unknown[]
  revisions?: unknown[]
  createdAt: string
  updatedAt: string
  publishedAt: string
}

export interface SpoilerTierJson {
  id: number
  documentId: string
  name: string
  key: string
}

export interface ThemeJson {
  id: number
  documentId: string
  name: string
  slug: string
  curated_intro?: string
  createdAt: string
  updatedAt: string
  publishedAt: string
}

export interface SubjectJson {
  id: number
  documentId: string
  name: string
  slug: string
  subject_type: string
  description?: string
  cover?: { url: string }
  students?: unknown[]
  entries?: Array<{ id: number; documentId: string; title: string; slug: string }>
  createdAt: string
  updatedAt: string
  publishedAt: string
}

function entryJson(row: EntryRow, locale: string): EntryJson {
  return {
    id: row.id,
    documentId: row.document_id,
    title: pickLocale(row.title_json, locale),
    slug: row.slug,
    stance: row.stance,
    summary: row.summary_json === null ? undefined : pickLocale(row.summary_json, locale),
    body: row.body_json === null ? undefined : pickLocale(row.body_json, locale),
    media_type: row.media_type,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    publishedAt: iso(row.published_at),
  }
}

function themeJson(row: ThemeRow, locale: string): ThemeJson {
  return {
    id: row.id,
    documentId: row.document_id,
    name: pickLocale(row.title_json, locale),
    slug: row.slug,
    curated_intro:
      row.curated_intro_json === null ? undefined : pickLocale(row.curated_intro_json, locale),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    publishedAt: iso(row.published_at),
  }
}

function subjectJson(row: SubjectRow, locale: string): SubjectJson {
  return {
    id: row.id,
    documentId: row.document_id,
    name: pickLocale(row.title_json, locale),
    slug: row.slug,
    subject_type: row.subject_type,
    description:
      row.description_json === null ? undefined : pickLocale(row.description_json, locale),
    cover: row.cover_url ? { url: row.cover_url } : undefined,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    publishedAt: iso(row.published_at),
  }
}

function pathJson(row: PathRow, locale: string) {
  return {
    id: row.id,
    documentId: row.document_id,
    title: pickLocale(row.title_json, locale),
    slug: row.slug,
    description:
      row.description_json === null ? undefined : pickLocale(row.description_json, locale),
    difficulty: row.difficulty ?? undefined,
    order: row.sort_order,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    publishedAt: iso(row.published_at),
  }
}

function citationJson(row: CitationRow, locale: string) {
  return {
    id: row.id,
    documentId: row.document_id,
    claim_short:
      row.claim_short_json === null ? undefined : pickLocale(row.claim_short_json, locale),
    source_type: row.source_type ?? undefined,
    source_ref: row.source_ref ?? undefined,
    source_quote:
      row.source_quote_json === null ? undefined : pickLocale(row.source_quote_json, locale),
    confidence: row.confidence ?? undefined,
    // 契约 consume 有 citations[].source_image：本 schema 无媒体表，恒为 null 占位
    source_image: null,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    publishedAt: iso(row.published_at),
  }
}

// ── populate 组装（关联表两段式 IN 查询）──

async function attachThemes(db: D1Database, entries: EntryJson[], locale: string) {
  if (entries.length === 0) return
  const ids = entries.map((e) => e.id)
  const marks = ids.map(() => '?').join(',')
  const rows = await db
    .prepare(
      `SELECT et.entry_id, t.id, t.document_id, t.slug, t.title_json, t.curated_intro_json,
              t.created_at, t.updated_at, t.published_at
       FROM entry_themes et JOIN research_themes t ON t.id = et.theme_id
       WHERE t.${PUBLISHED()} AND et.entry_id IN (${marks}) ORDER BY et.entry_id, t.id`
    )
    .bind(...ids)
    .all<ThemeRow & { entry_id: number }>()
  const byEntry = new Map<number, ThemeJson[]>()
  for (const r of rows.results ?? []) {
    let list = byEntry.get(r.entry_id)
    if (!list) byEntry.set(r.entry_id, (list = []))
    list.push(themeJson(r as ThemeRow, locale))
  }
  for (const e of entries) e.themes = byEntry.get(e.id) ?? []
}

async function attachSubjects(db: D1Database, entries: EntryJson[], locale: string) {
  if (entries.length === 0) return
  const ids = entries.map((e) => e.id)
  const marks = ids.map(() => '?').join(',')
  const rows = await db
    .prepare(
      `SELECT es.entry_id, s.id, s.document_id, s.slug, s.title_json, s.description_json,
              s.subject_type, s.cover_url, s.created_at, s.updated_at, s.published_at
       FROM entry_subjects es JOIN research_subjects s ON s.id = es.subject_id
       WHERE s.${PUBLISHED()} AND es.entry_id IN (${marks}) ORDER BY es.entry_id, s.id`
    )
    .bind(...ids)
    .all<SubjectRow & { entry_id: number }>()
  const byEntry = new Map<number, SubjectJson[]>()
  for (const r of rows.results ?? []) {
    let list = byEntry.get(r.entry_id)
    if (!list) byEntry.set(r.entry_id, (list = []))
    list.push(subjectJson(r as SubjectRow, locale))
  }
  for (const e of entries) e.subjects = byEntry.get(e.id) ?? []
}

async function attachSpoilerTiers(db: D1Database, entries: EntryJson[]) {
  if (entries.length === 0) return
  const idsMarks = entries.map(() => '?').join(',')
  const linkRows = await db
    .prepare(
      `SELECT id, spoiler_tier_id FROM research_entries WHERE ${PUBLISHED()} AND id IN (${idsMarks})`
    )
    .bind(...entries.map((e) => e.id))
    .all<{ id: number; spoiler_tier_id: number | null }>()
  const linked = (linkRows.results ?? []).filter(
    (x): x is { id: number; spoiler_tier_id: number } => x.spoiler_tier_id !== null
  )
  if (linked.length === 0) {
    for (const e of entries) e.spoiler_tier = null
    return
  }
  const tierIds = [...new Set(linked.map((x) => x.spoiler_tier_id))]
  const tiers = await db
    .prepare(`SELECT * FROM spoiler_tiers WHERE id IN (${tierIds.map(() => '?').join(',')})`)
    .bind(...tierIds)
    .all<{ id: number; document_id: string; key: string; title_json: string }>()
  const tierById = new Map((tiers.results ?? []).map((t) => [t.id, t]))
  const entryTier = new Map(linked.map((x) => [x.id, x.spoiler_tier_id]))
  for (const e of entries) {
    const tierId = entryTier.get(e.id)
    const row = tierId === undefined ? undefined : tierById.get(tierId)
    e.spoiler_tier =
      row === undefined
        ? null
        : {
            id: row.id,
            documentId: row.document_id,
            name: pickLocale(row.title_json, 'zh-Hans'),
            key: row.key,
          }
  }
}

async function attachCitations(db: D1Database, entry: EntryJson, locale: string) {
  const rows = await db
    .prepare(
      `SELECT c.* FROM entry_citations ec JOIN research_citations c ON c.id = ec.citation_id
       WHERE c.${PUBLISHED()} AND ec.entry_id = ?1 ORDER BY c.id`
    )
    .bind(entry.id)
    .all<CitationRow>()
  entry.citations = (rows.results ?? []).map((r) => citationJson(r, locale))
}

async function attachRelatedLinks(db: D1Database, entry: EntryJson) {
  const links = await db
    .prepare(
      `SELECT id, target_document_id, relation_type, curate_note_json, sort_order
       FROM entry_related_links WHERE entry_id = ?1 ORDER BY sort_order, id`
    )
    .bind(entry.id)
    .all<{
      id: number
      target_document_id: string
      relation_type: string
      curate_note_json: string | null
      sort_order: number
    }>()
  const targets = [...new Set((links.results ?? []).map((l) => l.target_document_id))]
  const targetByDoc = new Map<string, { id: number; documentId: string; title: string; slug: string; locale: string }>()
  // 一次 IN 查询取回全部目标条目，避免按 documentId 逐条查
  if (targets.length > 0) {
    const targetRows = await db
      .prepare(
        `SELECT id, document_id, slug, title_json FROM research_entries
         WHERE document_id IN (${targets.map(() => '?').join(',')}) AND ${PUBLISHED()}`
      )
      .bind(...targets)
      .all<EntryRow>()

    for (const row of targetRows.results ?? []) {
      targetByDoc.set(row.document_id, {
        id: row.id,
        documentId: row.document_id,
        title: pickLocale(row.title_json, 'zh-Hans'),
        slug: row.slug,
        locale: 'zh-Hans',
      })
    }
  }
  entry.related_links = (links.results ?? []).map((l) => ({
    id: l.id,
    target_entry: targetByDoc.get(l.target_document_id),
    relation_type: l.relation_type,
    curate_note: l.curate_note_json === null ? undefined : pickLocale(l.curate_note_json, 'zh-Hans'),
    order: l.sort_order,
  }))
}

async function attachRevisions(db: D1Database, entry: EntryJson, locale: string) {
  const rows = await db
    .prepare(
      `SELECT id, revised_at, revision_type, note_json FROM entry_revisions
       WHERE entry_id = ?1 ORDER BY sort_order, id`
    )
    .bind(entry.id)
    .all<{ id: number; revised_at: string | null; revision_type: string; note_json: string | null }>()
  entry.revisions = (rows.results ?? []).map((r) => ({
    id: r.id,
    date: r.revised_at ?? '',
    revision_type: r.revision_type,
    note: r.note_json === null ? undefined : pickLocale(r.note_json, locale),
  }))
}

// ── 查询参数（快照实际出现的子集）──

interface ListParams {
  locale: string
  page: number
  pageSize: number
}

function parseListParams(url: URL): ListParams {
  const ALLOWED = ['zh-Hans', 'en', 'ja']
  const rawLocale = url.searchParams.get('locale') || 'zh-Hans'
  const pageRaw = Number(url.searchParams.get('pagination[page]') || '1')
  const sizeRaw = Number(url.searchParams.get('pagination[pageSize]') || '24')
  return {
    locale: ALLOWED.includes(rawLocale) ? rawLocale : 'zh-Hans',
    page: Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1,
    pageSize:
      Number.isFinite(sizeRaw) && sizeRaw >= 1 ? Math.min(200, Math.floor(sizeRaw)) : 24,
  }
}

async function countEntries(db: D1Database, where: string, binds: unknown[]): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM research_entries WHERE ${PUBLISHED()}${where}`)
    .bind(...binds)
    .first<{ n: number }>()
  return row?.n ?? 0
}

async function queryEntries(
  db: D1Database,
  where: string,
  binds: unknown[],
  params: ListParams,
  orderBy = 'updated_at DESC'
): Promise<EntryJson[]> {
  const offset = (params.page - 1) * params.pageSize
  const rows = await db
    .prepare(
      `SELECT * FROM research_entries WHERE ${PUBLISHED()}${where}
       ORDER BY ${orderBy} LIMIT ?${binds.length + 1} OFFSET ?${binds.length + 2}`
    )
    .bind(...binds, params.pageSize, offset)
    .all<EntryRow>()
  return (rows.results ?? []).map((r) => entryJson(r, params.locale))
}

// ── 列表端点 ──

// GET /research-entries?locale&sort=updatedAt:desc&pagination[pageSize]&filters[...]
researchRoutes.get('/research-entries', async (c) => {
  const url = new URL(c.req.url)
  const params = parseListParams(url)
  const db = c.env.DB

  const slugEq = url.searchParams.get('filters[slug][$eq]')
  const themeSlug = url.searchParams.get('filters[themes][slug][$eq]')
  const subjectSlug = url.searchParams.get('filters[subjects][slug][$eq]')
  const citationIdsIn = url.searchParams.getAll('filters[citations][id][$in]').flatMap((v) => v.split(',')).filter(Boolean)

  let where = ''
  const binds: unknown[] = []

  if (slugEq !== null) {
    where += ' AND slug = ?'
    binds.push(slugEq)
  }
  if (themeSlug !== null) {
    where += ` AND id IN (SELECT et.entry_id FROM entry_themes et
               JOIN research_themes t ON t.id = et.theme_id
               WHERE t.${PUBLISHED()} AND t.slug = ?)`
    binds.push(themeSlug)
  }
  if (subjectSlug !== null) {
    where += ` AND id IN (SELECT es.entry_id FROM entry_subjects es
               JOIN research_subjects s ON s.id = es.subject_id
               WHERE s.${PUBLISHED()} AND s.slug = ?)`
    binds.push(subjectSlug)
  }
  if (citationIdsIn.length > 0) {
    const marks = citationIdsIn.map(() => '?').join(',')
    where += ` AND id IN (SELECT ec.entry_id FROM entry_citations ec
               JOIN research_citations cit ON cit.id = ec.citation_id
               WHERE cit.${PUBLISHED()} AND cit.id IN (${marks}))`
    binds.push(...citationIdsIn.map(Number).filter((n) => !Number.isNaN(n)))
  }

  const total = await countEntries(db, where, binds)
  const data = await queryEntries(db, where, binds, params)
  await attachThemes(db, data, params.locale)
  await attachSubjects(db, data, params.locale)
  await attachSpoilerTiers(db, data)
  return okPaginated(data, paginationOf(params.page, params.pageSize, total))
})

// GET /research-entries/:slug — 详情（populate citations/related_links/revisions/themes/subjects/spoiler_tier）
researchRoutes.get('/research-entries/:slug', async (c) => {
  const slug = c.req.param('slug')
  if (slug === 'backlinks') return fail(404, 'not_found')
  const url = new URL(c.req.url)
  const params = parseListParams(url)
  const db = c.env.DB

  const row = await db
    .prepare(`SELECT * FROM research_entries WHERE slug = ?1 AND ${PUBLISHED()}`)
    .bind(slug)
    .first<EntryRow>()
  if (!row) return fail(404, 'not_found')

  const entry = entryJson(row, params.locale)
  await attachThemes(db, [entry], params.locale)
  await attachSubjects(db, [entry], params.locale)
  await attachSpoilerTiers(db, [entry])
  await attachCitations(db, entry, params.locale)
  await attachRelatedLinks(db, entry)
  await attachRevisions(db, entry, params.locale)
  return ok(entry)
})

// GET /research-entries/:documentId/backlinks — 反向链接：
// 结构化边 entry_related_links.target_document_id ∪ 正文 [[wikiSlug]]，排除自身。
researchRoutes.get('/research-entries/:documentId/backlinks', async (c) => {
  const documentId = c.req.param('documentId')
  const url = new URL(c.req.url)
  const params = parseListParams(url)
  const db = c.env.DB

  const self = await db
    .prepare(`SELECT id, slug FROM research_entries WHERE document_id = ?1`)
    .bind(documentId)
    .first<{ id: number; slug: string }>()
  if (!self) return fail(404, 'not_found')

  const likePattern = `%[[${self.slug}%`
  const rows = await db
    .prepare(
      `SELECT DISTINCT e.* FROM research_entries e
       WHERE e.${PUBLISHED()}
         AND e.slug != ?2
         AND (
           e.id IN (SELECT rl.entry_id FROM entry_related_links rl WHERE rl.target_document_id = ?1)
           OR e.body_json LIKE ?3
         )
       ORDER BY e.updated_at DESC LIMIT 50`
    )
    .bind(documentId, self.slug, likePattern)
    .all<EntryRow>()

  const data = (rows.results ?? [])
    .map((r) => ({ ...entryJson(r, params.locale), body: undefined }))
  // 契约 consume 只取 id/title/slug；related_links 目标 slug 一并给出供前端分组
  // 一次 IN 查询取回全部关联，避免按行 N+1（此处 N 最大 50）
  const entryIds = data.map((item) => item.id)
  const linksByEntry = new Map<number, Array<{ target_entry: { slug: string }; order: number }>>()
  if (entryIds.length > 0) {
    const linkRows = await db
      .prepare(
        `SELECT rl.entry_id, rl.sort_order, te.slug FROM entry_related_links rl
         JOIN research_entries te ON te.document_id = rl.target_document_id AND te.${PUBLISHED()}
         WHERE rl.entry_id IN (${entryIds.map(() => '?').join(',')})
         ORDER BY rl.entry_id, rl.sort_order`
      )
      .bind(...entryIds)
      .all<{ entry_id: number; sort_order: number; slug: string }>()

    for (const link of linkRows.results ?? []) {
      const list = linksByEntry.get(link.entry_id) ?? []
      list.push({ target_entry: { slug: link.slug }, order: link.sort_order })
      linksByEntry.set(link.entry_id, list)
    }
  }
  for (const item of data) {
    ;(item as Record<string, unknown>).related_links = linksByEntry.get(item.id) ?? []
  }
  return okPaginated(data, paginationOf(1, 50, data.length))
})

// GET /research-citations/:documentId/also-cited — 引证反查：引用同一引证的其他条目
researchRoutes.get('/research-citations/:documentId/also-cited', async (c) => {
  const documentId = c.req.param('documentId')
  const url = new URL(c.req.url)
  const params = parseListParams(url)
  const db = c.env.DB

  const citation = await db
    .prepare(`SELECT id FROM research_citations WHERE document_id = ?1 AND ${PUBLISHED()}`)
    .bind(documentId)
    .first<{ id: number }>()
  if (!citation) return fail(404, 'not_found')

  const excludeSlug = url.searchParams.get('filters[slug][$ne]')
  const rows = await db
    .prepare(
      `SELECT e.*, ec.entry_id FROM research_entries e
       JOIN entry_citations ec ON ec.entry_id = e.id AND ec.citation_id = ?1
       WHERE e.${PUBLISHED()} AND (?2 IS NULL OR e.slug != ?2)
       ORDER BY e.updated_at DESC`
    )
    .bind(citation.id, excludeSlug)
    .all<EntryRow>()

  const data = (rows.results ?? []).map((r) => entryJson(r, params.locale))
  // populate[citations][fields][0]=id：仅回 citations 的 id 列表（最小字段），供调用方按引证分组
  // 同样一次 IN 查询取回，避免按行 N+1
  const entryIds = data.map((item) => item.id)
  const citationsByEntry = new Map<number, Array<{ id: number }>>()
  if (entryIds.length > 0) {
    const ownRows = await db
      .prepare(
        `SELECT entry_id, citation_id FROM entry_citations
         WHERE entry_id IN (${entryIds.map(() => '?').join(',')})
         ORDER BY entry_id, citation_id`
      )
      .bind(...entryIds)
      .all<{ entry_id: number; citation_id: number }>()

    for (const row of ownRows.results ?? []) {
      const list = citationsByEntry.get(row.entry_id) ?? []
      list.push({ id: row.citation_id })
      citationsByEntry.set(row.entry_id, list)
    }
  }
  for (const item of data) {
    item.citations = citationsByEntry.get(item.id) ?? []
  }
  return okPaginated(data, paginationOf(1, 50, data.length))
})

// ── 阅读路径 ──

async function pathStepsFor(
  db: D1Database,
  pathId: number,
  locale: string
): Promise<Array<{ id: number; entry?: { id: number; documentId: string; title: string; slug: string; summary?: string }; step_note?: string }>> {
  const steps = await db
    .prepare(
      `SELECT ps.id, ps.target_document_id, ps.step_note_json, ps.sort_order
       FROM path_steps ps WHERE ps.path_id = ?1 ORDER BY ps.sort_order, ps.id`
    )
    .bind(pathId)
    .all<{ id: number; target_document_id: string; step_note_json: string | null; sort_order: number }>()
  const result: Array<{ id: number; entry?: { id: number; documentId: string; title: string; slug: string; summary?: string }; step_note?: string }> = []
  for (const step of steps.results ?? []) {
    const entry = await db
      .prepare(
        `SELECT id, document_id, slug, title_json, summary_json FROM research_entries
         WHERE document_id = ?1 AND ${PUBLISHED()}`
      )
      .bind(step.target_document_id)
      .first<EntryRow>()
    result.push({
      id: step.id,
      entry: entry
        ? {
            id: entry.id,
            documentId: entry.document_id,
            title: pickLocale(entry.title_json, locale),
            slug: entry.slug,
            summary:
              entry.summary_json === null ? undefined : pickLocale(entry.summary_json, locale),
          }
        : undefined,
      step_note:
        step.step_note_json === null ? undefined : pickLocale(step.step_note_json, locale),
    })
  }
  return result
}

// GET /research-paths?sort[0]=order:asc&sort[1]=updatedAt:desc&pagination[pageSize]=50
researchRoutes.get('/research-paths', async (c) => {
  const url = new URL(c.req.url)
  const params = parseListParams(url)
  const db = c.env.DB

  // filters[steps][entry][slug][$eq]：包含该条目的路径（上一篇/下一篇导航用）
  const entrySlug = url.searchParams.get('filters[steps][entry][slug][$eq]')
  let where = ''
  const binds: unknown[] = []
  if (entrySlug !== null) {
    where = ` AND id IN (
      SELECT ps.path_id FROM path_steps ps
      JOIN research_entries e ON e.document_id = ps.target_document_id AND e.${PUBLISHED()}
      WHERE e.slug = ?)`
    binds.push(entrySlug)
  }

  const totalRow = await db
    .prepare(`SELECT COUNT(*) AS n FROM research_paths WHERE ${PUBLISHED()}${where}`)
    .bind(...binds)
    .first<{ n: number }>()
  const total = totalRow?.n ?? 0
  const rows = await db
    .prepare(
      `SELECT * FROM research_paths WHERE ${PUBLISHED()}${where}
       ORDER BY sort_order ASC, updated_at DESC LIMIT ?${binds.length + 1} OFFSET ?${binds.length + 2}`
    )
    .bind(...binds, params.pageSize, (params.page - 1) * params.pageSize)
    .all<PathRow>()

  const data = (rows.results ?? []).map((r) => pathJson(r, params.locale))
  for (const p of data) {
    ;(p as Record<string, unknown>).steps = await pathStepsFor(db, p.id, params.locale)
  }
  return okPaginated(data, paginationOf(params.page, params.pageSize, total))
})

// GET /research-paths/:slug — 单个路径（fetchLocalizedSingleBySlug 语义：slug 全局唯一，无 locale 变体）
researchRoutes.get('/research-paths/:slug', async (c) => {
  const slug = c.req.param('slug')
  if (slug === 'neighbors') return fail(404, 'not_found')
  const url = new URL(c.req.url)
  const params = parseListParams(url)
  const db = c.env.DB

  const row = await db
    .prepare(`SELECT * FROM research_paths WHERE slug = ?1 AND ${PUBLISHED()}`)
    .bind(slug)
    .first<PathRow>()
  if (!row) return fail(404, 'not_found')
  const path = pathJson(row, params.locale)
  ;(path as Record<string, unknown>).steps = await pathStepsFor(db, row.id, params.locale)
  return ok(path)
})

// GET /research-paths/:slug/neighbors/:entryDocumentId — 条目在路径中的上/下篇
researchRoutes.get('/research-paths/:slug/neighbors/:entryDocumentId', async (c) => {
  const slug = c.req.param('slug')
  const entryDoc = c.req.param('entryDocumentId')
  const url = new URL(c.req.url)
  const params = parseListParams(url)
  const db = c.env.DB

  const path = await db
    .prepare(`SELECT id FROM research_paths WHERE slug = ?1 AND ${PUBLISHED()}`)
    .bind(slug)
    .first<{ id: number }>()
  if (!path) return fail(404, 'path_not_found')

  const steps = await pathStepsFor(db, path.id, params.locale)
  const withEntry = steps.filter((s) => s.entry !== undefined)
  const idx = withEntry.findIndex((s) => s.entry!.documentId === entryDoc)
  if (idx === -1) return fail(404, 'entry_not_in_path')

  const prev = idx > 0 ? withEntry[idx - 1].entry : null
  const next = idx < withEntry.length - 1 ? withEntry[idx + 1].entry : null
  return ok({
    path: { slug },
    previous: prev ? { documentId: prev.documentId, slug: prev.slug, title: prev.title } : null,
    next: next ? { documentId: next.documentId, slug: next.slug, title: next.title } : null,
  })
})

// ── 主题 ──

researchRoutes.get('/research-themes', async (c) => {
  const url = new URL(c.req.url)
  const params = parseListParams(url)
  const db = c.env.DB

  const totalRow = await db
    .prepare(`SELECT COUNT(*) AS n FROM research_themes WHERE ${PUBLISHED()}`)
    .first<{ n: number }>()
  const rows = await db
    .prepare(
      `SELECT * FROM research_themes WHERE ${PUBLISHED()}
       ORDER BY title_json ASC, id ASC LIMIT ?1 OFFSET ?2`
    )
    .bind(params.pageSize, (params.page - 1) * params.pageSize)
    .all<ThemeRow>()
  return okPaginated(
    (rows.results ?? []).map((r) => themeJson(r, params.locale)),
    paginationOf(params.page, params.pageSize, totalRow?.n ?? 0)
  )
})

researchRoutes.get('/research-themes/:slug', async (c) => {
  const slug = c.req.param('slug')
  const url = new URL(c.req.url)
  const params = parseListParams(url)
  const row = await c.env.DB
    .prepare(`SELECT * FROM research_themes WHERE slug = ?1 AND ${PUBLISHED()}`)
    .bind(slug)
    .first<ThemeRow>()
  if (!row) return fail(404, 'not_found')
  return ok(themeJson(row, params.locale))
})

// ── 考据对象 ──

researchRoutes.get('/research-subjects', async (c) => {
  const url = new URL(c.req.url)
  const params = parseListParams(url)
  const db = c.env.DB

  // filters[$or][0][students][id][$eq] / filters[$or][1][students][documentId][$eq]
  const studentIdEq = url.searchParams.get('filters[$or][0][students][id][$eq]')
  const studentDocEq = url.searchParams.get('filters[$or][1][students][documentId][$eq]')
  let where = ''
  const binds: unknown[] = []
  if (studentIdEq !== null || studentDocEq !== null) {
    const conds: string[] = []
    if (studentIdEq !== null) {
      conds.push('ss.student_id = ?')
      binds.push(Number(studentIdEq))
    }
    if (studentDocEq !== null) {
      conds.push('st.document_id = ?')
      binds.push(studentDocEq)
    }
    where = ` AND id IN (
      SELECT ss.subject_id FROM subject_students ss
      JOIN students st ON st.id = ss.student_id
      WHERE st.${PUBLISHED()} AND (${conds.join(' OR ')}))`
  }

  const totalRow = await db
    .prepare(`SELECT COUNT(*) AS n FROM research_subjects WHERE ${PUBLISHED()}${where}`)
    .bind(...binds)
    .first<{ n: number }>()
  const rows = await db
    .prepare(
      `SELECT * FROM research_subjects WHERE ${PUBLISHED()}${where}
       ORDER BY title_json ASC, id ASC LIMIT ?${binds.length + 1} OFFSET ?${binds.length + 2}`
    )
    .bind(...binds, params.pageSize, (params.page - 1) * params.pageSize)
    .all<SubjectRow>()

  const data = (rows.results ?? []).map((r) => subjectJson(r, params.locale))
  // populate[entries][fields]=title,slug：学生页条目计数所需的最小字段
  if (studentIdEq !== null || studentDocEq !== null) {
    for (const s of data) {
      const entries = await db
        .prepare(
          `SELECT e.id, e.document_id, e.slug, e.title_json FROM entry_subjects es
           JOIN research_entries e ON e.id = es.entry_id AND e.${PUBLISHED()}
           WHERE es.subject_id = ?1 ORDER BY e.updated_at DESC`
        )
        .bind(s.id)
        .all<EntryRow>()
      s.entries = (entries.results ?? []).map((e) => ({
        id: e.id,
        documentId: e.document_id,
        title: pickLocale(e.title_json, params.locale),
        slug: e.slug,
      }))
    }
  }
  return okPaginated(data, paginationOf(params.page, params.pageSize, totalRow?.n ?? 0))
})

researchRoutes.get('/research-subjects/:slug', async (c) => {
  const slug = c.req.param('slug')
  const url = new URL(c.req.url)
  const params = parseListParams(url)
  const db = c.env.DB

  const row = await db
    .prepare(`SELECT * FROM research_subjects WHERE slug = ?1 AND ${PUBLISHED()}`)
    .bind(slug)
    .first<SubjectRow>()
  if (!row) return fail(404, 'not_found')
  const subject = subjectJson(row, params.locale)

  // populate[students][populate][avatar]：学生卡（avatar 本 schema 无媒体表，置 null）
  const students = await db
    .prepare(
      `SELECT st.* FROM subject_students ss
       JOIN students st ON st.id = ss.student_id AND st.${PUBLISHED()}
       WHERE ss.subject_id = ?1 ORDER BY st.name ASC`
    )
    .bind(row.id)
    .all<{
      id: number
      document_id: string
      name: string
      avatar_url: string | null
      organization: string | null
      wiki_url: string | null
    }>()
  subject.students = (students.results ?? []).map((st) => ({
    id: st.id,
    documentId: st.document_id,
    name: st.name,
    avatar: st.avatar_url ? { url: st.avatar_url } : null,
    organization: st.organization ?? undefined,
  }))
  return ok(subject)
})

// ── 知识图谱 ──

// GET /research-graph — 节点（条目）+ 边（related_links），主题/对象作为节点属性
researchRoutes.get('/research-graph', async (c) => {
  const url = new URL(c.req.url)
  const params = parseListParams(url)
  const db = c.env.DB

  type GraphNode = {
    id: string
    title: string
    slug: string
    media_type: string
    body?: string
    themes: Array<{ name: string; slug: string }>
    subjects: Array<{ name: string; slug: string }>
  }
  type GraphEdge = { source: string; target: string; relation_type: string }

  const rows = await db
    .prepare(
      `SELECT * FROM research_entries WHERE ${PUBLISHED()} ORDER BY updated_at DESC LIMIT 200`
    )
    .all<EntryRow>()
  const entries = (rows.results ?? []).map((r) => entryJson(r, params.locale))

  // 节点属性：主题/对象最小字段（name/slug），一次 IN 查询按 entry 分组
  await attachThemes(db, entries, params.locale)
  await attachSubjects(db, entries, params.locale)

  const allLinks = await db
    .prepare(
      `SELECT rl.entry_id, rl.target_document_id, rl.relation_type,
              te.document_id AS target_doc
       FROM entry_related_links rl
       JOIN research_entries te ON te.document_id = rl.target_document_id AND te.${PUBLISHED()}
       WHERE rl.entry_id IN (${entries.map(() => '?').join(',') || 'NULL'})`
    )
    .bind(...entries.map((e) => e.id))
    .all<{ entry_id: number; target_document_id: string; relation_type: string; target_doc: string }>()

  const docIdByInternal = new Map(entries.map((e) => [e.id, e.documentId]))
  const linksByEntry = new Map<number, Array<{ target_doc: string; relation_type: string }>>()
  for (const l of allLinks.results ?? []) {
    let list = linksByEntry.get(l.entry_id)
    if (!list) linksByEntry.set(l.entry_id, (list = []))
    list.push({ target_doc: l.target_doc, relation_type: l.relation_type })
  }

  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  for (const e of entries) {
    nodes.push({
      id: e.documentId,
      title: e.title,
      slug: e.slug,
      media_type: e.media_type,
      body: e.body,
      themes: (e.themes ?? []).map((t) => ({ name: t.name, slug: t.slug })),
      subjects: (e.subjects ?? []).map((s) => ({ name: s.name, slug: s.slug })),
    })
    for (const l of linksByEntry.get(e.id) ?? []) {
      edges.push({
        source: docIdByInternal.get(e.id) ?? e.documentId,
        target: l.target_doc,
        relation_type: l.relation_type,
      })
    }
  }
  return ok({ nodes, edges })
})
