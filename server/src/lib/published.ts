/**
 * 公开可见性判定。
 *
 * published_at 有三种语义：
 * - NULL          → 草稿，任何时候都不公开
 * - <= 当前时间   → 已发布
 * - >  当前时间   → 已排期，尚未到点，同样不公开
 *
 * 第三种是定时发布的基础。此前各域只判 IS NOT NULL，未来时间会被当成已发布
 * 立即放出 —— 定时发布不但没有界面，底层语义本身就是错的。
 *
 * 各域必须统一走这里，不要再手写 `published_at IS NOT NULL`。
 */

/** 生成公开可见性的 WHERE 片段。prefix 为表别名（如 'e.'），无别名时传空串。 */
export function publishedCondition(prefix = ''): { sql: string; params: number[] } {
  return {
    sql: `${prefix}published_at IS NOT NULL AND ${prefix}published_at <= ?`,
    params: [Date.now()],
  }
}

/** 不带绑定参数的版本：调用方自己把当前时间拼进去（用于无参数化能力的场景）。 */
export function publishedSql(prefix = '', nowMs = Date.now()): string {
  return `${prefix}published_at IS NOT NULL AND ${prefix}published_at <= ${nowMs}`
}

/** 行的发布状态：面板列表用它区分草稿 / 已排期 / 已发布。 */
export type PublishStatus = 'draft' | 'scheduled' | 'published'

export function publishStatusOf(publishedAt: number | null, nowMs = Date.now()): PublishStatus {
  if (publishedAt === null || publishedAt === undefined) return 'draft'
  return publishedAt > nowMs ? 'scheduled' : 'published'
}
