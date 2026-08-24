/**
 * 通用集合 CRUD：GET/POST /panel/:collection、GET/PUT/DELETE /panel/:collection/:documentId。
 * 集合白名单（collections.ts）+ 字段白名单（input-schema.ts）双重校验。
 * 对外 ID 一律 documentId；数字 id 仅内部使用。
 */
import type { HonoPanel } from './types'
import { fail, ok, okPaginated, paginationOf } from '../lib/respond'
import { pickLocale } from '../lib/i18n'
import { publishStatusOf } from '../lib/published'
import { COLLECTIONS, isPanelCollection } from './collections'
import type { CollectionDef, FieldDef } from './collections'
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
    // 三态：草稿 / 已排期（时间未到）/ 已发布
    status: publishStatusOf(row.published_at),
  }

  const allFields = { ...def.fields, ...(def.sideTable?.fields ?? {}) }
  for (const [fieldName, field] of Object.entries(allFields)) {
    if (field.kind === 'published-at') continue
    const raw = row[field.column]
    if (field.localized) {
      out[fieldName] = typeof raw === 'string' ? pickLocale(raw, locale) : ''
    } else if (field.relationTable) {
      // JOIN 出来的 documentId；关联为空时是 null
      out[fieldName] = row[relationDocAlias(field.column)] ?? null
    } else {
      out[fieldName] = raw ?? null
    }
  }
  return out
}

/** 关联字段列表（带目标表的 relation-*）。 */
function relationFields(def: CollectionDef): Array<[string, string, string]> {
  return Object.entries(def.fields)
    .filter(([, f]) => Boolean(f.relationTable))
    .map(([name, f], index) => [name, f.column, `r${index}`] as [string, string, string])
}

/** 有任何 JOIN 时主表必须起别名 t，否则列名有歧义。 */
function needsAlias(def: CollectionDef): boolean {
  return Boolean(def.sideTable) || relationFields(def).length > 0
}

/** 关联字段解析出的 documentId 在结果集里的列名。 */
function relationDocAlias(column: string): string {
  return `${column}__doc`
}

/**
 * 主表 SELECT。副表 LEFT JOIN 拉平（列名与主表不重名）；
 * 关联字段再 LEFT JOIN 一次目标表，把数字外键还原成 documentId ——
 * 面板对外只认 documentId，直接把外键数字丢出去的话，编辑器里的关联选择器
 * 匹配不到任何选项，等于每次编辑都清空关联。
 */
function selectFrom(def: CollectionDef): string {
  if (!needsAlias(def)) return `SELECT * FROM ${def.table}`

  const cols = ['t.*']
  const joins: string[] = []

  if (def.sideTable) {
    cols.push(...Object.values(def.sideTable.fields).map((f) => `s.${f.column}`))
    joins.push(`LEFT JOIN ${def.sideTable.table} s ON s.${def.sideTable.fk} = t.id`)
  }

  for (const [fieldName, column, alias] of relationFields(def)) {
    const target = def.fields[fieldName]!.relationTable!
    cols.push(`${alias}.document_id AS ${relationDocAlias(column)}`)
    joins.push(`LEFT JOIN ${target} ${alias} ON ${alias}.id = t.${column}`)
  }

  return `SELECT ${cols.join(', ')} FROM ${def.table} t ${joins.join(' ')}`
}

/** 固定过滤器的 WHERE 子句；无过滤器返回 null。列名在 selectFrom 有 JOIN 时需带 t. 前缀。 */
function fixedWhere(def: CollectionDef, qualified: boolean): { sql: string; value: string } | null {
  if (!def.fixedFilter) return null
  const col = qualified && needsAlias(def) ? `t.${def.fixedFilter.column}` : def.fixedFilter.column
  return { sql: col, value: def.fixedFilter.value }
}

/**
 * slug 转写：仅保留 ASCII 字母数字，其余折叠为连字符。
 * 纯中文等转写后为空的情况由调用方回退到 documentId（本身就唯一）。
 */
