/**
 * 媒体上传：POST /panel/upload multipart。
 * 校验魔数（jpeg/png/webp/gif），SVG 拒绝；
 * 大小限额按字段类型：avatar 4MB / 默认 8MB / coverImage 12MB；
 * 存 R2 返回 { data: [{ id, url, name }] }。
 */
import type { Context } from 'hono'
import { fail, ok } from '../lib/respond'
import { recordAuditLog } from './audit'

const MB = 1024 * 1024

function limitForField(fieldName: string | undefined): number {
  if (fieldName === 'avatar') return 4 * MB
  if (fieldName === 'coverImage' || fieldName === 'cover_image') return 12 * MB
  return 8 * MB
}

/** 魔数嗅探：只放行 jpeg / png / webp / gif；SVG 一律拒绝。 */
function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg'
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png'
  // GIF: 47 49 46 38 (GIF8)
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return 'gif'
  // WEBP: RIFF....WEBP
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'webp'
  }
  return null
}

const EXT_BY_TYPE: Record<string, string> = { jpeg: 'jpg', png: 'png', webp: 'webp', gif: 'gif' }

export async function handleUpload(
  c: Context<{ Bindings: { DB: D1Database; UPLOADS?: R2Bucket }; Variables: Record<string, never> }>
): Promise<Response> {
  let form: FormData
  try {
    form = await c.req.formData()
  } catch {
    return fail(400, 'invalid_multipart')
  }

  const files = (form.getAll('files') as unknown[]).filter(
    (entry): entry is File => typeof entry === 'object' && entry !== null && 'arrayBuffer' in entry
  )
  if (files.length === 0) return fail(400, 'no_file')

  const fieldNameRaw = form.get('fieldName')
  const fieldName = typeof fieldNameRaw === 'string' ? fieldNameRaw : undefined
  const collectionRaw = form.get('collection')
  const targetCollection = typeof collectionRaw === 'string' ? collectionRaw : 'upload'

  const maxBytes = limitForField(fieldName)
  const assets: Array<Record<string, unknown>> = []

  for (const file of files) {
    if (file.size > maxBytes) {
      await recordAuditLog(c as never, {
        action: 'upload',
        targetCollection,
        payloadSummary: `上传失败：文件 ${file.name} 超过 ${Math.round(maxBytes / MB)} MB 限制`,
      })
      return fail(400, 'file_too_large')
    }

    const buffer = new Uint8Array(await file.arrayBuffer())
    const imageType = sniffImageType(buffer)
    if (!imageType) {
      // 含 SVG（文本型 image/*）在内的非白名单魔数一律拒绝
      await recordAuditLog(c as never, {
        action: 'upload',
        targetCollection,
        payloadSummary: `上传失败：文件 ${file.name} 类型不被允许`,
      })
      return fail(400, 'unsupported_media_type')
    }

    if (!c.env.UPLOADS) {
      return fail(500, 'r2_not_configured')
    }

    const key = `panel/${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${EXT_BY_TYPE[imageType]}`
    await c.env.UPLOADS.put(key, buffer, {
      httpMetadata: { contentType: `image/${imageType}` },
    })

    assets.push({
      id: key,
      url: `/media/${key}`,
      name: file.name,
      alternativeText: null,
    })
  }

  await recordAuditLog(c as never, {
    action: 'upload',
    targetCollection,
    payloadSummary: `上传 ${assets.length} 个文件${fieldName ? `（字段 ${fieldName}）` : ''}`,
  })

  return ok(assets)
}
