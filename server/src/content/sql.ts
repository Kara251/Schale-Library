/**
 * D1 原生 prepared statement 的 SQL 拼装助手。
 * 设计：叶子条件 → { sql 片段, 参数 }；域路由负责把 path 映射到真实列（含 JOIN 表别名）。
 */

export interface SqlCond {
  sql: string
  params: unknown[]
}

/** camelCase（Strapi 字段名）→ snake_case（D1 列名）。多处调用，行为需一致。 */
export function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase())
}

const OP_SQL = {
  eq: '= ?',
  ne: '<> ?',
  gt: '> ?',
  gte: '>= ?',
  lt: '< ?',
  lte: '<= ?',
} as const

/**
 * 标量列条件构造器。
 * col 为带别名的列名（如 'e.kind'），value 已由调用方做类型归一（字符串原样、布尔转 0/1）。
 * containsi 走 LIKE + LOWER 双侧小写（D1 无 ICU citext）。
 */
export function cond(col: string, op: keyof typeof OP_SQL | 'containsi', value: string | number): SqlCond {
  if (op === 'containsi') return { sql: `LOWER(${col}) LIKE LOWER(?)`, params: [`%${value}%`] }
  const cmp = OP_SQL[op]
  return { sql: `${col} ${cmp}`, params: [value] }
}

/** AND 连接多个条件；空数组返回 1=1 */
export function andAll(conds: SqlCond[]): SqlCond {
  if (conds.length === 0) return { sql: '1=1', params: [] }
  return {
    sql: conds.map((c) => `(${c.sql})`).join(' AND '),
    params: conds.flatMap((c) => c.params),
  }
}

/** OR 连接多个条件；空数组返回 1=0（无匹配） */
export function orAny(conds: SqlCond[]): SqlCond {
  if (conds.length === 0) return { sql: '1=0', params: [] }
  return {
    sql: conds.map((c) => `(${c.sql})`).join(' OR '),
    params: conds.flatMap((c) => c.params),
  }
}

/** LIMIT/OFFSET 子句与分页参数 */
export function limitOffset(limit: number, offset: number): SqlCond {
  return { sql: `LIMIT ? OFFSET ?`, params: [limit, offset] }
}
