/**
 * 通用集合 CRUD：GET/POST /panel/:collection、GET/PUT/DELETE /panel/:collection/:documentId。
 * 集合白名单（collections.ts）+ 字段白名单（input-schema.ts）双重校验。
 * 对外 ID 一律 documentId；数字 id 仅内部使用。
 */
import type { HonoPanel } from './types'
import { fail, ok, okPaginated, paginationOf } from '../lib/respond'
import { pickLocale } from '../lib/i18n'
import { COLLECTIONS, isPanelCollection } from './collections'
import { FieldValidationError, mapLocale, pickAllowedFields } from './input-schema'
import { recordAuditLog } from './audit'

const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 12

interface RowRecord {
  id: number
  document_id: string | null
  created_at: number
  updated_at: number
  published_at: number | null
  [column: string]: unknown
}

/** 行 → 面板契约 JSON：camelCase 字段名 + i18n 解包 + documentId。 */
function serializeRow(
  collectionKey: string,
  row: RowRecord,
  locale: string
): Record<string, unknown> {
  const def = COLLECTIONS[collectionKey]
  const out: Record<string, unknown> = {
    id: row.document_id ?? String(row.id),
    documentId: row.document_id ?? String(row.id),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
    status: row.published_at ? 'published' : 'draft',
  }

  for (const [fieldName, field] of Object.entries(def.fields)) {
    if (field.kind === 'published-at') continue
    const raw = row[field.column]
    if (field.localized) {
      out[fieldName] = typeof raw === 'string' ? pickLocale(raw, locale) : ''
    } else {
      out[fieldName] = raw ?? null
    }
  }
  return out
}

/** 随机 documentId，对齐 Strapi 24 位十六进制格式。 */
function generateDocumentId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 24)
}

async function findByDocumentId(db: D1Database, table: string, documentId: string): Promise<RowRecord | null> {
  return db.prepare(`SELECT * FROM ${table} WHERE document_id = ?1`).bind(documentId).first<RowRecord>()
}

