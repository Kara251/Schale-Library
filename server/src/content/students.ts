/**
 * 公开内容 API — students 域（瘦身学生表）。
 *
 * 端点（对拍 frontend/tests/contracts/students.ts + frontend/src/lib/api/students.ts）：
 * - GET /students：列表；name/organization containsi、school_ref.slug|school eq、
 *   filters[id][$in]、sort name:asc / updatedAt:desc、分页
 * - GET /students/:key：详情（数字 → id，否则 documentId）
 *
 * school_ref 输出 JOIN schools 的 {id, documentId, name, slug, color}；
 * avatar.url 取 avatar_url 列；school 旧枚举列已不存在，school 筛选仅匹配
 * school_ref.slug（schema v2 收敛）。
 */
import { Hono } from 'hono'
import type { Env } from '../index'
import { ok, okPaginated, fail, paginationOf } from '../lib/respond'
import { parseContentQuery } from './query'
import type { ParsedContentQuery } from './query'
import { cond, andAll, orAny, limitOffset } from './sql'
import type { SqlCond } from './sql'

type Row = Record<string, unknown>

export interface StudentRow {
  id: number
  document_id: string
  slug: string
  name: string
  avatar_url: string | null
  organization: string | null
  wiki_url: string | null
  school_id: number | null
  school_name: string | null
  school_document_id: string | null
  school_slug: string | null
  school_color: string | null
  created_at: number
  updated_at: number
  published_at: number | null
}

const STUDENTS_SELECT = `SELECT st.*, sc.id AS school_id2, sc.name_json AS school_name, sc.document_id AS school_document_id, sc.slug AS school_slug, sc.color AS school_color
FROM students st LEFT JOIN schools sc ON sc.id = st.school_id`

export function studentToJson(r: StudentRow): Row {
  return {
    id: r.id,
    documentId: r.document_id,
    slug: r.slug,
    name: r.name,
    organization: r.organization ?? undefined,
    wikiUrl: r.wiki_url ?? undefined,
    avatar: r.avatar_url ? { url: r.avatar_url } : undefined,
    school_ref:
      r.school_name && r.school_slug
        ? {
            id: r.school_id,
            documentId: r.school_document_id,
            name: JSON.parse(r.school_name)['zh-Hans'] || Object.values(JSON.parse(r.school_name))[0] || '',
            slug: r.school_slug,
            color: r.school_color ?? undefined,
          }
        : null,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
    publishedAt: r.published_at === null ? null : new Date(r.published_at).toISOString(),
  }
}

const STUDENT_SORT_COLUMNS: Record<string, string> = {
  name: 'st.name',
  updated_at: 'st.updated_at',
  created_at: 'st.created_at',
}

function orderByOf(sorts: Array<{ field: string; dir: 'asc' | 'desc' }>): string {
  const parts = sorts
    .map((s) => {
      const col = STUDENT_SORT_COLUMNS[s.field]
      return col ? `${col} ${s.dir.toUpperCase()}` : null
    })
    .filter((p): p is string => p !== null)
  return parts.length > 0 ? parts.join(', ') : 'st.name ASC'
}

