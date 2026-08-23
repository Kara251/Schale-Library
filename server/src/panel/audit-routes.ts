/**
 * 审计日志查询与 CSV 导出：
 * - GET /panel/admin-audit-logs：分页
 * - GET /panel/admin-audit-logs/export：CSV 流，公式注入中和（= + - @ 开头前缀 '）
 */
import type { Context } from 'hono'
import { okPaginated, paginationOf } from '../lib/respond'

const EXPORT_MAX_ROWS = 10000

interface AuditRow {
  id: number
  action: string
  target_collection: string | null
  target_document_id: string | null
  payload_summary: string | null
  actor_username: string | null
  ip: string | null
  created_at: number
}

function serializeAuditRow(row: AuditRow): Record<string, unknown> {
  return {
    id: String(row.id),
    documentId: String(row.id),
    action: row.action,
    targetCollection: row.target_collection,
    targetDocumentId: row.target_document_id,
    payloadSummary: row.payload_summary,
    actorUsername: row.actor_username,
    ip: row.ip,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

function buildAuditFilters(c: Context<{ Bindings: { DB: D1Database }; Variables: Record<string, never> }>): {
  whereSql: string
  binds: unknown[]
} {
  const where: string[] = []
  const binds: unknown[] = []

  const action = c.req.query('action')
  if (action && action !== 'all') {
    where.push(`action = ?${binds.length + 1}`)
    binds.push(action)
  }
  const collection = c.req.query('collection')
  if (collection && collection !== 'all') {
    where.push(`target_collection = ?${binds.length + 1}`)
    binds.push(collection)
  }
  const actor = c.req.query('actor')?.trim()
  if (actor) {
    where.push(`LOWER(actor_username) LIKE ?${binds.length + 1}`)
    binds.push(`%${actor.toLowerCase()}%`)
  }
  const from = c.req.query('from')
  if (from) {
    const ms = new Date(from).getTime()
    if (!Number.isNaN(ms)) {
      where.push(`created_at >= ?${binds.length + 1}`)
      binds.push(ms)
    }
  }
  const to = c.req.query('to')
  if (to) {
    const ms = new Date(to).getTime()
    if (!Number.isNaN(ms)) {
      where.push(`created_at <= ?${binds.length + 1}`)
      binds.push(ms)
    }
  }

  return { whereSql: where.length > 0 ? `WHERE ${where.join(' AND ')}` : '', binds }
}

export async function handleAuditLogList(
  c: Context<{ Bindings: { DB: D1Database }; Variables: Record<string, never> }>
): Promise<Response> {
  const page = Math.max(1, Number(c.req.query('page') || '1') || 1)
  const pageSize = Math.min(100, Math.max(1, Number(c.req.query('pageSize') || '20') || 20))
  const { whereSql, binds } = buildAuditFilters(c)

  const totalRow = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM admin_audit_logs ${whereSql}`)
    .bind(...binds)
    .first<{ n: number }>()
  const total = totalRow?.n ?? 0

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM admin_audit_logs ${whereSql} ORDER BY created_at DESC LIMIT ?${binds.length + 1} OFFSET ?${binds.length + 2}`
  )
    .bind(...binds, pageSize, (page - 1) * pageSize)
    .all<AuditRow>()

  return okPaginated(results.map(serializeAuditRow), paginationOf(page, pageSize, total))
}

/** 单元格以 = + - @ 或制表符/回车开头时前缀 ' 中和公式注入。 */
function escapeCsvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`
  }
  return `"${text.replace(/"/g, '""')}"`
}

export async function handleAuditLogExport(
  c: Context<{ Bindings: { DB: D1Database }; Variables: Record<string, never> }>
): Promise<Response> {
  const { whereSql, binds } = buildAuditFilters(c)

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM admin_audit_logs ${whereSql} ORDER BY created_at DESC LIMIT ?${binds.length + 1}`
  )
    .bind(...binds, EXPORT_MAX_ROWS)
    .all<AuditRow>()

  const totalRow = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM admin_audit_logs ${whereSql}`)
    .bind(...binds)
    .first<{ n: number }>()
  const total = totalRow?.n ?? 0

  const header = ['createdAt', 'action', 'actorUsername', 'targetCollection', 'targetDocumentId', 'payloadSummary', 'ip']
  const lines = [
    ...(total > results.length ? [`# Export truncated to ${EXPORT_MAX_ROWS} of ${total} matching rows`] : []),
    header.join(','),
    ...results.map((row) =>
      [
        new Date(row.created_at).toISOString(),
        row.action,
        row.actor_username,
        row.target_collection,
        row.target_document_id,
        row.payload_summary,
        row.ip,
      ]
        .map(escapeCsvCell)
        .join(',')
    ),
  ]

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="admin-audit-logs.csv"',
      'X-Export-Truncated': total > results.length ? 'true' : 'false',
      'Cache-Control': 'no-store',
    },
  })
}
