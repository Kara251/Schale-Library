# W4 实现契约（所有子代理必须遵守）

## 项目
server/ 目录 = Hono Worker 新后端，替换 Strapi。D1 + 可选 R2。
契约快照：frontend/tests/contracts/*.ts —— 响应 JSON 形状必须与快照 `consume` 字段对齐。

## 共享设施（主代理提供，直接 import 用）
- `src/lib/db.ts`: `export function getDb(env: Env): D1Database` → 直接用 env.DB 也行
- `src/lib/i18n.ts`: `pickLocale(json: string | null, locale: string): string` — 解析 i18n JSON 列，回退 zh-Hans → en → ja → 首个非空；非 JSON 原样返回
- `src/lib/respond.ts`: `ok(data, meta?)`, `fail(status, code)` — 输出 Strapi 风格 `{ data, meta }`

## 查询语义（Strapi 兼容子集）
- 列表端点支持：`locale`、`pagination[page|pageSize]`、`sort=field:asc|desc`、
  `filters[field][$eq|$containsi|$in]=...`、`populate[relation]=true`
- 只需实现 frontend/tests/contracts 快照中实际出现的参数组合，不必通用化
- published 过滤：`WHERE published_at IS NOT NULL`（草稿不出现在公开 API）
- documentId 是对外 ID（GET by id 用它）；数字 id 仅内部

## 禁止
- 不要改 frontend/ 下任何文件
- 不要 git commit
- 不要引入新依赖（hono/drizzle-orm 已装；需要别的先在报告里说明）
- 不要动其他代理负责的目录

## 验证
每个代理完成时必须：`cd server && npx tsc --noEmit` 零错误 +
`pnpm test` 自己域的测试文件全绿（用 @cloudflare/vitest-pool-workers 的本地 D1，
测试内先执行 migrations/0001_baseline.sql 建表再插种子数据）。
