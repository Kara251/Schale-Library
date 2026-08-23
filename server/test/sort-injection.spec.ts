/**
 * 公开端点排序参数的注入面。
 *
 * ORDER BY 片段是拼接进 SQL 的，排序键必须严格走白名单：
 * - 原型链属性（constructor/toString/…）不能被当成命中，
 *   否则 map[userInput] 返回函数对象，拼进 SQL 让无认证端点 500；
 * - 不能有「未命中就原样透传」的兜底 —— events 曾对含点的字段名放行，
 *   等于把用户输入直接送进 ORDER BY。
 */
import { env } from 'cloudflare:test'
import { describe, it, expect, beforeAll } from 'vitest'
import { BASELINE_STATEMENTS } from './baseline'
import { applyMigration } from './helpers'
import app from '../src/index'
import { buildOrderBy, lookupSortColumn } from '../src/lib/sort'

/** 所有接受 sort 参数的公开列表端点。 */
const SORTABLE_ENDPOINTS = [
  '/api/announcements',
  '/api/creators',
  '/api/students',
  '/api/works',
  '/api/online-events',
  '/api/offline-events',
]

/** 原型链属性 + 拼接类载荷。 */
const HOSTILE_SORT_KEYS = [
  'constructor',
  '__proto__',
  'toString',
  'valueOf',
  'hasOwnProperty',
  'e.start_time',
  'e.id, (SELECT 1)',
  '(SELECT 1)',
  '1; DROP TABLE users',
  "name' OR '1'='1",
  'name)) UNION SELECT 1--',
]

beforeAll(async () => {
  for (const statement of BASELINE_STATEMENTS) {
    await env.DB.prepare(statement).run()
  }
  await applyMigration(env.DB, 'migrations/0002_works.sql')
})

describe('lookupSortColumn 只认自有属性', () => {
  const columns = { name: 'st.name', createdAt: 'st.created_at' }

  it('白名单内的键正常返回列名', () => {
    expect(lookupSortColumn(columns, 'name')).toBe('st.name')
  })

  it('原型链属性一律不命中', () => {
    for (const key of ['constructor', '__proto__', 'toString', 'valueOf', 'hasOwnProperty']) {
      expect(lookupSortColumn(columns, key), `${key} 不应命中`).toBeNull()
    }
  })

  it('未命中时用 fallback，绝不透传输入', () => {
    const sql = buildOrderBy(columns, [{ field: 'e.id, (SELECT 1)', dir: 'asc' }], 'st.name ASC')
    expect(sql).toBe('st.name ASC')
    expect(sql).not.toContain('SELECT')
  })

  it('方向只可能是 ASC/DESC 两个常量', () => {
    const sql = buildOrderBy(columns, [{ field: 'name', dir: 'desc' }], 'st.name ASC')
    expect(sql).toBe('st.name DESC')
  })
})

describe('公开端点对恶意 sort 参数不报错', () => {
  for (const endpoint of SORTABLE_ENDPOINTS) {
    it(`${endpoint} 面对全部载荷都返回 200`, async () => {
      for (const key of HOSTILE_SORT_KEYS) {
        const single = await app.request(
          `https://test.local${endpoint}?sort=${encodeURIComponent(key)}:asc`,
          {},
          env
        )
        expect(single.status, `${endpoint} sort=${key}`).toBe(200)

        const indexed = await app.request(
          `https://test.local${endpoint}?sort[0]=${encodeURIComponent(key)}:desc`,
          {},
          env
        )
        expect(indexed.status, `${endpoint} sort[0]=${key}`).toBe(200)
      }
    })
  }

  it('恶意排序不会破坏 users 表', async () => {
    await app.request(
      `https://test.local/api/students?sort=${encodeURIComponent('1; DROP TABLE users')}:asc`,
      {},
      env
    )
    const table = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    ).first<{ name: string }>()
    expect(table?.name).toBe('users')
  })
})
