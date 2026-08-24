/**
 * 发布状态：草稿 / 已排期 / 已发布。
 *
 * published_at 的三种语义此前只实现了两种 —— 未来时间被当成已发布立即放出，
 * 定时发布不但没有界面，底层语义本身就是错的。
 * 另外「启用」与「发布」原本是两个独立开关，只勾一个会静默不显示；
 * 现在面板只给一个发布控件，is_active 由服务端联动。
 */
import { env } from 'cloudflare:test'
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { BASELINE_STATEMENTS } from './baseline'
import { hashPassword } from '../src/auth/password'
import { createSession } from '../src/auth/session'
import { publishStatusOf } from '../src/lib/published'
import app from '../src/index'

const ADMIN = { identifier: 'pub-admin', password: 'pub-pass-12345' }
let userId: number

const HOUR = 60 * 60 * 1000

async function authed(path: string, init?: RequestInit): Promise<Response> {
  const token = await createSession(env.DB, userId)
  return app.request(
    `https://test.local/api${path}`,
    {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
    },
    env
  )
}

beforeAll(async () => {
  for (const statement of BASELINE_STATEMENTS) {
    await env.DB.prepare(statement).run()
  }
  const passwordHash = await hashPassword(ADMIN.password)
  await env.DB.prepare(
    "INSERT INTO users (username, email, password_hash, role, blocked, confirmed, created_at) VALUES (?1, 'pub@example.com', ?2, 'maintainer', 0, 1, ?3)"
  )
    .bind(ADMIN.identifier, passwordHash, Date.now())
    .run()
  const user = await env.DB.prepare('SELECT id FROM users WHERE username = ?1')
    .bind(ADMIN.identifier)
    .first<{ id: number }>()
  userId = user!.id
})

beforeEach(async () => {
  await env.DB.prepare('DELETE FROM announcements').run()
})

describe('publishStatusOf', () => {
  it('区分草稿 / 已排期 / 已发布', () => {
    const now = Date.now()
    expect(publishStatusOf(null, now)).toBe('draft')
    expect(publishStatusOf(now - HOUR, now)).toBe('published')
    expect(publishStatusOf(now + HOUR, now)).toBe('scheduled')
  })
})

describe('定时发布', () => {
  it('未来时间的内容不出现在公开 API', async () => {
    const future = new Date(Date.now() + 2 * HOUR).toISOString()
    const created = await authed('/panel/announcements', {
      method: 'POST',
      body: JSON.stringify({ data: { title: '排期公告', publishedAt: future } }),
    })
    expect(created.status).toBe(200)
    const body = (await created.json()) as { data: { status: string } }
    expect(body.data.status).toBe('scheduled')

    const publicRes = await app.request('https://test.local/api/announcements', {}, env)
    const publicBody = (await publicRes.json()) as { data: unknown[] }
    expect(publicBody.data.length).toBe(0)
  })

  it('时间到点后自动出现在公开 API', async () => {
    const past = new Date(Date.now() - HOUR).toISOString()
    await authed('/panel/announcements', {
      method: 'POST',
      body: JSON.stringify({ data: { title: '已到点公告', publishedAt: past } }),
    })

    const publicRes = await app.request('https://test.local/api/announcements', {}, env)
    const publicBody = (await publicRes.json()) as { data: Array<{ title: string }> }
    expect(publicBody.data.map((d) => d.title)).toEqual(['已到点公告'])
  })

  it('草稿既不公开也不算排期', async () => {
    const created = await authed('/panel/announcements', {
      method: 'POST',
      body: JSON.stringify({ data: { title: '草稿公告', publishedAt: false } }),
    })
    const body = (await created.json()) as { data: { status: string } }
    expect(body.data.status).toBe('draft')

    const publicRes = await app.request('https://test.local/api/announcements', {}, env)
    expect(((await publicRes.json()) as { data: unknown[] }).data.length).toBe(0)
  })

  it('面板列表可按三种状态筛选', async () => {
    await authed('/panel/announcements', {
      method: 'POST',
      body: JSON.stringify({ data: { title: '已发布', publishedAt: true } }),
    })
    await authed('/panel/announcements', {
      method: 'POST',
      body: JSON.stringify({ data: { title: '排期中', publishedAt: new Date(Date.now() + HOUR).toISOString() } }),
    })
    await authed('/panel/announcements', {
      method: 'POST',
      body: JSON.stringify({ data: { title: '草稿', publishedAt: false } }),
    })

    const pick = async (status: string) => {
      const res = await authed(`/panel/announcements?page=1&pageSize=20&status=${status}`)
      const body = (await res.json()) as { data: Array<{ title: string }> }
      return body.data.map((d) => d.title)
    }

    expect(await pick('published')).toEqual(['已发布'])
    expect(await pick('scheduled')).toEqual(['排期中'])
    expect(await pick('draft')).toEqual(['草稿'])
    expect((await pick('all')).length).toBe(3)
  })
})

