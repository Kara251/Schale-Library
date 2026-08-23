/**
 * 批量操作：POST /panel/bulk-action {collection, action, ids[]}
 * publish / unpublish / delete / set-student-organization
 * 返回 { success, updated, failed, errors[] }，逐条容错。
 */
import type { Context } from 'hono'
import { fail, ok } from '../lib/respond'
import { COLLECTIONS } from './collections'
import { recordAuditLog, type AuditAction } from './audit'

interface BulkBody {
  collection?: unknown
  action?: unknown
  ids?: unknown
  organization?: unknown
  locale?: unknown
}

export async function handleBulkAction(
  c: Context<{ Bindings: { DB: D1Database }; Variables: Record<string, never> }>
): Promise<Response> {
  let body: BulkBody
  try {
    body = (await c.req.json()) as BulkBody
  } catch {
    return fail(400, 'invalid_request')
  }

  const collectionKey = typeof body.collection === 'string' ? body.collection : ''
  if (!Object.hasOwn(COLLECTIONS, collectionKey)) return fail(404, 'unknown_collection')
  const def = COLLECTIONS[collectionKey]
  if (def.readOnly) return fail(400, 'read_only_collection')

  const action = typeof body.action === 'string' ? body.action : ''
  if (!['publish', 'unpublish', 'delete', 'set-student-organization'].includes(action)) {
    return fail(400, 'unsupported_bulk_action')
  }
  if ((action === 'publish' || action === 'unpublish') && !def.supportsDraft) {
    return fail(400, 'collection_does_not_support_draft')
  }

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return fail(400, 'ids_required')
  }
  const documentIds = body.ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
  if (documentIds.length === 0) {
    return fail(400, 'ids_invalid')
  }

  const organization =
    action === 'set-student-organization'
      ? typeof body.organization === 'string'
        ? body.organization
        : ''
      : undefined
  if (action === 'set-student-organization' && collectionKey !== 'students') {
    return fail(400, 'action_only_for_students')
  }

  const now = Date.now()
  const errors: string[] = []
  let updated = 0

  for (const documentId of documentIds) {
    try {
      if (action === 'delete') {
        const result = await c.env.DB.prepare(`DELETE FROM ${def.table} WHERE document_id = ?1`)
          .bind(documentId)
          .run()
        if (!result.meta.changes) throw new Error('not_found')
        updated++
      } else if (action === 'set-student-organization') {
        const result = await c.env.DB.prepare(`UPDATE ${def.table} SET organization = ?1, updated_at = ?2 WHERE document_id = ?3`)
          .bind(organization, now, documentId)
          .run()
        // 不存在的 document_id：changes=0 → 计入 failed（对齐旧后端逐条报错语义）
        if (!result.meta.changes) throw new Error('not_found')
        updated++
      } else {
        // publish → published_at = now；unpublish → published_at = NULL
        const published = action === 'publish' ? now : null
        const result = await c.env.DB.prepare(`UPDATE ${def.table} SET published_at = ?1, updated_at = ?2 WHERE document_id = ?3`)
          .bind(published, now, documentId)
          .run()
        if (!result.meta.changes) throw new Error('not_found')
        updated++
      }
    } catch (error) {
      errors.push(`#${documentId}: ${(error as Error).message}`)
    }
  }

  const auditAction: AuditAction =
    action === 'publish' ? 'publish' : action === 'delete' ? 'delete' : 'update'
  await recordAuditLog(c as never, {
    action: auditAction,
    targetCollection: collectionKey,
    payloadSummary: `批量 ${action}: 成功 ${updated}/${documentIds.length}`,
  })

  return ok({
    success: errors.length === 0,
    updated,
    failed: errors.length,
    errors,
  })
}
