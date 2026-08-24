/**
 * 考据策展 singleType：GET / PUT /panel/research-curator。
 * 此前只有表没有路由，后台「考据策展」页整页取数失败。
 */
import { env } from 'cloudflare:test'
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { BASELINE_STATEMENTS } from './baseline'
import { hashPassword } from '../src/auth/password'
import { createSession } from '../src/auth/session'
import app from '../src/index'

const ADMIN = { identifier: 'curator-admin', password: 'curator-pass-12345' }
let userId: number

async function authed(path: string, init?: RequestInit): Promise<Response> {
  const token = await createSession(env.DB, userId)
  return app.request(
    `https://test.local/api${path}`,
    {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    },
    env
  )
}

async function seedEntry(slug: string, published = true): Promise<string> {
  const now = Date.now()
  const documentId = `re-${slug}`
  await env.DB.prepare(
    `INSERT INTO research_entries (document_id, slug, title_json, created_at, updated_at, published_at)
     VALUES (?1, ?2, ?3, ?4, ?4, ?5)`
  )
    .bind(documentId, slug, JSON.stringify({ 'zh-Hans': `条目 ${slug}` }), now, published ? now : null)
    .run()
  return documentId
}

beforeAll(async () => {
  for (const statement of BASELINE_STATEMENTS) {
    await env.DB.prepare(statement).run()
  }
  const passwordHash = await hashPassword(ADMIN.password)
  await env.DB.prepare(
    "INSERT INTO users (username, email, password_hash, role, blocked, confirmed, created_at) VALUES (?1, 'curator@example.com', ?2, 'maintainer', 0, 1, ?3)"
  )
    .bind(ADMIN.identifier, passwordHash, Date.now())
    .run()
  const user = await env.DB.prepare('SELECT id FROM users WHERE username = ?1')
    .bind(ADMIN.identifier)
    .first<{ id: number }>()
  userId = user!.id
})

beforeEach(async () => {
  await env.DB.prepare('DELETE FROM curator').run()
  await env.DB.prepare('DELETE FROM research_entries').run()
})

describe('GET /panel/research-curator', () => {
  it('未初始化时返回空结构而非 404', async () => {
    const res = await authed('/panel/research-curator?locale=zh-Hans')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { featured_entry: null } }
    expect(body.data.featured_entry).toBeNull()
  })

  it('未认证 → 401', async () => {
    const res = await app.request('https://test.local/api/panel/research-curator', {}, env)
    expect(res.status).toBe(401)
  })
})

describe('PUT /panel/research-curator', () => {
  it('写入后可读回，featured_entry 展开为 id/title/slug', async () => {
    const documentId = await seedEntry('kivotos')

    const res = await authed('/panel/research-curator', {
      method: 'PUT',
      body: JSON.stringify({
        data: { featured_entry: documentId, pick_note: '本期精选', path_description: '推荐路径' },
      }),
    })
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      data: {
        featured_entry: { id: string; title: string; slug: string }
        pick_note: string
        path_description: string
      }
    }
    expect(body.data.featured_entry.id).toBe(documentId)
    expect(body.data.featured_entry.slug).toBe('kivotos')
    expect(body.data.pick_note).toBe('本期精选')

    const reread = (await (await authed('/panel/research-curator')).json()) as {
      data: { pick_note: string }
    }
    expect(reread.data.pick_note).toBe('本期精选')
  })

  it('只提交部分字段时，其余字段保持不变', async () => {
    const documentId = await seedEntry('abydos')
    await authed('/panel/research-curator', {
      method: 'PUT',
      body: JSON.stringify({ data: { featured_entry: documentId, pick_note: '原始备注' } }),
    })

    await authed('/panel/research-curator', {
      method: 'PUT',
      body: JSON.stringify({ data: { path_description: '只改这个' } }),
    })

    const body = (await (await authed('/panel/research-curator')).json()) as {
      data: { featured_entry: { id: string } | null; pick_note: string; path_description: string }
    }
    expect(body.data.featured_entry?.id).toBe(documentId)
    expect(body.data.pick_note).toBe('原始备注')
    expect(body.data.path_description).toBe('只改这个')
  })

  it('指向不存在的条目 → 400', async () => {
    const res = await authed('/panel/research-curator', {
      method: 'PUT',
      body: JSON.stringify({ data: { featured_entry: 're-does-not-exist' } }),
    })
    expect(res.status).toBe(400)
  })

  it('未登记字段 → 400', async () => {
    const res = await authed('/panel/research-curator', {
      method: 'PUT',
      body: JSON.stringify({ data: { evil_column: 'x' } }),
    })
    expect(res.status).toBe(400)
  })

  it('精选条目被下架后按未设置处理，不报错', async () => {
    const documentId = await seedEntry('draft-entry', false)
    // 先以已发布状态写入，再改为草稿
    await env.DB.prepare('UPDATE research_entries SET published_at = ?1 WHERE document_id = ?2')
      .bind(Date.now(), documentId)
      .run()
    await authed('/panel/research-curator', {
      method: 'PUT',
      body: JSON.stringify({ data: { featured_entry: documentId } }),
    })
    await env.DB.prepare('UPDATE research_entries SET published_at = NULL WHERE document_id = ?1')
      .bind(documentId)
      .run()

    const res = await authed('/panel/research-curator')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { featured_entry: null } }
    expect(body.data.featured_entry).toBeNull()
  })

  it('写操作落审计日志', async () => {
    await env.DB.prepare('DELETE FROM admin_audit_logs').run()
    const documentId = await seedEntry('audit-entry')
    await authed('/panel/research-curator', {
      method: 'PUT',
      body: JSON.stringify({ data: { featured_entry: documentId } }),
    })

    const log = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM admin_audit_logs WHERE target_collection = 'research-curator'"
    ).first<{ n: number }>()
    expect(log!.n).toBe(1)
  })
})