describe('可见性判定不能在模块加载时固定', () => {
  it('publishedSql 每次调用都取当前时间', async () => {
    const { publishedSql } = await import('../src/lib/published')
    const first = publishedSql()
    // 跨过至少 1ms，确保时间戳确实会变
    await new Promise((resolve) => setTimeout(resolve, 2))
    const second = publishedSql()
    expect(first).not.toBe(second)
  })

  it('刚发布的内容立刻能被公开 API 查到', async () => {
    // 模块级常量会把时间戳固定在 isolate 启动那一刻，
    // 导致「之后」发布的内容在该 isolate 存活期间一律查不出来（线上复现过）。
    await new Promise((resolve) => setTimeout(resolve, 5))

    await authed('/panel/announcements', {
      method: 'POST',
      body: JSON.stringify({ data: { title: '刚刚发布', publishedAt: true } }),
    })

    const res = await app.request('https://test.local/api/announcements', {}, env)
    const body = (await res.json()) as { data: Array<{ title: string }> }
    expect(body.data.map((d) => d.title)).toContain('刚刚发布')
  })
})

describe('is_active 跟随发布状态', () => {
  it('发布时置 1，转草稿时置 0', async () => {
    const created = (await (
      await authed('/panel/announcements', {
        method: 'POST',
        body: JSON.stringify({ data: { title: '联动', publishedAt: true } }),
      })
    ).json()) as { data: { documentId: string } }

    const afterPublish = await env.DB.prepare('SELECT is_active FROM announcements WHERE document_id = ?1')
      .bind(created.data.documentId)
      .first<{ is_active: number }>()
    expect(afterPublish!.is_active).toBe(1)

    await authed(`/panel/announcements/${created.data.documentId}`, {
      method: 'PUT',
      body: JSON.stringify({ data: { publishedAt: false } }),
    })

    const afterDraft = await env.DB.prepare('SELECT is_active FROM announcements WHERE document_id = ?1')
      .bind(created.data.documentId)
      .first<{ is_active: number }>()
    expect(afterDraft!.is_active).toBe(0)
  })

  it('排期也算「启用」—— 到点后无需再操作即可显示', async () => {
    const created = (await (
      await authed('/panel/announcements', {
        method: 'POST',
        body: JSON.stringify({ data: { title: '排期联动', publishedAt: new Date(Date.now() + HOUR).toISOString() } }),
      })
    ).json()) as { data: { documentId: string } }

    const row = await env.DB.prepare('SELECT is_active FROM announcements WHERE document_id = ?1')
      .bind(created.data.documentId)
      .first<{ is_active: number }>()
    expect(row!.is_active).toBe(1)
  })

  it('不触碰发布状态的更新不会改动 is_active', async () => {
    const created = (await (
      await authed('/panel/announcements', {
        method: 'POST',
        body: JSON.stringify({ data: { title: '只改标题', publishedAt: true } }),
      })
    ).json()) as { data: { documentId: string } }

    await authed(`/panel/announcements/${created.data.documentId}`, {
      method: 'PUT',
      body: JSON.stringify({ data: { title: '改过的标题' } }),
    })

    const row = await env.DB.prepare('SELECT is_active FROM announcements WHERE document_id = ?1')
      .bind(created.data.documentId)
      .first<{ is_active: number }>()
    expect(row!.is_active).toBe(1)
  })

  it('isActive 不再是可写字段', async () => {
    const res = await authed('/panel/announcements', {
      method: 'POST',
      body: JSON.stringify({ data: { title: '越权', isActive: false } }),
    })
    expect(res.status).toBe(400)
  })
})
