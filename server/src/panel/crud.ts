/**
 * 通用集合 CRUD：GET/POST /panel/:collection、GET/PUT/DELETE /panel/:collection/:documentId。
 * 集合白名单（collections.ts）+ 字段白名单（input-schema.ts）双重校验。
 * 对外 ID 一律 documentId；数字 id 仅内部使用。
 */
import type { HonoPanel } from './types'
import { fail, ok, okPaginated, paginationOf } from '../lib/respond'
import { pickLocale } from '../lib/i18n'
import { COLLECTIONS, isPanelCollection } from './collections'
import type { CollectionDef } from './collections'
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

  const allFields = { ...def.fields, ...(def.sideTable?.fields ?? {}) }
  for (const [fieldName, field] of Object.entries(allFields)) {
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

/** 主表 SELECT（副表存在时 LEFT JOIN 拉平；副表列名与主表不重名）。 */
function selectFrom(def: CollectionDef): string {
  if (!def.sideTable) return `SELECT * FROM ${def.table}`
  const cols = Object.values(def.sideTable.fields).map((f) => `s.${f.column}`).join(', ')
  return `SELECT t.*, ${cols} FROM ${def.table} t LEFT JOIN ${def.sideTable.table} s ON s.${def.sideTable.fk} = t.id`
}

/** 固定过滤器的 WHERE 子句；无过滤器返回 null。列名在 selectFrom 有 JOIN 时需带 t. 前缀。 */
function fixedWhere(def: CollectionDef, qualified: boolean): { sql: string; value: string } | null {
  if (!def.fixedFilter) return null
  const col = qualified && def.sideTable ? `t.${def.fixedFilter.column}` : def.fixedFilter.column
  return { sql: col, value: def.fixedFilter.value }
}

/** 随机 documentId，对齐 Strapi 24 位十六进制格式。 */
function generateDocumentId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 24)
}

/**
 * documentId 查单条。固定过滤器一并生效 —— 否则 online-events 能读写到 offline 的行。
 */
async function findByDocumentId(db: D1Database, def: CollectionDef, documentId: string): Promise<RowRecord | null> {
  const docCol = def.sideTable ? 't.document_id' : 'document_id'
  const fixed = fixedWhere(def, true)
  const where = fixed ? `${docCol} = ?1 AND ${fixed.sql} = ?2` : `${docCol} = ?1`
  const binds = fixed ? [documentId, fixed.value] : [documentId]
  return db.prepare(`${selectFrom(def)} WHERE ${where}`).bind(...binds).first<RowRecord>()
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
    // 有 JOIN 时主表列必须带 t. 前缀，否则与副表列产生歧义
    const q = (col: string) => (def.sideTable ? `t.${col}` : col)

    const fixed = fixedWhere(def, true)
    if (fixed) {
      binds.push(fixed.value)
      where.push(`${fixed.sql} = ?${binds.length}`)
    }

    const status = c.req.query('status')
    if (status === 'published') where.push(`${q('published_at')} IS NOT NULL`)
    else if (status === 'draft') where.push(`${q('published_at')} IS NULL`)

    const search = c.req.query('search')?.trim()
    if (search) {
      binds.push(`%${search.toLowerCase()}%`)
      const clauses = def.searchColumns.map((col) => `LOWER(${q(col)}) LIKE ?${binds.length}`)
      if (clauses.length > 0) where.push(`(${clauses.join(' OR ')})`)
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
    const orderSql = def.defaultSort.map(([col, dir]) => `${q(col)} ${dir.toUpperCase()}`).join(', ')
    const countFrom = def.sideTable ? `${def.table} t` : def.table
    const totalRow = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM ${countFrom} ${whereSql}`)
      .bind(...binds)
      .first<{ n: number }>()
    const total = totalRow?.n ?? 0

    const offset = (page - 1) * pageSize
    const { results } = await c.env.DB.prepare(
      `${selectFrom(def)} ${whereSql} ORDER BY ${orderSql} LIMIT ${pageSize} OFFSET ${offset}`
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
    const row = await findByDocumentId(c.env.DB, def, c.req.param('documentId'))
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
      const { values, sideValues } = pickAllowedFields(key, payload, localeQuery)
      const columns = ['document_id', 'created_at', 'updated_at']
      const placeholders = ['?1', '?2', '?3']
      const binds: unknown[] = [generateDocumentId(), now, now]
      // 视图集合：判别列由服务端落值，不接受客户端指定
      if (def.fixedFilter) {
        columns.push(def.fixedFilter.column)
        placeholders.push(`?${binds.length + 1}`)
        binds.push(def.fixedFilter.value)
      }
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

      await upsertSideRow(c.env.DB, def, result.meta.last_row_id as number, sideValues)

      const row = await findByDocumentId(c.env.DB, def, binds[0] as string)
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

    const existing = await findByDocumentId(c.env.DB, def, documentId)
    if (!existing) return fail(404, 'not_found')

    try {
      const { values, sideValues } = pickAllowedFields(key, payload, localeQuery)
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

      await upsertSideRow(c.env.DB, def, existing.id, sideValues)

      const row = await findByDocumentId(c.env.DB, def, documentId)
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

    const existing = await findByDocumentId(c.env.DB, def, documentId)
    if (!existing) return fail(404, 'not_found')

    // 按主键删：existing 已经过固定过滤器校验，副表由外键 ON DELETE CASCADE 清理
    await c.env.DB.prepare(`DELETE FROM ${def.table} WHERE id = ?1`).bind(existing.id).run()
    await recordAuditLog(c, { action: 'delete', targetCollection: key, targetDocumentId: documentId })
    return ok({ success: true })
  })
}

/** 1:1 副表 upsert；没有副表或本次没有副表字段时是 no-op。 */
async function upsertSideRow(
  db: D1Database,
  def: CollectionDef,
  rowId: number,
  sideValues: Record<string, string | number | null>
): Promise<void> {
  const side = def.sideTable
  if (!side || Object.keys(sideValues).length === 0) return

  const columns = [side.fk, ...Object.keys(sideValues)]
  const binds: unknown[] = [rowId, ...Object.values(sideValues)]
  const placeholders = columns.map((_, i) => `?${i + 1}`)
  const updates = Object.keys(sideValues).map((col) => `${col} = excluded.${col}`)

  await db
    .prepare(
      `INSERT INTO ${side.table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})
       ON CONFLICT(${side.fk}) DO UPDATE SET ${updates.join(', ')}`
    )
    .bind(...binds)
    .run()
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
