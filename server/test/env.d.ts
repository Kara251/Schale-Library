/**
 * cloudflare:test 环境类型：声明 d1Databases 绑定（vitest.config.ts: d1Databases: ['DB']）。
 */
declare module 'cloudflare:test' {
  interface ProvidedEnv {
    DB: D1Database
    UPLOADS?: R2Bucket
    ENVIRONMENT?: string
    SESSION_SECRET?: string
    PANEL_INTERNAL_TOKEN?: string
    BOOTSTRAP_ADMIN_USERNAME?: string
    BOOTSTRAP_ADMIN_PASSWORD?: string
    ADMIN_PANEL_ALLOWED_ROLES?: string
  }
}
