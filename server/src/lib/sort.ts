/**
 * 排序键 → SQL 列名的安全查表。
 *
 * ORDER BY 片段是字符串拼接进 SQL 的，查表结果必须只可能是白名单里的常量列名。
 * 直接用 map[userInput] 有两个问题：
 * 1. 原型链属性会命中 —— map['constructor'] 返回 Object 构造函数（真值），
 *    被当成列名拼进 SQL，无认证即可让公开端点 500；
 * 2. 任何"未命中就原样透传"的兜底都等于把用户输入送进 ORDER BY。
 * 因此这里只认自有属性，且只返回字符串值。
 */
export function lookupSortColumn(
  columns: Record<string, string>,
  field: string
): string | null {
  if (!Object.hasOwn(columns, field)) return null
  const column = columns[field]
  return typeof column === 'string' ? column : null
}

/** 排序键数组 → ORDER BY 片段；全部未命中时返回 fallback。 */
export function buildOrderBy(
  columns: Record<string, string>,
  sorts: Array<{ field: string; dir: 'asc' | 'desc' }>,
  fallback: string
): string {
  const parts = sorts
    .map((s) => {
      const column = lookupSortColumn(columns, s.field)
      return column ? `${column} ${s.dir === 'asc' ? 'ASC' : 'DESC'}` : null
    })
    .filter((p): p is string => p !== null)
  return parts.length > 0 ? parts.join(', ') : fallback
}
