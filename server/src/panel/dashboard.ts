/**
 * 面板仪表盘计数：GET /panel/dashboard。
 *
 * 此前前端对每个集合各打一次列表接口（pageSize=1）只为取 total：
 * 13 个集合 = 13 次 HTTP 往返 + 26 条 SQL（每次列表都是 COUNT + SELECT）。
 * 这里合并成一次请求。
 *
 * 用 db.batch 而非 UNION ALL：D1 对 compound SELECT 的项数上限很低，
 * 集合数一多就 "too many terms in compound SELECT"。batch 同样只有一次往返。
 *
 * 表名与判别列全部来自 COLLECTIONS 常量，不接受任何用户输入。
 */
import type { Context } from 'hono'
import { ok } from '../lib/respond'
import { COLLECTIONS } from './collections'
import type { PanelEnv, PanelVars } from './types'

type DashboardContext = Context<{ Bindings: PanelEnv; Variables: PanelVars }>

export async function handleDashboard(c: DashboardContext): Promise<Response> {
  const entries = Object.entries(COLLECTIONS)

  const statements = entries.map(([, def]) => {
    if (def.fixedFilter) {
      return c.env.DB.prepare(
        `SELECT COUNT(*) AS n FROM ${def.table} WHERE ${def.fixedFilter.column} = ?1`
      ).bind(def.fixedFilter.value)
    }
    return c.env.DB.prepare(`SELECT COUNT(*) AS n FROM ${def.table}`)
  })

  const results = await c.env.DB.batch<{ n: number }>(statements)

  const totals: Record<string, number> = {}
  entries.forEach(([key], index) => {
    totals[key] = results[index]?.results?.[0]?.n ?? 0
  })

  return ok(totals)
}