function slugify(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/**
 * 按 autoSlug 配置补齐 slug 列。已显式提供值时不覆盖。
 * 重名时接 documentId 前 8 位，保证唯一而不必重试。
 */
async function fillAutoSlug(
  db: D1Database,
  def: CollectionDef,
  values: Record<string, string | number | null>,
  payload: Record<string, unknown>,
  documentId: string
): Promise<void> {
  const config = def.autoSlug
  if (!config) return

  const existingValue = values[config.column]
  if (typeof existingValue === 'string' && existingValue.trim()) return

  const base = slugify(payload[config.from])
  let slug = base || documentId

  const taken = await db
    .prepare(`SELECT 1 AS hit FROM ${def.table} WHERE ${config.column} = ?1`)
    .bind(slug)
    .first<{ hit: number }>()
  if (taken) slug = `${slug}-${documentId.slice(0, 8)}`

  values[config.column] = slug
}

/** 随机 documentId，对齐 Strapi 24 位十六进制格式。 */
function generateDocumentId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 24)
}

/**
 * documentId 查单条。固定过滤器一并生效 —— 否则 online-events 能读写到 offline 的行。
 */
async function findByDocumentId(db: D1Database, def: CollectionDef, documentId: string): Promise<RowRecord | null> {
  const docCol = needsAlias(def) ? 't.document_id' : 'document_id'
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
    const q = (col: string) => (needsAlias(def) ? `t.${col}` : col)

    const fixed = fixedWhere(def, true)
    if (fixed) {
      binds.push(fixed.value)
      where.push(`${fixed.sql} = ?${binds.length}`)
    }

    const status = c.req.query('status')
    if (status === 'published') {
      binds.push(Date.now())
      where.push(`${q('published_at')} IS NOT NULL AND ${q('published_at')} <= ?${binds.length}`)
    } else if (status === 'scheduled') {
      binds.push(Date.now())
      where.push(`${q('published_at')} IS NOT NULL AND ${q('published_at')} > ?${binds.length}`)
    } else if (status === 'draft') {
      where.push(`${q('published_at')} IS NULL`)
    }

    const search = c.req.query('search')?.trim()
    if (search) {
      binds.push(`%${search.toLowerCase()}%`)
      const clauses = def.searchColumns.map((col) => `LOWER(${q(col)}) LIKE ?${binds.length}`)
      if (clauses.length > 0) where.push(`(${clauses.join(' OR ')})`)
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
    const orderSql = def.defaultSort.map(([col, dir]) => `${q(col)} ${dir.toUpperCase()}`).join(', ')
    const countFrom = needsAlias(def) ? `${def.table} t` : def.table
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
    const locale = mapLocale(c.req.query('locale'))
    // 关联数据只在单条读取时加载：列表页不展示它们，逐行加载会退化成 N+1
    return ok({
      ...serializeRow(key, row, locale),
      ...(await loadJoins(c.env.DB, def, row.id)),
      ...(await loadChildren(c.env.DB, def, row.id, locale)),
    })
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
      const { columnPayload, relationalPayload } = splitRelationalPayload(def, payload)
      const { values, sideValues } = pickAllowedFields(key, columnPayload, localeQuery)
      await resolveRelationColumns(c.env.DB, def, values)
      syncActiveColumn(def, values, payload)
      const documentId = generateDocumentId()
      await fillAutoSlug(c.env.DB, def, values, payload, documentId)
      const columns = ['document_id', 'created_at', 'updated_at']
      const placeholders = ['?1', '?2', '?3']
      const binds: unknown[] = [documentId, now, now]
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

      const newRowId = result.meta.last_row_id as number
      await upsertSideRow(c.env.DB, def, newRowId, sideValues)
      await replaceJoins(c.env.DB, def, newRowId, relationalPayload)
      await replaceChildren(c.env.DB, def, newRowId, relationalPayload)

      const row = await findByDocumentId(c.env.DB, def, binds[0] as string)
      const createdLocale = mapLocale(localeQuery)
      await recordAuditLog(c, {
        action: 'create',
        targetCollection: key,
        targetDocumentId: binds[0] as string,
        payloadSummary: summarizePayload(payload),
      })
      return ok(
        row
          ? {
              ...serializeRow(key, row, createdLocale),
              ...(await loadJoins(c.env.DB, def, row.id)),
              ...(await loadChildren(c.env.DB, def, row.id, createdLocale)),
            }
          : {}
      )
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
      const { columnPayload, relationalPayload } = splitRelationalPayload(def, payload)
      const { values, sideValues } = pickAllowedFields(key, columnPayload, localeQuery)
      await resolveRelationColumns(c.env.DB, def, values)
      syncActiveColumn(def, values, payload)
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
      await replaceJoins(c.env.DB, def, existing.id, relationalPayload)
      await replaceChildren(c.env.DB, def, existing.id, relationalPayload)

      const row = await findByDocumentId(c.env.DB, def, documentId)
      const updatedLocale = mapLocale(localeQuery)
      await recordAuditLog(c, {
        action: 'update',
        targetCollection: key,
        targetDocumentId: documentId,
        payloadSummary: summarizePayload(payload),
      })
      return ok(
        row
          ? {
              ...serializeRow(key, row, updatedLocale),
              ...(await loadJoins(c.env.DB, def, row.id)),
              ...(await loadChildren(c.env.DB, def, row.id, updatedLocale)),
            }
          : {}
      )
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

/**
 * 「启用」列跟随发布状态写入。
 * 两者对维护者是同一件事（内容是否对外可见），面板只暴露一个发布控件，
 * 这里保证底层两列不会走岔 —— 否则会出现「已发布但站点上看不到」。
 */
function syncActiveColumn(
  def: CollectionDef,
  values: Record<string, string | number | null>,
  payload: Record<string, unknown>
): void {
  if (!def.activeColumn) return
  // 本次没有触碰发布状态就不动它
  if (!('publishedAt' in payload)) return
  const publishedAt = values.published_at
  values[def.activeColumn] = publishedAt === null || publishedAt === undefined ? 0 : 1
}

/**
 * 把 joins / children 字段从主表 payload 里摘出来。
 * 它们不是主表的列，留在 payload 里会被字段白名单判为未登记字段直接 400 ——
 * 考据域整域存不进去就是卡在这一步。
 */
function splitRelationalPayload(
  def: CollectionDef,
  payload: Record<string, unknown>
): { columnPayload: Record<string, unknown>; relationalPayload: Record<string, unknown> } {
  const relationalKeys = new Set([...Object.keys(def.joins ?? {}), ...Object.keys(def.children ?? {})])
  const columnPayload: Record<string, unknown> = {}
  const relationalPayload: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (relationalKeys.has(key)) relationalPayload[key] = value
    else columnPayload[key] = value
  }
  return { columnPayload, relationalPayload }
}

/**
 * 关联字段：把 documentId 解析成目标表的数字外键。
 * 面板对外只有 documentId 一种 ID，而外键指向的是数字主键。
 * 已经是数字的原样保留（直接传内部 id 的调用方仍可用）。
 * 目标行不存在 → 抛 FieldValidationError，落成 400 而不是 FK 约束错。
 */
async function resolveRelationColumns(
  db: D1Database,
  def: CollectionDef,
  values: Record<string, string | number | null>
): Promise<void> {
  for (const [fieldName, field] of Object.entries(def.fields)) {
    if (!field.relationTable) continue
    const raw = values[field.column]
    if (raw === null || raw === undefined || typeof raw === 'number') continue

    const row = await db
      .prepare(`SELECT id FROM ${field.relationTable} WHERE document_id = ?1`)
      .bind(raw)
      .first<{ id: number }>()
    if (!row) {
      throw new FieldValidationError(`关联对象不存在: ${raw}`, fieldName)
    }
    values[field.column] = row.id
  }
}

/**
 * 读取多对多连接：返回目标行的 documentId 数组。
 * 面板对外只认 documentId，连接表里存的是数字主键。
 */
async function loadJoins(
  db: D1Database,
  def: CollectionDef,
  rowId: number
): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {}
  for (const [fieldName, join] of Object.entries(def.joins ?? {})) {
    const { results } = await db
      .prepare(
        `SELECT t.document_id AS doc FROM ${join.table} j
         JOIN ${join.targetTable} t ON t.id = j.${join.targetKey}
         WHERE j.${join.selfKey} = ?1
         ORDER BY t.id`
      )
      .bind(rowId)
      .all<{ doc: string }>()
    out[fieldName] = (results ?? []).map((r) => r.doc)
  }
  return out
}

