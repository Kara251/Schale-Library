/**
 * 夏莱 Server 入口：Hono 应用挂载公开内容 API 与 /panel 面板 API。
 * 契约来源：frontend/tests/contracts/（W3 冻结快照），实现必须逐条对拍。
 */
import { Hono } from 'hono'
import { createPanelRoutes } from './panel/router'

export interface Env {
  DB: D1Database
  UPLOADS: R2Bucket
  ENVIRONMENT: string
  SESSION_SECRET: string
  PANEL_INTERNAL_TOKEN?: string
  BOOTSTRAP_ADMIN_USERNAME?: string
  BOOTSTRAP_ADMIN_PASSWORD?: string
  ADMIN_PANEL_ALLOWED_ROLES?: string
}

const app = new Hono<{ Bindings: Env }>()

app.get('/healthz', (c) => c.json({ ok: true, env: c.env.ENVIRONMENT }))

// 全部业务路由挂在 /api 下：契约快照（frontend/tests/contracts）里的端点一律带此前缀，
// 前端 fetchAPI 也固定拼 `${API_URL}/api${endpoint}`。
// /panel 面板 API（认证会话 + 兼容层，PanelAuth 域）
app.route('/api', createPanelRoutes())

// 公开内容 API（events/works/students/misc 域，ContentApiA）
import { eventsRoutes } from './content/events'
import { worksRoutes } from './content/works'
import { studentsRoutes } from './content/students'
import { miscRoutes } from './content/misc'
import { creatorsRoutes } from './content/creators'

app.route('/api', eventsRoutes)
app.route('/api', worksRoutes)
app.route('/api', studentsRoutes)
app.route('/api', miscRoutes)
app.route('/api', creatorsRoutes)

// 考据域公开 API（research 域，ContentApiB）
import { researchRoutes } from './content/research'

app.route('/api', researchRoutes)

export default app
