/**
 * 公开内容 API — works 域（旧 Strapi work 集合平移，W4 服役、W5 退役）。
 *
 * 端点（对拍 frontend/tests/contracts/works.ts + frontend/src/lib/api/works.ts）：
 * - GET /works：列表；isActive 过滤、featured 窗口、多键排序、分页
 * - GET /works/:key：详情（数字 → id，否则 documentId）
 * 搜索/按作者/按学生等场景复用同一端点：$or 组（title/author/description/students.name）、
 * filters[students][id][$in]、filters[author][$eq]、filters[id][$ne] 均在列表处理器内实现。
 *
 * students 关联经 works_students JOIN 输出 students[]；coverImage.url 取
 * cover_image_url 优先，回退 cover_image_url_external。
 */
import { Hono } from 'hono'
import type { Env } from '../index'
import { ok, okPaginated, fail, paginationOf } from '../lib/respond'
import { parseContentQuery } from './query'
import { cond, andAll, orAny, limitOffset, camelToSnake } from './sql'
import type { SqlCond } from './sql'
import type { ParsedContentQuery } from './query'
import { buildOrderBy } from '../lib/sort'

type Row = Record<string, unknown>

interface WorkRow {
  id: number
  document_id: string
  title: string
  author: string | null
  description: string | null
  cover_image_url: string | null
  cover_image_url_external: string | null
  nature: string
  work_type: string | null
  link: string | null
  source_platform: string | null
  source_url: string | null
  source_id: string | null
  is_featured: number
  featured_priority: number
  featured_reason: string | null
  featured_until: number | null
  is_active: number
  is_auto_imported: number
  imported_at: number | null
  original_publish_date: string | null
  created_at: number
  updated_at: number
  published_at: number | null
}

interface StudentBrief {
  id: number
  documentId: string
  name: string
}

interface WorkRowWithStudents extends WorkRow {
  student_id: number | null
  student_document_id: string | null
  student_name: string | null
  student_sort: number | null
}

const WORKS_SELECT = `SELECT w.*, s.id AS student_id, s.document_id AS student_document_id, s.name AS student_name, ws.sort_order AS student_sort
FROM works w
LEFT JOIN works_students ws ON ws.work_id = w.id
LEFT JOIN students s ON s.id = ws.student_id`

/** 行组（同 work 多行，每学生一行）→ work JSON + students[] */
function groupWorkJson(rows: WorkRowWithStudents[], keyOf: (r: WorkRowWithStudents) => string): Array<Row & { students: StudentBrief[] }> {
  const byKey = new Map<string, { row: WorkRowWithStudents; students: StudentBrief[] }>()
  for (const r of rows) {
    const key = keyOf(r)
    let entry = byKey.get(key)
    if (!entry) {
      byKey.set(key, (entry = { row: r, students: [] }))
    }
    if (entry && r.student_id !== null && r.student_id !== undefined) {
      entry.students.push({
        id: r.student_id,
        documentId: r.student_document_id ?? '',
        name: r.student_name ?? '',
      })
    }
  }
  return [...byKey.values()].map(({ row, students }) => workToJson(row, students))
}

function toIso(ms: number | null): string | null {
  return ms === null ? null : new Date(ms).toISOString()
}

function workToJson(w: WorkRow, students: StudentBrief[]): Row & { students: StudentBrief[] } {
  return {
    id: w.id,
    documentId: w.document_id,
    title: w.title,
    author: w.author ?? undefined,
    description: w.description ?? undefined,
    coverImage: (w.cover_image_url || w.cover_image_url_external)
      ? { url: w.cover_image_url || w.cover_image_url_external }
      : undefined,
    coverImageUrl: w.cover_image_url_external ?? undefined,
    originalPublishDate: w.original_publish_date ?? undefined,
    nature: w.nature,
    workType: w.work_type ?? 'other',
    link: w.link ?? undefined,
    isActive: w.is_active === 1,
    isFeatured: w.is_featured === 1,
    featuredPriority: w.featured_priority,
    featuredReason: w.featured_reason ?? undefined,
    featuredUntil: toIso(w.featured_until),
    sourcePlatform: w.source_platform ?? undefined,
    sourceUrl: w.source_url ?? undefined,
    sourceId: w.source_id ?? undefined,
    isAutoImported: w.is_auto_imported === 1,
    importedAt: toIso(w.imported_at),
    students,
    createdAt: new Date(w.created_at).toISOString(),
    updatedAt: new Date(w.updated_at).toISOString(),
    publishedAt: toIso(w.published_at),
  }
}

