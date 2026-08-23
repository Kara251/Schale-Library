/**
 * 内容质检：
 * - POST /panel/quality-scan：空字段 / 死链（无效 URL）检测，
 *   结果写 content_quality_issues（带 batch_id），先删同 collection 旧批次。
 * - GET /panel/content-quality-issues?collection=：分页查询。
 */
import type { Context } from 'hono'
import { fail, ok, okPaginated, paginationOf } from '../lib/respond'
import { COLLECTIONS } from './collections'
import { recordAuditLog } from './audit'

interface QualityIssueRow {
  issue_type: string
  severity: string
  status: string
  collection: string
  target_document_id: string | null
  message: string
}

interface IssueDraft {
  issueType: string
  severity?: 'info' | 'warning' | 'error'
  collection: string
  targetDocumentId: string | null
  message: string
}

function isUsableUrl(value: unknown): boolean {
  const text = String(value ?? '').trim()
  if (!text) return false
  try {
    const parsed = new URL(text)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

/** 各集合的空字段/死链检测规则。 */
function scanCollection(collectionKey: string, rows: Array<Record<string, unknown>>): IssueDraft[] {
  const issues: IssueDraft[] = []
  for (const row of rows) {
    const documentId = typeof row.document_id === 'string' ? row.document_id : null

    if (collectionKey === 'events') {
      if (!row.cover_image_url) {
        issues.push({ issueType: 'missing-image', severity: 'warning', collection: collectionKey, targetDocumentId: documentId, message: '活动缺少封面图' })
      }
      if (!row.link) {
        issues.push({ issueType: 'missing-link', severity: 'warning', collection: collectionKey, targetDocumentId: documentId, message: '活动缺少外链' })
      } else if (!isUsableUrl(row.link)) {
        issues.push({ issueType: 'dead-link', severity: 'error', collection: collectionKey, targetDocumentId: documentId, message: '活动外链不是有效 URL' })
      }
      if (row.source_url && !isUsableUrl(row.source_url)) {
        issues.push({ issueType: 'dead-link', severity: 'error', collection: collectionKey, targetDocumentId: documentId, message: '活动信源链接不是有效 URL' })
      }
      if (row.ticket_url && !isUsableUrl(row.ticket_url)) {
        issues.push({ issueType: 'dead-link', severity: 'error', collection: collectionKey, targetDocumentId: documentId, message: '活动票务链接不是有效 URL' })
      }
      if (!row.title_json) {
        issues.push({ issueType: 'empty-field', severity: 'error', collection: collectionKey, targetDocumentId: documentId, message: '活动缺少标题' })
      }
    } else if (collectionKey === 'students') {
      if (!row.avatar_url) {
        issues.push({ issueType: 'missing-image', severity: 'info', collection: collectionKey, targetDocumentId: documentId, message: '学生缺少头像' })
      }
      if (!row.school_id) {
        issues.push({ issueType: 'empty-field', severity: 'info', collection: collectionKey, targetDocumentId: documentId, message: '学生缺少学院关联' })
      }
      if (!row.name) {
        issues.push({ issueType: 'empty-field', severity: 'error', collection: collectionKey, targetDocumentId: documentId, message: '学生缺少姓名' })
      }
    } else if (collectionKey === 'announcements') {
      if (!row.title_json) {
        issues.push({ issueType: 'empty-field', severity: 'error', collection: collectionKey, targetDocumentId: documentId, message: '公告缺少标题' })
      }
      if (!row.content_json) {
        issues.push({ issueType: 'empty-field', severity: 'warning', collection: collectionKey, targetDocumentId: documentId, message: '公告缺少正文' })
      }
      if (row.link && !isUsableUrl(row.link)) {
        issues.push({ issueType: 'dead-link', severity: 'error', collection: collectionKey, targetDocumentId: documentId, message: '公告跳转链接不是有效 URL' })
      }
    } else if (collectionKey === 'friend-links') {
      if (!row.icon_url) {
        issues.push({ issueType: 'missing-image', severity: 'info', collection: collectionKey, targetDocumentId: documentId, message: '友情链接缺少图标' })
      }
      if (!row.url) {
        issues.push({ issueType: 'missing-link', severity: 'error', collection: collectionKey, targetDocumentId: documentId, message: '友情链接缺少跳转链接' })
      } else if (!isUsableUrl(row.url)) {
        issues.push({ issueType: 'dead-link', severity: 'error', collection: collectionKey, targetDocumentId: documentId, message: '友情链接不是有效 URL' })
      }
      if (!row.title_json) {
        issues.push({ issueType: 'empty-field', severity: 'error', collection: collectionKey, targetDocumentId: documentId, message: '友情链接缺少标题' })
      }
    }

    if (!row.published_at) {
      issues.push({ issueType: 'draft', severity: 'info', collection: collectionKey, targetDocumentId: documentId, message: '仍处于草稿状态' })
    }
  }
  return issues
}

export async function handleQualityScan(
  c: Context<{ Bindings: { DB: D1Database }; Variables: Record<string, never> }>
): Promise<Response> {
  try {
    const batchId = crypto.randomUUID()
    let count = 0

    for (const [key, def] of Object.entries(COLLECTIONS)) {
      if (!['events', 'students', 'announcements', 'friend-links'].includes(key)) continue
      const { results } = await c.env.DB.prepare(`SELECT * FROM ${def.table}`).all<Record<string, unknown>>()
      const drafts = scanCollection(key, results)

      // 先清同 collection 旧批次，再写新批次
      await c.env.DB.prepare('DELETE FROM content_quality_issues WHERE collection = ?1').bind(key).run()

      for (const draft of drafts) {
        await c.env.DB.prepare(
          `INSERT INTO content_quality_issues (issue_type, collection, target_document_id, detail_json, batch_id, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
        )
          .bind(draft.issueType, draft.collection, draft.targetDocumentId, JSON.stringify({ severity: draft.severity ?? 'warning', message: draft.message }), batchId, Date.now())
          .run()
        count++
      }
    }

    await recordAuditLog(c as never, {
      action: 'update',
      targetCollection: 'content-quality-issues',
      payloadSummary: `内容质量扫描完成，发现 ${count} 个问题`,
    })

    return ok({ success: true, count })
  } catch (error) {
    return fail(400, `scan_failed:${(error as Error).message}`)
  }
}

export async function handleQualityIssuesList(
  c: Context<{ Bindings: { DB: D1Database }; Variables: Record<string, never> }>
): Promise<Response> {
  const page = Math.max(1, Number(c.req.query('page') || '1') || 1)
  const pageSize = Math.min(100, Math.max(1, Number(c.req.query('pageSize') || '20') || 20))

  const where: string[] = []
  const binds: unknown[] = []
  const collectionFilter = c.req.query('collection')
  if (collectionFilter && collectionFilter !== 'all') {
    where.push(`collection = ?${binds.length + 1}`)
    binds.push(collectionFilter)
  }
  const issueType = c.req.query('issueType')
  if (issueType && issueType !== 'all') {
    where.push(`issue_type = ?${binds.length + 1}`)
    binds.push(issueType)
  }
  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''

  const totalRow = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM content_quality_issues ${whereSql}`)
    .bind(...binds)
    .first<{ n: number }>()
  const total = totalRow?.n ?? 0

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM content_quality_issues ${whereSql} ORDER BY created_at DESC LIMIT ?${binds.length + 1} OFFSET ?${binds.length + 2}`
  )
    .bind(...binds, pageSize, (page - 1) * pageSize)
    .all<{
      id: number
      issue_type: string
      severity: string | null
      status: string | null
      collection: string
      target_document_id: string | null
      detail_json: string | null
      batch_id: string | null
      created_at: number
    }>()

  interface QualityIssueRow {
    issueType: string
    severity: string
    status: string
    collection: string
    message: string
  }



  const data = results.map((row): QualityIssueRow & Record<string, unknown> => {
    let severity = row.severity ?? 'warning'
    let message = ''
    try {
      const detail = row.detail_json ? (JSON.parse(row.detail_json) as { severity?: string; message?: string }) : null
      if (detail?.severity) severity = detail.severity
      if (detail?.message) message = detail.message
    } catch {
      // detail 非法时保持默认
    }
    const payload: QualityIssueRow & Record<string, unknown> = {
      issueType: row.issue_type,
      severity,
      status: row.status ?? 'open',
      collection: row.collection,
      message,
      id: String(row.id),
      documentId: row.batch_id ?? String(row.id),
      targetDocumentId: row.target_document_id,
      createdAt: new Date(row.created_at).toISOString(),
    }
    return payload
  })

  return okPaginated(data, paginationOf(page, pageSize, total))
}
