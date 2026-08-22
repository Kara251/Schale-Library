/**
 * 夏莱 Server 入口：Hono 应用挂载公开内容 API 与 /panel 面板 API。
 * 契约来源：frontend/tests/contracts/（W3 冻结快照），实现必须逐条对拍。
 */
import { Hono } from 'hono'

export interface Env {
  DB: D1Database
  UPLOADS: R2Bucket
  ENVIRONMENT: string
  SESSION_SECRET: string
  PANEL_INTERNAL_TOKEN?: string
}

const app = new Hono<{ Bindings: Env }>()

app.get('/healthz', (c) => c.json({ ok: true, env: c.env.ENVIRONMENT }))

// 公开内容 API 与 /panel 路由由各域模块挂载（实现中）
// app.route('/', contentRoutes)
// app.route('/panel', panelRoutes)

export default app
