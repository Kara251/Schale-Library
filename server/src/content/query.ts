/**
 * 内容域专用查询解析（Strapi 兼容子集）。
 * 覆盖 frontend/tests/contracts 快照 + 前端 api/*.ts 实际发出的全部形态：
 * - locale / pagination[page|pageSize|limit|start]
 * - sort=field:dir、sort[0..N]=field:dir（多键按序生效）
 * - filters[...][$eq|$ne|$containsi|$in|$gt|$gte|$lt|$lte|$null|$notNull]，
 *   路径可含关联段：filters[students][id][$in]、filters[school_ref][slug][$eq]
 * - $or[i][field][op]=v / $and[i][$or][j][field][op]=v：组内 OR，组间 AND
 * - fields[0..N]=col（字段裁剪提示，仅记录）
 */

import { camelToSnake } from './sql'

export type SortKey = { field: string; dir: 'asc' | 'desc' }

/** 单个叶子过滤条件：path 为字段路径（关联段原样保留），op 为 Strapi 操作符 */
export interface LeafFilter {
  path: string[]
  op: 'eq' | 'ne' | 'containsi' | 'gt' | 'gte' | 'lt' | 'lte'
  value: string
}

export interface ParsedContentQuery {
  locale: string
  page: number
  pageSize: number
  limit: number | null // pagination[limit]
  start: number | null // pagination[start]
  sorts: SortKey[]
  /** filters[field][...] 平铺条件（AND 语义） */
  leaves: LeafFilter[]
  /** $or 组：组内任一命中 */
  orGroups: LeafFilter[][]
  /** $and 组：组内为 $or 子组（全 AND）或平铺叶子（AND 语义） */
  andGroups: Array<{ leaves: LeafFilter[]; orGroups: LeafFilter[][] }>
  fields: string[]
}

const OPS: Record<string, true> = { eq: true, ne: true, containsi: true, gt: true, gte: true, lt: true, lte: true }

function isInt(v: string | null): number | null {
  if (v === null || v === '' || !/^\d+$/.test(v)) return null
  return parseInt(v, 10)
}

/** 操作符段（$eq/$null/…）→ 解析结果；nulled 表示 featuredUntil 特判用的空判 */
function parseOpToken(token: string): { op: LeafFilter['op'] } | { nulled: boolean } | null {
  const bare = token.replace(/^\[/, '').replace(/\]$/, '')
  if (bare === '$null') return { nulled: true }
  if (bare === '$notNull') return { nulled: false }
  const op = bare.replace('$', '')
  if (!(op in OPS)) return null
  return { op: op as LeafFilter['op'] }
}

