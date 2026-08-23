/**
 * 审计日志：所有写操作插入 admin_audit_logs。
 * 失败不阻断主流程（对齐旧后端 recordAdminAuditLog 的 try/catch 语义）。
 */
import type { Context } from 'hono'
import type { PanelEnv, PanelVars } from './types'

export type AuditAction = 'create' | 'update' | 'delete' | 'upload' | 'publish' | 'unpublish' | 'login' | 'logout'

export async function recordAuditLog(
  c: Context<{ Bindings: PanelEnv; Variables: PanelVars }>,
  input: {
    action: AuditAction
    targetCollection?: string
    targetDocumentId?: string
    payloadSummary?: string
  }
): Promise<void> {
  const user = c.get('panelUser') as { username?: string } | undefined
  try {
    await c.env.DB.prepare(
      'INSERT INTO admin_audit_logs (action, target_collection, target_document_id, payload_summary, actor_username, ip, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)'
    )
      .bind(
        input.action,
        input.targetCollection ?? null,
        input.targetDocumentId ?? null,
        input.payloadSummary ?? null,
        user?.username ?? null,
        c.req.header('CF-Connecting-IP')?.trim() || 'unknown',
        Date.now()
      )
      .run()
  } catch {
    // 审计失败不阻断业务请求（与旧后端一致），仅吞掉异常
  }
}
