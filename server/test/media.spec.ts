/**
 * GET /media/<key>：面板上传的图片读取。
 *
 * 上传把对象写进 R2 并返回 /media/<key>，前端据此拼出绝对地址。
 * 此前没有任何路由提供该路径 —— 上传的图片只写不读，全部 404。
 * 这里同时锁住 key 白名单：桶里的其他对象不能经公开路径取出。
 */
import { env } from 'cloudflare:test'
import { describe, it, expect, beforeAll } from 'vitest'
import app from '../src/index'

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13])
const VALID_KEY = 'panel/lx7f2a-0a1b2c3d.png'

beforeAll(async () => {
  await env.UPLOADS.put(VALID_KEY, PNG_BYTES, {
    httpMetadata: { contentType: 'image/png' },
  })
  // 桶里的非上传对象，用于验证不会被公开路径取出
  await env.UPLOADS.put('backups/secret-dump.sql', 'SENSITIVE')
})

describe('GET /media/<key>', () => {
  it('取回上传的对象，带上正确的 Content-Type', async () => {
    const res = await app.request(`https://test.local/media/${VALID_KEY}`, {}, env)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/png')

    const body = new Uint8Array(await res.arrayBuffer())
    expect(body.length).toBe(PNG_BYTES.length)
  })

  it('长期强缓存 + nosniff', async () => {
    const res = await app.request(`https://test.local/media/${VALID_KEY}`, {}, env)
    expect(res.headers.get('cache-control')).toContain('immutable')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('不存在的 key → 404', async () => {
    const res = await app.request('https://test.local/media/panel/aaaa-00000000.png', {}, env)
    expect(res.status).toBe(404)
  })

  it('panel/ 以外的对象一律 404，即便桶里真的存在', async () => {
    const res = await app.request('https://test.local/media/backups/secret-dump.sql', {}, env)
    expect(res.status).toBe(404)
    expect(await res.text()).not.toContain('SENSITIVE')
  })

  it('路径穿越与不合规扩展名被 key 白名单挡下', async () => {
    for (const key of [
      'panel/../backups/secret-dump.sql',
      'panel/evil-00000000.svg',
      'panel/evil-00000000.html',
      'panel/no-suffix',
      '../../etc/passwd',
    ]) {
      const res = await app.request(`https://test.local/media/${key}`, {}, env)
      expect(res.status, `key=${key}`).toBe(404)
    }
  })
})
