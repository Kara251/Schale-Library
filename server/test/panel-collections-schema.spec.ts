/**
 * 面板集合注册表 ↔ D1 实际表结构对拍。
 *
 * 通用 CRUD 是按注册表拼 SQL 的：字段白名单、defaultSort、searchColumns、
 * status 过滤全部直接落到列名上。注册表里写了表上没有的列，不会有任何
 * 编译期或启动期报错，只在该集合被访问时 500 —— spoiler-tiers 就是这么
 * 在线上炸掉整个 /manage 首页的（它按 updated_at 排序，而表里没这列）。
 *
 * 这里把这类不一致固化成测试：每个注册集合的每一处列引用都必须真实存在。
 */
import { env } from 'cloudflare:test'
import { describe, it, expect, beforeAll } from 'vitest'
import { BASELINE_STATEMENTS } from './baseline'
import { applyMigration } from './helpers'
import { COLLECTIONS } from '../src/panel/collections'

/** 通用 CRUD 无条件读写的列（serializeRow / create / update 都依赖）。 */
const REQUIRED_BASE_COLUMNS = ['id', 'document_id', 'created_at', 'updated_at']

/** 通用 CRUD 的 INSERT 会自动补齐的列，不需要出现在字段白名单里。 */
const AUTO_FILLED_ON_INSERT = new Set(['id', 'document_id', 'created_at', 'updated_at'])

interface ColumnInfo {
  name: string
  notnull: number
  dflt_value: string | null
}

const tableColumns = new Map<string, Set<string>>()
const tableColumnInfo = new Map<string, ColumnInfo[]>()

async function loadColumnInfo(table: string): Promise<ColumnInfo[]> {
  const cached = tableColumnInfo.get(table)
  if (cached) return cached

  const { results } = await env.DB.prepare(`PRAGMA table_info(${table})`).all<ColumnInfo>()
  tableColumnInfo.set(table, results)
  return results
}

async function loadColumns(table: string): Promise<Set<string>> {
  const cached = tableColumns.get(table)
  if (cached) return cached

  const { results } = await env.DB.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>()
  const cols = new Set(results.map((r) => r.name))
  tableColumns.set(table, cols)
  return cols
}

beforeAll(async () => {
  for (const statement of BASELINE_STATEMENTS) {
    await env.DB.prepare(statement).run()
  }
  await applyMigration(env.DB, 'migrations/0002_works.sql')
  await applyMigration(env.DB, 'migrations/0003_spoiler_tiers_timestamps.sql')
  await applyMigration(env.DB, 'migrations/0004_citation_source_image.sql')
})