const WORK_SORT_COLUMNS: Record<string, string> = {
  published_at: 'w.published_at',
  created_at: 'w.created_at',
  updated_at: 'w.updated_at',
  is_featured: 'w.is_featured',
  featured_priority: 'w.featured_priority',
}

function orderByOf(sorts: Array<{ field: string; dir: 'asc' | 'desc' }>): string {
  return buildOrderBy(WORK_SORT_COLUMNS, sorts, 'w.published_at DESC')
}

function buildWhere(q: ParsedContentQuery): SqlCond {
  const conds = [{ sql: 'w.published_at IS NOT NULL', params: [] } as SqlCond]
  // 默认只展示在架作品（is_active=1）；显式 isActive 过滤时由叶子覆盖
  const hasIsActiveFilter =
    q.leaves.some((l) => l.path[0] === 'is_active' || l.path[0] === 'isActive') ||
    q.andGroups.some((ag) => ag.leaves.some((l) => l.path[0] === 'is_active' || l.path[0] === 'isActive'))
  if (!hasIsActiveFilter) {
    conds.push({ sql: 'w.is_active = 1', params: [] })
  }

  for (const leaf of q.leaves) {
    const [head, rel] = leaf.path
    if (head === 'is_active') {
      conds.push(cond('w.is_active', 'eq', leaf.value === 'true' || leaf.value === '1' ? 1 : 0))
      continue
    }
    if (head === 'nature') {
      conds.push(cond('w.nature', 'eq', leaf.value))
      continue
    }
    if (head === 'work_type') {
      conds.push(cond('w.work_type', 'eq', leaf.value))
      continue
    }
    if (head === 'source_platform') {
      conds.push(cond('w.source_platform', 'eq', leaf.value))
      continue
    }
    if (head === 'is_featured') {
      conds.push(cond('w.is_featured', 'eq', leaf.value === 'true' || leaf.value === '1' ? 1 : 0))
      continue
    }
    if (head === 'id' && leaf.op === 'ne') {
      conds.push(cond('w.id', 'ne', parseInt(leaf.value, 10)))
      continue
    }
    if (head === 'id' && leaf.op === 'eq') {
      conds.push(cond('w.id', 'eq', parseInt(leaf.value, 10)))
      continue
    }
    if (head === 'document_id' && leaf.op === 'eq') {
      conds.push(cond('w.document_id', 'eq', leaf.value))
      continue
    }
    if (head === 'author' && leaf.op === 'eq') {
      conds.push(cond('w.author', 'eq', leaf.value))
      continue
    }
    if (head === 'featured_until' && rel === undefined) {
      // featuredUntil 窗口特判由 $and 组处理，这里跳过裸字段
      continue
    }
    void rel
  }

  // $or 组：title/author/description/students.name containsi
  for (const group of q.orGroups) {
    const ors = group.map((leaf) => {
      const field = leaf.path[leaf.path.length - 1]
      if (field === 'title') return cond('w.title', 'containsi', leaf.value)
      if (field === 'author') return cond('w.author', 'containsi', leaf.value)
      if (field === 'description') return cond('LOWER(w.description)', 'containsi', leaf.value)
      if (field === 'name') return cond('s.name', 'containsi', leaf.value)
      return null
    }).filter((x): x is NonNullable<typeof x> => x !== null)
    conds.push(orAny(ors))
  }

  // $and 组：featuredUntil 窗口（$null OR $gte now）+ 平铺叶子
  for (const ag of q.andGroups) {
    for (const leaf of ag.leaves) {
      const [head] = leaf.path
      if (head === 'is_active' || head === 'is_featured') {
        conds.push(cond(`w.${camelToSnake(head)}`, 'eq', leaf.value === 'true' || leaf.value === '1' ? 1 : 0))
      } else if (head === 'id' && leaf.op === 'ne') {
        conds.push(cond('w.id', 'ne', parseInt(leaf.value, 10)))
      } else if (head === 'author' && leaf.op === 'eq') {
        conds.push(cond('w.author', 'eq', leaf.value))
      }
    }
    for (const og of ag.orGroups) {
      // 形如 [$or[0][featuredUntil][$null], $or[1][featuredUntil][$gte]] 的窗口
      const windowOrs: SqlCond[] = []
      let sawWindow = false
      for (const leaf of og) {
        const field = leaf.path[leaf.path.length - 1]
        if (field !== 'featured_until') continue
        sawWindow = true
        // 解析器丢弃了 $null 标记；用「叶子值 == '' 且 op eq」无法表达——改为约定：
        // $null 叶子 value 为空串。这里按 op 分派。
        if (leaf.op === 'gte') windowOrs.push({ sql: 'w.featured_until >= ?', params: [Date.parse(leaf.value)] })
        else if (leaf.op === 'eq' && leaf.value === '') windowOrs.push({ sql: 'w.featured_until IS NULL', params: [] })
        else if (leaf.op === 'eq') windowOrs.push({ sql: 'w.featured_until IS NULL', params: [] })
      }
      if (sawWindow && windowOrs.length > 0) conds.push(orAny(windowOrs))
    }
  }

  return andAll(conds)
}

