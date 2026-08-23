/**
 * /panel 面板路由总装。
 * 中间件顺序：bootstrap（幂等）→ login/session/logout 白名单放行 → 其余全部会话校验 fail-closed。
 */
import { Hono } from 'hono'
import type { HonoPanel } from './types'
import { ensureBootstrapAdmin } from '../auth/bootstrap'
import { pruneExpiredSessions } from '../auth/session'
import { requirePanelSession } from '../auth/middleware'
import { authRoutes } from './auth-routes'
import { registerCrudRoutes } from './crud'
import { handleBulkAction } from './bulk'
import { handleQualityScan, handleQualityIssuesList } from './quality'
import { handleSystemHealth } from './system-health'
import { handleAuditLogList, handleAuditLogExport } from './audit-routes'
import { handleUpload } from './upload'

export function createPanelRoutes(): HonoPanel {
  const panel: HonoPanel = new Hono()

  // bootstrap 维护账号：环境变量存在且 users 表空时创建（幂等，请求级触发）
  panel.use('*', async (c, next) => {
    await ensureBootstrapAdmin(
      c.env.DB,
      c.env.BOOTSTRAP_ADMIN_USERNAME,
      c.env.BOOTSTRAP_ADMIN_PASSWORD
    )
    // 顺手清理过期会话（低频写路径可接受）
    if (Math.random() < 0.05) {
      await pruneExpiredSessions(c.env.DB)
    }
    await next()
  })

  // 认证路由：无需会话
  panel.route('/', authRoutes)

  // 其余 /panel/* 全部会话校验 fail-closed
  panel.use('/panel/*', async (c, next) => {
    const errorResponse = await requirePanelSession(c as never, next)
    return errorResponse ?? undefined
  })

  panel.post('/panel/bulk-action', (c) => handleBulkAction(c as never))
  panel.get('/panel/content-quality-issues', (c) => handleQualityIssuesList(c as never))
  panel.post('/panel/quality-scan', (c) => handleQualityScan(c as never))
  panel.get('/panel/system-health', (c) => handleSystemHealth(c as never))
  panel.get('/panel/admin-audit-logs/export', (c) => handleAuditLogExport(c as never))
  panel.get('/panel/admin-audit-logs', (c) => handleAuditLogList(c as never))
  panel.post('/panel/upload', (c) => handleUpload(c as never))

  registerCrudRoutes(panel)

  return panel
}

