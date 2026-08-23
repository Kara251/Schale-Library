/**
 * 面板关联字段：对外只认 documentId，落库是数字外键。
 *
 * 此前读写两侧都直接用数字外键：面板列表返回的 id 是 documentId，
 * 关联选择器拿 documentId 提交 → Number() 校验失败；即便提交数字，
 * 读回来也是数字，与选项列表（documentId 为键）匹配不上。
 * 两个方向都锁住。
 */
import { env } from 'cloudflare:test'
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { BASELINE_STATEMENTS } from './baseline'
import { hashPassword } from '../src/auth/password'
import { createSession } from '../src/auth/session'
import app from '../src/index'

const ADMIN = { identifier: 'rel-admin', password: 'rel-pass-12345' }

async function authed(path: string, init?: RequestInit): Promise<Response> {
  const user = await env.DB.prepare('SELECT id FROM users WHERE username = ?1')
    .bind(ADMIN.identifier)
    .first<{ id: number }>()
  const token = await createSession(env.DB, user!.id)
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

/** 直接落一所学院，返回其数字主键与 documentId。 */
async function seedSchool(slug: string): Promise<{ id: number; documentId: string }> {
  const now = Date.now()
  const documentId = `sc-${slug}`
  const row = await env.DB.prepare(
    `INSERT INTO schools (document_id, slug, name_json, sort_order, created_at, updated_at, published_at)
     VALUES (?1, ?2, ?3, 0, ?4, ?4, ?4) RETURNING id`
  )
    .bind(documentId, slug, JSON.stringify({ 'zh-Hans': slug }), now)
    .first<{ id: number }>()
  return { id: row!.id, documentId }
}

beforeAll(async () => {
  for (const statement of BASELINE_STATEMENTS) {
    await env.DB.prepare(statement).run()
  }
  const passwordHash = await hashPassword(ADMIN.password)
  await env.DB.prepare(
    "INSERT INTO users (username, email, password_hash, role, blocked, confirmed, created_at) VALUES (?1, 'rel@example.com', ?2, 'maintainer', 0, 1, ?3)"
  )
    .bind(ADMIN.identifier, passwordHash, Date.now())
    .run()
})

beforeEach(async () => {
  await env.DB.prepare('DELETE FROM students').run()
  await env.DB.prepare('DELETE FROM schools').run()
})

describe('students.slug 自动生成', () => {
  it('中文名转写为空时回退 documentId，新建仍然成功', async () => {
    const res = await authed('/panel/students', {
      method: 'POST',
      body: JSON.stringify({ data: { name: '小春' } }),
    })
    // slug 是 NOT NULL 且前后端表单都不暴露，不自动补齐就会 400
    expect(res.status).toBe(200)
    const created = (await res.json()) as { data: { documentId: string } }

    const row = await env.DB.prepare('SELECT slug FROM students WHERE document_id = ?1')
      .bind(created.data.documentId)
      .first<{ slug: string }>()
    expect(row!.slug).toBe(created.data.documentId)
  })

  it('ASCII 名转写成可读 slug', async () => {
    const created = (await (
      await authed('/panel/students', {
        method: 'POST',
        body: JSON.stringify({ data: { name: 'Hoshino Takanashi' } }),
      })
    ).json()) as { data: { documentId: string } }

    const row = await env.DB.prepare('SELECT slug FROM students WHERE document_id = ?1')
      .bind(created.data.documentId)
      .first<{ slug: string }>()
    expect(row!.slug).toBe('hoshino-takanashi')
  })

  it('同名再建一次不会撞 UNIQUE 约束', async () => {
    const first = await authed('/panel/students', {
      method: 'POST',
      body: JSON.stringify({ data: { name: 'Shiroko' } }),
    })
    const second = await authed('/panel/students', {
      method: 'POST',
      body: JSON.stringify({ data: { name: 'Shiroko' } }),
    })
    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    const rows = await env.DB.prepare('SELECT slug FROM students ORDER BY id').all<{ slug: string }>()
    const slugs = rows.results.map((r) => r.slug)
    expect(new Set(slugs).size).toBe(2)
    expect(slugs[0]).toBe('shiroko')
  })
})

describe('关联字段以 documentId 读写', () => {
  it('用 documentId 新建关联，落库是数字外键', async () => {
    const school = await seedSchool('abydos')

    const res = await authed('/panel/students', {
      method: 'POST',
      body: JSON.stringify({ data: { name: '小春', school: school.documentId } }),
    })
    expect(res.status).toBe(200)
    const created = (await res.json()) as { data: { documentId: string; school: string } }

    // 读回来仍是 documentId
    expect(created.data.school).toBe(school.documentId)

    // 落库是数字外键
    const row = await env.DB.prepare('SELECT school_id FROM students WHERE document_id = ?1')
      .bind(created.data.documentId)
      .first<{ school_id: number }>()
    expect(row!.school_id).toBe(school.id)
  })

  it('列表与单条读取都还原成 documentId', async () => {
    const school = await seedSchool('gehenna')
    const created = (await (
      await authed('/panel/students', {
        method: 'POST',
        body: JSON.stringify({ data: { name: '爱丽丝', school: school.documentId } }),
      })
    ).json()) as { data: { documentId: string } }

    const list = (await (await authed('/panel/students?page=1&pageSize=10&status=all')).json()) as {
      data: Array<{ school: string }>
    }
    expect(list.data[0]!.school).toBe(school.documentId)

    const single = (await (await authed(`/panel/students/${created.data.documentId}`)).json()) as {
      data: { school: string }
    }
    expect(single.data.school).toBe(school.documentId)
  })

  it('更新关联到另一所学院', async () => {
    const a = await seedSchool('trinity')
    const b = await seedSchool('millennium')
    const created = (await (
      await authed('/panel/students', {
        method: 'POST',
        body: JSON.stringify({ data: { name: '优香', school: a.documentId } }),
      })
    ).json()) as { data: { documentId: string } }

    const updated = (await (
      await authed(`/panel/students/${created.data.documentId}`, {
        method: 'PUT',
        body: JSON.stringify({ data: { school: b.documentId } }),
      })
    ).json()) as { data: { school: string } }
    expect(updated.data.school).toBe(b.documentId)

    const row = await env.DB.prepare('SELECT school_id FROM students WHERE document_id = ?1')
      .bind(created.data.documentId)
      .first<{ school_id: number }>()
    expect(row!.school_id).toBe(b.id)
  })

  it('关联对象不存在 → 400，而不是外键约束错', async () => {
    const res = await authed('/panel/students', {
      method: 'POST',
      body: JSON.stringify({ data: { name: '幽灵', school: 'sc-does-not-exist' } }),
    })
    expect(res.status).toBe(400)
  })

  it('关联可以清空', async () => {
    const school = await seedSchool('hyakkiyako')
    const created = (await (
      await authed('/panel/students', {
        method: 'POST',
        body: JSON.stringify({ data: { name: '伊织', school: school.documentId } }),
      })
    ).json()) as { data: { documentId: string } }

    const cleared = (await (
      await authed(`/panel/students/${created.data.documentId}`, {
        method: 'PUT',
        body: JSON.stringify({ data: { school: '' } }),
      })
    ).json()) as { data: { school: string | null } }
    expect(cleared.data.school).toBeNull()
  })

  it('无关联的行读出 null，不报错', async () => {
    const created = (await (
      await authed('/panel/students', {
        method: 'POST',
        body: JSON.stringify({ data: { name: '无学院' } }),
      })
    ).json()) as { data: { school: string | null } }
    expect(created.data.school).toBeNull()
  })
})