export const worksRoutes = new Hono<{ Bindings: Env }>()

async function fetchWorkRows(db: D1Database, whereSql: SqlCond, orderSql: string, limOff: SqlCond): Promise<(WorkRowWithStudents)[]> {
  const stmt = db.prepare(`${WORKS_SELECT} WHERE ${whereSql.sql} ORDER BY ${orderSql}, ws.sort_order ASC ${limOff.sql}`)
  const out = await stmt.bind(...whereSql.params, ...limOff.params).all<WorkRowWithStudents>()
  return out.results ?? []
}

async function countWorks(db: D1Database, whereSql: SqlCond): Promise<number> {
  const stmt = db.prepare(`SELECT COUNT(DISTINCT w.id) AS n FROM works w LEFT JOIN works_students ws ON ws.work_id = w.id LEFT JOIN students s ON s.id = ws.student_id WHERE ${whereSql.sql}`)
  const row = await stmt.bind(...whereSql.params).first<{ n: number }>()
  return row?.n ?? 0
}

worksRoutes.get('/works', async (c) => {
  const q = parseContentQuery(new URL(c.req.url))

  // students[id][$in] 平铺叶子（getWorksByStudentIds）：任一命中即可
  const studentInLeaves = q.leaves.filter((l) => l.path[0] === 'students' && l.path[1] === 'id')
  let whereSql = buildWhere(q)
  if (studentInLeaves.length > 0) {
    const ids = studentInLeaves.map((l) => parseInt(l.value, 10)).filter((n) => !Number.isNaN(n))
    whereSql = andAll([whereSql, orAny(ids.map((id) => cond('ws.student_id', 'eq', id)))])
  }

  const offset = q.start ?? (q.page - 1) * q.pageSize
  const size = q.limit ?? q.pageSize

  const rows = await fetchWorkRows(c.env.DB, whereSql, orderByOf(q.sorts), limitOffset(size, offset))
  const total = await countWorks(c.env.DB, whereSql)

  // 行 → 按 work 聚合（JOIN 展开的行序即排序键序）
  const data = groupWorkJson(rows, (r) => `${r.id}`)
  return okPaginated(data, paginationOf(q.page, q.pageSize, total))
})

worksRoutes.get('/works/:key', async (c) => {
  const key = c.req.param('key').trim()
  const numeric = /^\d+$/.test(key)
  const whereSql = andAll([
    { sql: 'w.published_at IS NOT NULL', params: [] },
    numeric ? cond('w.id', 'eq', parseInt(key, 10)) : cond('w.document_id', 'eq', key),
  ])
  const rows = await fetchWorkRows(c.env.DB, whereSql, 'w.published_at DESC', limitOffset(50, 0))
  const data = groupWorkJson(rows, (r) => `${r.id}`)
  if (data.length === 0) return fail(404, 'not_found')
  return ok(data[0])
})