/** 读取有序子行：返回面板字段名形态的对象数组。 */
async function loadChildren(
  db: D1Database,
  def: CollectionDef,
  rowId: number,
  locale: string
): Promise<Record<string, Array<Record<string, unknown>>>> {
  const out: Record<string, Array<Record<string, unknown>>> = {}
  for (const [fieldName, child] of Object.entries(def.children ?? {})) {
    const order = child.orderColumn ? `ORDER BY ${child.orderColumn} ASC, id ASC` : 'ORDER BY id ASC'
    const { results } = await db
      .prepare(`SELECT * FROM ${child.table} WHERE ${child.fk} = ?1 ${order}`)
      .bind(rowId)
      .all<Record<string, unknown>>()

    out[fieldName] = (results ?? []).map((row) => {
      const item: Record<string, unknown> = {}
      for (const [name, field] of Object.entries(child.fields)) {
        const raw = row[field.column]
        item[name] = field.localized && typeof raw === 'string' ? pickLocale(raw, locale) : (raw ?? null)
      }
      return item
    })
  }
  return out
}

/**
 * 整体替换连接行。面板提交的是完整集合，不是增量 —— 先删后插最直观，
 * 也避免「界面上取消勾选但库里还留着」这类不一致。
 */
async function replaceJoins(
  db: D1Database,
  def: CollectionDef,
  rowId: number,
  payload: Record<string, unknown>
): Promise<void> {
  for (const [fieldName, join] of Object.entries(def.joins ?? {})) {
    if (!(fieldName in payload)) continue
    const raw = payload[fieldName]
    const documentIds = Array.isArray(raw) ? raw.map(String).filter(Boolean) : []

    await db.prepare(`DELETE FROM ${join.table} WHERE ${join.selfKey} = ?1`).bind(rowId).run()
    if (documentIds.length === 0) continue

    const placeholders = documentIds.map((_, i) => `?${i + 1}`).join(',')
    const { results } = await db
      .prepare(`SELECT id FROM ${join.targetTable} WHERE document_id IN (${placeholders})`)
      .bind(...documentIds)
      .all<{ id: number }>()

    if ((results ?? []).length !== documentIds.length) {
      throw new FieldValidationError(`关联对象不存在`, fieldName)
    }
    for (const target of results ?? []) {
      await db
        .prepare(`INSERT INTO ${join.table} (${join.selfKey}, ${join.targetKey}) VALUES (?1, ?2)`)
        .bind(rowId, target.id)
        .run()
    }
  }
}

