/**
 * /panel 域共享类型。面板路由使用结构化最小绑定，
 * 由入口 index.ts 的 Env 结构化满足，避免反向依赖入口文件。
 */
import type { Hono } from 'hono'

export interface PanelEnv {
  DB: D1Database
  UPLOADS?: R2Bucket
  ENVIRONMENT?: string
  SESSION_SECRET?: string
  BOOTSTRAP_ADMIN_USERNAME?: string
  BOOTSTRAP_ADMIN_PASSWORD?: string
  ADMIN_PANEL_ALLOWED_ROLES?: string
}

export interface PanelUser {
  id: number
  username: string
  email: string | null
  role: string
}

export interface PanelVars {
  panelUser: PanelUser
  sessionToken: string
}

export type HonoPanel = Hono<{ Bindings: PanelEnv; Variables: PanelVars }>
