/**
 * 考据策展（curator singleType）：GET / PUT /panel/research-curator。
 *
 * 单行表（id 恒为 1），不走通用 CRUD。此前只有表没有路由，
 * 后台「考据策展」页整页取数失败。
 * 契约见 frontend/tests/contracts/admin-panel.ts 的 getCuratorAdmin / updateCuratorAdmin。
 */
import type { Context } from 'hono'
import { fail, ok } from '../lib/respond'
import { pickLocale } from '../lib/i18n'
import { recordAuditLog } from './audit'
import type { PanelEnv, PanelVars } from './types'

type CuratorContext = Context<{ Bindings: PanelEnv; Variables: PanelVars }>

interface CuratorRow {
  id: number
  featured_entry_document_id: string | null
  pick_note_json: string | null
  path_description_json: string | null
  path_steps_json: string | null
  updated_at: number
}

/** 本地化文本按单列 JSON 存储，与通用 CRUD 的 localized 字段一致。 */
function toI18nJson(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') return null
  return JSON.stringify({ 'zh-Hans': value })
}

async function serialize(
  db: D1Database,
  row: CuratorRow | null,
  locale: string
): Promise<Record<string, unknown>> {
  if (!row) {
    return { featured_entry: null, pick_note: null, path_description: null }
  }

  // featured_entry 只回 id/title/slug（契约 consume）；条目已下架时按未设置处理
  let featuredEntry: { id: string; title: string; slug: string } | null = null
  if (row.featured_entry_document_id) {
    const entry = await db
      .prepare(
        `SELECT document_id, slug, title_json FROM research_entries
         WHERE document_id = ?1 AND published_at IS NOT NULL`
      )
      .bind(row.featured_entry_document_id)
      .first<{ document_id: string; slug: string; title_json: string }>()
    if (entry) {
      featuredEntry = {
        id: entry.document_id,
        title: pickLocale(entry.title_json, locale),
        slug: entry.slug,
      }
    }
  }

  return {
    id: row.id,
    featured_entry: featuredEntry,
    pick_note: row.pick_note_json ? pickLocale(row.pick_note_json, locale) : null,
    path_description: row.path_description_json ? pickLocale(row.path_description_json, locale) : null,
  }
}

export async function handleCuratorGet(c: CuratorContext): Promise<Response> {
  const locale = c.req.query('locale') || 'zh-Hans'
  const row = await c.env.DB.prepare('SELECT * FROM curator WHERE id = 1').first<CuratorRow>()
  return ok(await serialize(c.env.DB, row, locale))
}

export async function handleCuratorPut(c: CuratorContext): Promise<Response> {
  let body: { data?: Record<string, unknown>; locale?: string } | Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return fail(400, 'invalid_request')
  }

  const payload = ('data' in body && body.data && typeof body.data === 'object' ? body.data : body) as Record<
    string,
    unknown
  >
  const locale = ('locale' in body && typeof body.locale === 'string' ? body.locale : undefined) || 'zh-Hans'

  const ALLOWED = new Set(['featured_entry', 'pick_note', 'path_description'])
  for (const key of Object.keys(payload)) {
    if (!ALLOWED.has(key)) return fail(400, `unknown_field:${key}`)
  }

  // featured_entry 收 documentId 字符串；对外只有这一种 ID
  let featuredDocumentId: string | null = null
  if ('featured_entry' in payload) {
    const raw = payload.featured_entry
    if (raw !== null && raw !== undefined && raw !== '') {
      featuredDocumentId = typeof raw === 'object' ? String((raw as { id?: unknown }).id ?? '') : String(raw)
      if (!featuredDocumentId) return fail(400, 'invalid_request')

      const exists = await c.env.DB.prepare('SELECT 1 AS hit FROM research_entries WHERE document_id = ?1')
        .bind(featuredDocumentId)
        .first<{ hit: number }>()
      if (!exists) return fail(400, 'unknown_field:featured_entry')
    }
  }

  const now = Date.now()
  // 单行表：不存在则插入，存在则只更新本次提交的列
  await c.env.DB.prepare(
    `INSERT INTO curator (id, featured_entry_document_id, pick_note_json, path_description_json, updated_at)
     VALUES (1, ?1, ?2, ?3, ?4)
     ON CONFLICT(id) DO UPDATE SET
       featured_entry_document_id = CASE WHEN ?5 THEN excluded.featured_entry_document_id ELSE curator.featured_entry_document_id END,
       pick_note_json = CASE WHEN ?6 THEN excluded.pick_note_json ELSE curator.pick_note_json END,
       path_description_json = CASE WHEN ?7 THEN excluded.path_description_json ELSE curator.path_description_json END,
       updated_at = excluded.updated_at`
  )
    .bind(
      featuredDocumentId,
      toI18nJson(payload.pick_note),
      toI18nJson(payload.path_description),
      now,
      'featured_entry' in payload ? 1 : 0,
      'pick_note' in payload ? 1 : 0,
      'path_description' in payload ? 1 : 0
    )
    .run()

  await recordAuditLog(c as never, {
    action: 'update',
    targetCollection: 'research-curator',
    targetDocumentId: '1',
    payloadSummary: JSON.stringify({ fields: Object.keys(payload).join(',') }),
  })

  const row = await c.env.DB.prepare('SELECT * FROM curator WHERE id = 1').first<CuratorRow>()
  return ok(await serialize(c.env.DB, row, locale))
}