/** 整体替换子行；顺序按数组下标写入排序列。 */
async function replaceChildren(
  db: D1Database,
  def: CollectionDef,
  rowId: number,
  payload: Record<string, unknown>
): Promise<void> {
  for (const [fieldName, child] of Object.entries(def.children ?? {})) {
    if (!(fieldName in payload)) continue
    const rows = Array.isArray(payload[fieldName]) ? (payload[fieldName] as unknown[]) : []

    await db.prepare(`DELETE FROM ${child.table} WHERE ${child.fk} = ?1`).bind(rowId).run()

    for (const [index, entry] of rows.entries()) {
      if (!entry || typeof entry !== 'object') continue
      const source = entry as Record<string, unknown>

      const columns = [child.fk]
      const binds: unknown[] = [rowId]
      for (const [name, field] of Object.entries(child.fields)) {
        if (!(name in source)) continue
        columns.push(field.column)
        binds.push(normalizeChildValue(field, source[name]))
      }
      if (child.orderColumn) {
        columns.push(child.orderColumn)
        binds.push(index)
      }
      // 只有外键与排序列时说明该行没有任何内容，跳过
      if (columns.length <= (child.orderColumn ? 2 : 1)) continue

      const placeholders = columns.map((_, i) => `?${i + 1}`).join(', ')
      await db
        .prepare(`INSERT INTO ${child.table} (${columns.join(', ')}) VALUES (${placeholders})`)
        .bind(...binds)
        .run()
    }
  }
}

/** 子行字段的值归一化：localized 文本包成 i18n JSON，其余原样。 */
function normalizeChildValue(field: FieldDef, value: unknown): string | number | null {
  if (value === null || value === undefined || value === '') return null
  if (field.localized) return JSON.stringify({ 'zh-Hans': String(value) })
  if (field.kind === 'number') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return String(value)
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