export function registerCrudRoutes(panel: HonoPanel): void {
  // 注意：必须用显式 /panel 前缀；挂载在 '/' 时 '/:collection' 会把 'panel' 当集合名吞掉两段路径
  // ===== 列表 =====
  panel.get('/panel/:collection', async (c) => {
    const key = c.req.param('collection')
    if (!isPanelCollection(key)) return fail(404, 'unknown_collection')
    const def = COLLECTIONS[key]
    const locale = mapLocale(c.req.query('locale'))
    const page = Math.max(1, Number(c.req.query('page') || '1') || 1)
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(c.req.query('pageSize') || String(DEFAULT_PAGE_SIZE)) || DEFAULT_PAGE_SIZE))

    const where: string[] = []
    const binds: unknown[] = []

    const status = c.req.query('status')
    if (status === 'published') where.push('published_at IS NOT NULL')
    else if (status === 'draft') where.push('published_at IS NULL')

    const search = c.req.query('search')?.trim()
    if (search) {
      const clauses = def.searchColumns.map((col) => `LOWER(${col}) LIKE ?${binds.length + 1}`)
      binds.push(`%${search.toLowerCase()}%`)
      if (clauses.length > 0) where.push(`(${clauses.join(' OR ')})`)
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
    const orderSql = def.defaultSort.map(([col, dir]) => `${col} ${dir.toUpperCase()}`).join(', ')
    const totalRow = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM ${def.table} ${whereSql}`)
      .bind(...binds)
      .first<{ n: number }>()
    const total = totalRow?.n ?? 0

    const offset = (page - 1) * pageSize
    const { results } = await c.env.DB.prepare(
      `SELECT * FROM ${def.table} ${whereSql} ORDER BY ${orderSql} LIMIT ${pageSize} OFFSET ${offset}`
    )
      .bind(...binds)
      .all<RowRecord>()

    return okPaginated(results.map((row) => serializeRow(key, row, locale)), paginationOf(page, pageSize, total))
  })

  // ===== 单条 =====
  panel.get('/panel/:collection/:documentId', async (c) => {
    const key = c.req.param('collection')
    if (!isPanelCollection(key)) return fail(404, 'unknown_collection')
    const def = COLLECTIONS[key]
    const row = await findByDocumentId(c.env.DB, def.table, c.req.param('documentId'))
    if (!row) return fail(404, 'not_found')
    return ok(serializeRow(key, row, mapLocale(c.req.query('locale'))))
  })

  // ===== 新建 =====
  panel.post('/panel/:collection', async (c) => {
    const key = c.req.param('collection')
    if (!isPanelCollection(key)) return fail(404, 'unknown_collection')
    const def = COLLECTIONS[key]
    if (def.readOnly) return fail(400, 'read_only_collection')

    let body: { data?: Record<string, unknown>; locale?: string } | Record<string, unknown>
    try {
      body = await c.req.json()
    } catch {
      return fail(400, 'invalid_request')
    }
    const payload = ('data' in body && body.data && typeof body.data === 'object' ? body.data : body) as Record<string, unknown>
    const localeQuery = 'locale' in body && typeof body.locale === 'string' ? body.locale : undefined

    try {
      const now = Date.now()
      const { values } = pickAllowedFields(key, payload, localeQuery)
      const columns = ['document_id', 'created_at', 'updated_at']
      const placeholders = ['?1', '?2', '?3']
      const binds: unknown[] = [generateDocumentId(), now, now]
      for (const [column, value] of Object.entries(values)) {
        columns.push(column)
        placeholders.push(`?${binds.length + 1}`)
        binds.push(value)
      }
      const result = await c.env.DB.prepare(
        `INSERT INTO ${def.table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`
      )
        .bind(...binds)
        .run()
      if (!result.meta.changes) return fail(500, 'insert_failed')

      const row = await findByDocumentId(c.env.DB, def.table, binds[0] as string)
      await recordAuditLog(c, {
        action: 'create',
        targetCollection: key,
        targetDocumentId: binds[0] as string,
        payloadSummary: summarizePayload(payload),
      })
      return ok(row ? serializeRow(key, row, mapLocale(localeQuery)) : {})
    } catch (error) {
      if (error instanceof FieldValidationError) {
        return fail(400, error.field ? `unknown_field:${error.field}` : error.message)
      }
      const message = (error as Error).message || ''
      if (/UNIQUE/.test(message)) return fail(400, 'duplicate_slug')
      if (/NOT NULL/.test(message)) return fail(400, 'missing_required_field')
      return fail(400, 'create_failed')
    }
  })

  // ===== 更新 =====
  panel.put('/panel/:collection/:documentId', async (c) => {
    const key = c.req.param('collection')
    if (!isPanelCollection(key)) return fail(404, 'unknown_collection')
    const def = COLLECTIONS[key]
    if (def.readOnly) return fail(400, 'read_only_collection')

    let body: { data?: Record<string, unknown>; locale?: string } | Record<string, unknown>
    try {
      body = await c.req.json()
    } catch {
      return fail(400, 'invalid_request')
    }
    const payload = ('data' in body && body.data && typeof body.data === 'object' ? body.data : body) as Record<string, unknown>
    const localeQuery = 'locale' in body && typeof body.locale === 'string' ? body.locale : undefined
    const documentId = c.req.param('documentId')

    const existing = await findByDocumentId(c.env.DB, def.table, documentId)
    if (!existing) return fail(404, 'not_found')

    try {
      const { values } = pickAllowedFields(key, payload, localeQuery)
      const sets = ['updated_at = ?1']
      const binds: unknown[] = [Date.now()]
      for (const [column, value] of Object.entries(values)) {
        sets.push(`${column} = ?${binds.length + 1}`)
        binds.push(value)
      }
      binds.push(documentId)
      await c.env.DB.prepare(`UPDATE ${def.table} SET ${sets.join(', ')} WHERE document_id = ?${binds.length}`)
        .bind(...binds)
        .run()

      const row = await findByDocumentId(c.env.DB, def.table, documentId)
      await recordAuditLog(c, {
        action: 'update',
        targetCollection: key,
        targetDocumentId: documentId,
        payloadSummary: summarizePayload(payload),
      })
      return ok(row ? serializeRow(key, row, mapLocale(localeQuery)) : {})
    } catch (error) {
      if (error instanceof FieldValidationError) {
        return fail(400, error.field ? `unknown_field:${error.field}` : error.message)
      }
      const message = (error as Error).message || ''
      if (/UNIQUE/.test(message)) return fail(400, 'duplicate_slug')
      return fail(400, 'update_failed')
    }
  })

  // ===== 删除 =====
  panel.delete('/panel/:collection/:documentId', async (c) => {
    const key = c.req.param('collection')
    if (!isPanelCollection(key)) return fail(404, 'unknown_collection')
    const def = COLLECTIONS[key]
    if (def.readOnly) return fail(400, 'read_only_collection')
    const documentId = c.req.param('documentId')

    const existing = await findByDocumentId(c.env.DB, def.table, documentId)
    if (!existing) return fail(404, 'not_found')

    await c.env.DB.prepare(`DELETE FROM ${def.table} WHERE document_id = ?1`).bind(documentId).run()
    await recordAuditLog(c, { action: 'delete', targetCollection: key, targetDocumentId: documentId })
    return ok({ success: true })
  })
}

function summarizePayload(payload: Record<string, unknown>): string {
  try {
    const keys = Object.keys(payload)
    const preview = keys.length > 8 ? keys.slice(0, 8).join(',') + ',…' : keys.join(',')
    return JSON.stringify({ fields: preview })
  } catch {
    return ''
  }
}
