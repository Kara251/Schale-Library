/**
 * /panel 面板路由总装。
 * 中间件顺序：bootstrap（幂等）→ login/session/logout 白名单放行 → 其余全部会话校验 fail-closed。
 */
import { Hono } from 'hono'
import type { Context, Next } from 'hono'
import type { HonoPanel, PanelEnv, PanelVars } from './types'
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
import { handleCuratorGet, handleCuratorPut } from './curator'
import { handleDashboard } from './dashboard'
import {
  handleMeGet,
  handleMeUpdate,
  handleMePassword,
  handleUserList,
  handleUserCreate,
  handleUserUpdate,
  handleUserResetPassword,
  handleUserDelete,
} from './users'

export function createPanelRoutes(): HonoPanel {
  const panel: HonoPanel = new Hono()

  // bootstrap 维护账号：环境变量存在且 users 表空时创建（幂等，请求级触发）
  // 只挂认证与面板路径：公开内容 API 不该为此付一次 users 计数查询
  const bootstrapMiddleware = async (
    c: Context<{ Bindings: PanelEnv; Variables: PanelVars }>,
    next: Next
  ) => {
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
  }
  panel.use('/panel/*', bootstrapMiddleware)
  panel.use('/auth/*', bootstrapMiddleware)

  // 认证路由：无需会话
  panel.route('/', authRoutes)

  // 其余 /panel/* 全部会话校验 fail-closed
  panel.use('/panel/*', async (c, next) => {
    const errorResponse = await requirePanelSession(c as never, next)
    return errorResponse ?? undefined
  })

  panel.post('/panel/bulk-action', (c) => handleBulkAction(c as never))
  // 契约路径是 /panel/quality/issues 与 /panel/quality/scan（见 frontend/tests/contracts）；
  // 连字符那套是旧命名，保留为别名
  panel.get('/panel/quality/issues', (c) => handleQualityIssuesList(c as never))
  panel.post('/panel/quality/scan', (c) => handleQualityScan(c as never))
  panel.get('/panel/content-quality-issues', (c) => handleQualityIssuesList(c as never))
  panel.post('/panel/quality-scan', (c) => handleQualityScan(c as never))
  // 契约（getSystemHealth）走 /panel/system/health；/panel/system-health 保留为旧别名
  panel.get('/panel/system/health', (c) => handleSystemHealth(c as never))
  panel.get('/panel/system-health', (c) => handleSystemHealth(c as never))
  panel.get('/panel/admin-audit-logs/export', (c) => handleAuditLogExport(c as never))
  panel.get('/panel/admin-audit-logs', (c) => handleAuditLogList(c as never))
  panel.post('/panel/upload', (c) => handleUpload(c as never))

  // 仪表盘计数：一次请求取回全部集合总数（此前是每集合一次列表请求）
  panel.get('/panel/dashboard', (c) => handleDashboard(c as never))

  // 个人设置：任何已登录维护者都可用
  panel.get('/panel/users/me', (c) => handleMeGet(c as never))
  panel.put('/panel/users/me', (c) => handleMeUpdate(c as never))
  panel.post('/panel/users/me/password', (c) => handleMePassword(c as never))

  // 用户管理：仅 admin（在处理函数里强制，不依赖前端隐藏入口）
  // 注意顺序：/users/me 必须先于 /users/:id 注册，否则 me 会被当成 id 吞掉
  panel.get('/panel/users', (c) => handleUserList(c as never))
  panel.post('/panel/users', (c) => handleUserCreate(c as never))
  panel.put('/panel/users/:id', (c) => handleUserUpdate(c as never))
  panel.post('/panel/users/:id/password', (c) => handleUserResetPassword(c as never))
  panel.delete('/panel/users/:id', (c) => handleUserDelete(c as never))

  // 考据策展 singleType（不走通用 CRUD：单行表 id 恒为 1）
  panel.get('/panel/research-curator', (c) => handleCuratorGet(c as never))
  panel.put('/panel/research-curator', (c) => handleCuratorPut(c as never))

  registerCrudRoutes(panel)

  return panel
}