describe('集合注册表与表结构一致', () => {
  const entries = Object.entries(COLLECTIONS)

  it.each(entries)('%s：表存在且含通用 CRUD 必需列', async (key, def) => {
    const cols = await loadColumns(def.table)
    expect(cols.size, `集合 ${key} 的表 ${def.table} 不存在`).toBeGreaterThan(0)

    for (const required of REQUIRED_BASE_COLUMNS) {
      expect(cols.has(required), `${def.table} 缺少通用 CRUD 必需列 ${required}`).toBe(true)
    }
  })

  it.each(entries)('%s：字段白名单的列都存在', async (key, def) => {
    const cols = await loadColumns(def.table)
    for (const [fieldName, field] of Object.entries(def.fields)) {
      expect(cols.has(field.column), `${key}.${fieldName} → ${def.table}.${field.column} 不存在`).toBe(true)
    }
  })

  it.each(entries)('%s：supportsDraft 与 published_at 列一致', async (key, def) => {
    const cols = await loadColumns(def.table)
    // 声明支持草稿 → 必须有 published_at，否则 status 过滤直接 SQL 报错
    if (def.supportsDraft) {
      expect(cols.has('published_at'), `${key} 声明 supportsDraft 但 ${def.table} 没有 published_at`).toBe(true)
    }
    // 反之：声明了 published-at 字段却不支持草稿，属于定义自相矛盾
    const hasPublishedField = Object.values(def.fields).some((f) => f.kind === 'published-at')
    if (hasPublishedField) {
      expect(def.supportsDraft, `${key} 有 published-at 字段但 supportsDraft 为 false`).toBe(true)
    }
  })

  // 表上 NOT NULL 且无默认值的列，若不在字段白名单里，
  // 通用 CRUD 的 INSERT 就永远缺这一列 —— 该集合根本无法新建。
  it.each(entries)('%s：必填列都能通过面板写入', async (key, def) => {
    if (def.readOnly) return

    const infos = await loadColumnInfo(def.table)
    const writable = new Set(Object.values(def.fields).map((f) => f.column))
    if (def.fixedFilter) writable.add(def.fixedFilter.column)
    if (def.autoSlug) writable.add(def.autoSlug.column)

    const unwritable = infos
      .filter((c) => c.notnull === 1 && c.dflt_value === null)
      .map((c) => c.name)
      .filter((name) => !AUTO_FILLED_ON_INSERT.has(name) && !writable.has(name))

    expect(
      unwritable,
      `${key}：${def.table} 上这些列 NOT NULL 但不在字段白名单里，新建必然失败`
    ).toEqual([])
  })

  it.each(entries)('%s：autoSlug 配置自洽', async (key, def) => {
    if (!def.autoSlug) return
    const cols = await loadColumns(def.table)
    expect(cols.has(def.autoSlug.column), `${key} 的 autoSlug 列 ${def.autoSlug.column} 不存在`).toBe(true)
    expect(
      Object.hasOwn(def.fields, def.autoSlug.from),
      `${key} 的 autoSlug.from ${def.autoSlug.from} 不是已登记字段`
    ).toBe(true)
  })

  it.each(entries)('%s：defaultSort 的列都存在', async (key, def) => {
    const cols = await loadColumns(def.table)
    for (const [col] of def.defaultSort) {
      expect(cols.has(col), `${key} 的 defaultSort 引用了不存在的列 ${def.table}.${col}`).toBe(true)
    }
  })

  it.each(entries)('%s：searchColumns 与 labelColumn 的列都存在', async (key, def) => {
    const cols = await loadColumns(def.table)
    for (const col of def.searchColumns) {
      expect(cols.has(col), `${key} 的 searchColumns 引用了不存在的列 ${def.table}.${col}`).toBe(true)
    }
    expect(cols.has(def.labelColumn), `${key} 的 labelColumn ${def.table}.${def.labelColumn} 不存在`).toBe(true)
  })

  it.each(entries)('%s：fixedFilter 与 sideTable 的列都存在', async (key, def) => {
    const cols = await loadColumns(def.table)

    if (def.fixedFilter) {
      expect(cols.has(def.fixedFilter.column), `${key} 的 fixedFilter 列 ${def.fixedFilter.column} 不存在`).toBe(true)
      // 判别列不能同时出现在字段白名单里，否则客户端可绕过视图边界
      const exposed = Object.values(def.fields).some((f) => f.column === def.fixedFilter!.column)
      expect(exposed, `${key} 把判别列 ${def.fixedFilter.column} 暴露进了字段白名单`).toBe(false)
    }

    if (def.sideTable) {
      const sideCols = await loadColumns(def.sideTable.table)
      expect(sideCols.size, `${key} 的副表 ${def.sideTable.table} 不存在`).toBeGreaterThan(0)
      expect(sideCols.has(def.sideTable.fk), `${key} 的副表缺少外键列 ${def.sideTable.fk}`).toBe(true)

      for (const [fieldName, field] of Object.entries(def.sideTable.fields)) {
        expect(
          sideCols.has(field.column),
          `${key}.${fieldName} → ${def.sideTable.table}.${field.column} 不存在`
        ).toBe(true)
        // 副表列名与主表重名会让 LEFT JOIN 的拉平结果相互覆盖
        expect(cols.has(field.column), `${key} 的副表列 ${field.column} 与主表同名`).toBe(false)
      }
    }
  })
})
