/**
 * 系统健康：GET /panel/system-health
 * DB 连通 + 各集合计数；RSSHub 已退役，无该项。
 */
import type { Context } from 'hono'
import { ok } from '../lib/respond'
import { COLLECTIONS } from './collections'

interface HealthCheck {
  key: string
  label: string
  status: 'ok' | 'warning' | 'error'
  message: string
}

export async function handleSystemHealth(
  c: Context<{ Bindings: { DB: D1Database; ENVIRONMENT?: string }; Variables: Record<string, never> }>
): Promise<Response> {
  const checks: HealthCheck[] = []

  // DB 连通性
  try {
    await c.env.DB.prepare('SELECT 1 AS probe').first()
    checks.push({ key: 'database', label: 'Database', status: 'ok', message: 'D1 reachable.' })
  } catch (error) {
    checks.push({ key: 'database', label: 'Database', status: 'error', message: `D1 unreachable: ${(error as Error).message}` })
  }

  // 各集合计数（表缺失按 warning 处理，不中断整体检查）
  const counts: Record<string, number> = {}
  for (const [key, def] of Object.entries(COLLECTIONS)) {
    try {
      const row = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM ${def.table}`).first<{ n: number }>()
      counts[key] = row?.n ?? 0
    } catch (error) {
      checks.push({
        key: `collection:${key}`,
        label: `Collection ${key}`,
        status: 'warning',
        message: `Count failed: ${(error as Error).message}`,
      })
      counts[key] = -1
    }
  }

  const hasError = checks.some((check) => check.status === 'error')
  const hasWarning = checks.some((check) => check.status === 'warning')

  return ok(
    {
      status: hasError ? 'error' : hasWarning ? 'warning' : 'ok',
      generatedAt: new Date().toISOString(),
      environment: c.env.ENVIRONMENT ?? 'development',
      collectionCounts: counts,
      checks,
    }
  )
}