export function parseContentQuery(url: URL): ParsedContentQuery {
  const ALLOWED = ['zh-Hans', 'en', 'ja']
  const rawLocale = url.searchParams.get('locale') || 'zh-Hans'
  const locale = ALLOWED.includes(rawLocale) ? rawLocale : 'zh-Hans'

  const page = Math.max(1, isInt(url.searchParams.get('pagination[page]')) ?? 1)
  const rawSize = isInt(url.searchParams.get('pagination[pageSize]'))
  const pageSize = Math.min(100, Math.max(1, rawSize ?? 24))
  const rawLimit = isInt(url.searchParams.get('pagination[limit]'))
  const limit = rawLimit === null ? null : Math.min(100, Math.max(0, rawLimit))
  const startRaw = url.searchParams.get('pagination[start]')
  const start = startRaw !== null && /^\d+$/.test(startRaw) ? parseInt(startRaw, 10) : null

  const result: ParsedContentQuery = {
    locale,
    page,
    pageSize,
    limit,
    start,
    sorts: [],
    leaves: [],
    orGroups: [],
    andGroups: [],
    fields: [],
  }

  // ── sort：单键或多键 ──
  const single = url.searchParams.get('sort')
  if (single) {
    const [f, d] = single.split(':')
    if (f) result.sorts.push({ field: camelToSnake(f), dir: d === 'asc' ? 'asc' : 'desc' })
  }
  for (let i = 0; i < 8; i++) {
    const s = url.searchParams.get(`sort[${i}]`)
    if (!s) continue
    const [f, d] = s.split(':')
    if (f) result.sorts.push({ field: camelToSnake(f), dir: d === 'asc' ? 'asc' : 'desc' })
  }

  // ── fields[i] ──
  for (let i = 0; i < 8; i++) {
    const f = url.searchParams.get(`fields[${i}]`)
    if (f) result.fields.push(camelToSnake(f))
  }

  // ── filters ──
  const leafByGroup = new Map<string, LeafFilter[]>()
  const orGroupIndex = new Map<number, LeafFilter[]>()
  const andOuter = new Map<number, { leaves: LeafFilter[]; orGroups: Map<number, LeafFilter[]> }>()

  for (const [key, rawValue] of url.searchParams.entries()) {
    if (!key.startsWith('filters[') || rawValue === '') continue
    const segs = key.slice('filters['.length).split('][').map((s) => s.replace(/\]$/, ''))

    // $or[i][field][op] 或 $and[i][$or][j][field][op]
    if (segs[0] === '$or') {
      const gi = isInt(segs[1])
      if (gi === null || segs.length < 3) continue
      const pathSegs = segs.slice(2, segs.length - 1)
      const leaf = makeLeafFromSegments(pathSegs, segs[segs.length - 1], rawValue)
      if (!leaf) continue
      let group = orGroupIndex.get(gi)
      if (!group) orGroupIndex.set(gi, (group = []))
      group.push(leaf)
      continue
    }

    if (segs[0] === '$and') {
      const oi = isInt(segs[1])
      if (oi === null) continue
      let entry = andOuter.get(oi)
      if (!entry) andOuter.set(oi, (entry = { leaves: [], orGroups: new Map() }))
      if (segs[2] === '$or') {
        const gj = isInt(segs[3])
        if (gj === null || segs.length < 5) continue
        const leaf = makeLeafFromSegments(segs.slice(4, segs.length - 1), segs[segs.length - 1], rawValue)
        if (!leaf) continue
        let group = entry.orGroups.get(gj)
        if (!group) entry.orGroups.set(gj, (group = []))
        group.push(leaf)
      } else {
        const leaf = makeLeafFromSegments(segs.slice(2, segs.length - 1), segs[segs.length - 1], rawValue)
        if (leaf) entry.leaves.push(leaf)
      }
      continue
    }

    // 普通平铺：filters[a][b][op]=v / filters[a][op]=v / filters[a]=v
    const leaf = makeLeafFromSegments(segs.slice(0, segs.length - 1), segs[segs.length - 1], rawValue)
    if (!leaf) continue
    const gk = leaf.path.join('.')
    let group = leafByGroup.get(gk)
    if (!group) leafByGroup.set(gk, (group = []))
    group.push(leaf)
  }

  // Strapi 语义：filters[$or][i][field] 的多个 [i] 是同一个 $or 组的分支（组内 OR）。
  // 前端 appendWorkFilters 用 [0]=title/[1]=author/[2]=description/[3]=students.name 表达「任一命中」。
  result.orGroups = orGroupIndex.size > 0 ? [[...orGroupIndex.values()].flat()] : []
  result.andGroups = [...andOuter.keys()]
    .sort((a, b) => a - b)
    .map((k) => {
      const e = andOuter.get(k)!
      return {
        leaves: e.leaves,
        orGroups: [...e.orGroups.keys()].sort((a, b) => a - b).map((gk) => e.orGroups.get(gk)!),
      }
    })
  // 稳定顺序：按首次出现
  result.leaves = [...leafByGroup.values()].flat()

  return result
}

function makeLeafFromSegments(pathSegs: string[], lastSeg: string, value: string): LeafFilter | null {
  // 最后一段可能是操作符（$eq 等）或字段名（filters[nature]=fanmade）
  if (lastSeg.startsWith('$')) {
    const parsed = parseOpToken(lastSeg)
    if (!parsed || 'nulled' in parsed) return null
    return { path: pathSegs.map(camelToSnake), op: parsed.op, value }
  }
  return { path: [...pathSegs, lastSeg].map(camelToSnake), op: 'eq', value }
}
