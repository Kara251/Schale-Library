/**
 * 媒体读取：GET /media/<key> —— 从 R2 取回面板上传的图片。
 *
 * 上传（panel/upload.ts）把对象存进 R2 并返回 /media/<key>，
 * 前端 getMediaUrl 会把它补成 https://api.bakivo.com/media/<key>。
 * 此前没有任何路由提供这个路径，上传的图片只写不读，全部 404。
 *
 * 只放行 panel/ 前缀：桶里若存了别的东西（备份、导出），不应经由公开路径泄出。
 */
import { Hono } from 'hono'

export const mediaRoutes = new Hono<{ Bindings: { UPLOADS?: R2Bucket } }>()

/** 上传侧生成的 key 形如 panel/<base36>-<8位hex>.<ext>，据此严格校验。 */
const ALLOWED_KEY = /^panel\/[a-z0-9]+-[0-9a-f]{8}\.(jpg|png|webp|gif)$/

mediaRoutes.get('/media/:key{.+}', async (c) => {
  const key = c.req.param('key')
  if (!ALLOWED_KEY.test(key)) {
    return c.notFound()
  }
  if (!c.env.UPLOADS) {
    return c.text('R2 not configured', 500)
  }

  const object = await c.env.UPLOADS.get(key)
  if (!object) {
    return c.notFound()
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  // key 含随机段且不复用，内容永不变更 → 可长期强缓存
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  // 防止把用户上传当作可执行/可嵌入文档处理
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Content-Disposition', 'inline')

  return new Response(object.body, { headers })
})