function buildWhere(q: ParsedContentQuery): SqlCond {
  const conds: SqlCond[] = [{ sql: 'st.published_at IS NOT NULL', params: [] }]

  for (const leaf of q.leaves) {
    const [head] = leaf.path
    if (head === 'id') {
      // filters[id][$in][0]=… 平铺多个同路径叶子 → OR
      continue // 由 collectIn 处理
    }
    if (head === 'document_id' && leaf.op === 'eq') {
      conds.push(cond('st.document_id', 'eq', leaf.value))
      continue
    }
    if ((head === 'name' || head === 'organization') && leaf.op === 'containsi') {
      conds.push(cond(head === 'name' ? 'LOWER(st.name)' : 'LOWER(st.organization)', 'containsi', leaf.value))
      continue
    }
  }

  // $and 组：getStudents 的 query（$or[name|organization] containsi）与 school（$or[school_ref.slug|school] eq）
  // 同一 $and[i] 内的所有 $or[j] 子组之间为 OR（Strapi 语义）；不同 $and[i] 组间为 AND
  for (const ag of q.andGroups) {
    const leaves = ag.orGroups.flat()
    const ors: SqlCond[] = []
    for (const leaf of leaves) {
      const [head, rel] = leaf.path
      if ((head === 'name' || head === 'organization') && leaf.op === 'containsi') {
        ors.push(cond(head === 'name' ? 'LOWER(st.name)' : 'LOWER(st.organization)', 'containsi', leaf.value))
      } else if (head === 'school_ref' && rel === 'slug' && leaf.op === 'eq') {
        ors.push(cond('sc.slug', 'eq', leaf.value))
      } else if (head === 'school' && leaf.op === 'eq') {
        ors.push(cond('sc.slug', 'eq', leaf.value))
      } else if (head === 'bio' && leaf.op === 'containsi') {
        continue // bio 列在瘦身 schema 中不存在：跳过
      }
    }
    if (ors.length > 0) conds.push(orAny(ors))
  }

  // $or 组（searchStudents）：name/organization/school/bio containsi
  for (const group of q.orGroups) {
    const ors: SqlCond[] = []
    for (const leaf of group) {
      const field = leaf.path[leaf.path.length - 1]
      if (field === 'name') ors.push(cond('LOWER(st.name)', 'containsi', leaf.value))
      else if (field === 'organization') ors.push(cond('LOWER(st.organization)', 'containsi', leaf.value))
      else if (field === 'school') ors.push(cond('sc.name_json', 'containsi', leaf.value))
      // bio 不存在：跳过
    }
    conds.push(orAny(ors))
  }

  return andAll(conds)
}

/** 收集平铺 filters[id][$in][i] 为 OR 组 */
function studentIdInWhere(q: ParsedContentQuery): SqlCond | null {
  const ids: number[] = []
  for (const leaf of q.leaves) {
    if (leaf.path[0] === 'id' && leaf.op === 'eq') ids.push(parseInt(leaf.value, 10))
  }
  if (ids.length === 0) return null
  return orAny(ids.map((id) => cond('st.id', 'eq', id)))
}

export const studentsRoutes = new Hono<{ Bindings: Env }>()

async function fetchStudentRows(db: D1Database, whereSql: SqlCond, orderSql: string, limOff: SqlCond): Promise<StudentRow[]> {
  const stmt = db.prepare(`${STUDENTS_SELECT} WHERE ${whereSql.sql} ORDER BY ${orderSql} ${limOff.sql}`)
  const out = await stmt.bind(...whereSql.params, ...limOff.params).all<StudentRow>()
  return out.results ?? []
}

async function countStudents(db: D1Database, whereSql: SqlCond): Promise<number> {
  const stmt = db.prepare(`SELECT COUNT(*) AS n FROM students st LEFT JOIN schools sc ON sc.id = st.school_id WHERE ${whereSql.sql}`)
  const row = await stmt.bind(...whereSql.params).first<{ n: number }>()
  return row?.n ?? 0
}

studentsRoutes.get('/students', async (c) => {
  const q = parseContentQuery(new URL(c.req.url))
  let whereSql = buildWhere(q)
  const inWhere = studentIdInWhere(q)
  if (inWhere) whereSql = andAll([whereSql, inWhere])

  const offset = q.start ?? (q.page - 1) * q.pageSize
  const size = q.limit ?? q.pageSize

  const [rows, total] = await Promise.all([
    fetchStudentRows(c.env.DB, whereSql, orderByOf(q.sorts), limitOffset(size, offset)),
    countStudents(c.env.DB, whereSql),
  ])
  return okPaginated(rows.map(studentToJson), paginationOf(q.page, q.pageSize, total))
})

studentsRoutes.get('/students/:key', async (c) => {
  const key = c.req.param('key').trim()
  const numeric = /^\d+$/.test(key)
  const whereSql = andAll([
    { sql: 'st.published_at IS NOT NULL', params: [] },
    numeric ? cond('st.id', 'eq', parseInt(key, 10)) : cond('st.document_id', 'eq', key),
  ])
  const rows = await fetchStudentRows(c.env.DB, whereSql, 'st.name ASC', limitOffset(1, 0))
  if (rows.length === 0) return fail(404, 'not_found')
  return ok(studentToJson(rows[0]))
})
