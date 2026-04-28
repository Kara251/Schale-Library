import { errors } from '@strapi/utils'
import crypto from 'node:crypto'

const { ApplicationError, NotFoundError } = errors

type PanelCollectionKey =
  | 'announcements'
  | 'works'
  | 'online-events'
  | 'offline-events'
  | 'students'
  | 'bilibili-subscriptions'
  | 'sync-logs'
  | 'admin-audit-logs'

interface CollectionConfig {
  uid: any
  localized: boolean
  populate?: any
  searchFields: string[]
  defaultSort: string
  supportsDraft: boolean
  fields: string[]
  readOnly?: boolean
}

const COLLECTIONS: Record<PanelCollectionKey, CollectionConfig> = {
  announcements: {
    uid: 'api::announcement.announcement',
    localized: true,
    populate: ['coverImage'],
    searchFields: ['title'],
    defaultSort: 'updatedAt:desc',
    supportsDraft: true,
    fields: ['title', 'content', 'link', 'priority', 'isActive', 'coverImage', 'publishedAt'],
  },
  works: {
    uid: 'api::work.work',
    localized: true,
    populate: {
      coverImage: true,
      students: {
        fields: ['id', 'name'],
        populate: {
          avatar: true,
        },
      },
    },
    searchFields: ['title', 'author'],
    defaultSort: 'updatedAt:desc',
    supportsDraft: true,
    fields: [
      'title',
      'author',
      'description',
      'nature',
      'workType',
      'link',
      'isActive',
      'sourceUrl',
      'sourcePlatform',
      'sourceId',
      'isAutoImported',
      'importedAt',
      'coverImageUrl',
      'originalPublishDate',
      'coverImage',
      'students',
      'publishedAt',
    ],
  },
  'online-events': {
    uid: 'api::online-event.online-event',
    localized: true,
    populate: ['coverImage'],
    searchFields: ['title', 'organizer'],
    defaultSort: 'startTime:desc',
    supportsDraft: true,
    fields: ['title', 'nature', 'startTime', 'endTime', 'link', 'coverImage', 'organizer', 'description', 'publishedAt'],
  },
  'offline-events': {
    uid: 'api::offline-event.offline-event',
    localized: true,
    populate: ['coverImage'],
    searchFields: ['title', 'organizer', 'location'],
    defaultSort: 'startTime:desc',
    supportsDraft: true,
    fields: ['title', 'nature', 'location', 'guests', 'startTime', 'endTime', 'link', 'coverImage', 'organizer', 'description', 'publishedAt'],
  },
  students: {
    uid: 'api::student.student',
    localized: true,
    populate: ['avatar'],
    searchFields: ['name', 'organization'],
    defaultSort: 'updatedAt:desc',
    supportsDraft: true,
    fields: ['name', 'school', 'organization', 'avatar', 'bio', 'publishedAt'],
  },
  'bilibili-subscriptions': {
    uid: 'api::bilibili-subscription.bilibili-subscription',
    localized: false,
    searchFields: ['upName', 'uid'],
    defaultSort: 'updatedAt:desc',
    supportsDraft: false,
    fields: ['upName', 'uid', 'isActive', 'defaultNature', 'autoPublishKeywords', 'notes'],
  },
  'sync-logs': {
    uid: 'api::sync-log.sync-log',
    localized: false,
    searchFields: ['targetName', 'message'],
    defaultSort: 'startedAt:desc',
    supportsDraft: false,
    fields: [],
    readOnly: true,
  },
  'admin-audit-logs': {
    uid: 'api::admin-audit-log.admin-audit-log',
    localized: false,
    searchFields: ['actorEmail', 'actorUsername', 'targetCollection', 'targetName', 'message'],
    defaultSort: 'createdAt:desc',
    supportsDraft: false,
    fields: [],
    readOnly: true,
  },
}

const SUPPORTED_LOCALES = new Set(['zh-Hans', 'en', 'ja'])
const RATE_LIMIT_UID = 'api::rate-limit-record.rate-limit-record' as any
const AUDIT_LOG_UID = 'api::admin-audit-log.admin-audit-log' as any
const DEFAULT_RATE_LIMIT = 60
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60 * 1000

function isPanelCollectionKey(value: string): value is PanelCollectionKey {
  return value in COLLECTIONS
}

function mapLocale(locale?: string | null): string | undefined {
  if (!locale) {
    return undefined
  }

  return SUPPORTED_LOCALES.has(locale) ? locale : undefined
}

function buildSearchFilters(fields: string[], search?: string) {
  const trimmedSearch = search?.trim()
  if (!trimmedSearch) {
    return {}
  }

  return {
    $or: fields.map((field) => ({
      [field]: {
        $containsi: trimmedSearch,
      },
    })),
  }
}

function buildStatusFilters(status: string | undefined, supportsDraft: boolean) {
  if (!supportsDraft || !status || status === 'all') {
    return {}
  }

  if (status === 'published') {
    return {
      publishedAt: {
        $notNull: true,
      },
    }
  }

  return {
    publishedAt: {
      $null: true,
    },
  }
}

function mergeFilters(...filters: Array<Record<string, unknown>>) {
  const entries = filters.filter((filter) => Object.keys(filter).length > 0)
  if (entries.length === 0) {
    return undefined
  }

  if (entries.length === 1) {
    return entries[0]
  }

  return { $and: entries }
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeRichValue(value: unknown) {
  if (typeof value === 'string') {
    return value
  }

  return ''
}

function normalizeDateTime(value: unknown) {
  if (!value) {
    return null
  }

  const normalizedValue = new Date(String(value))
  if (Number.isNaN(normalizedValue.getTime())) {
    throw new ApplicationError('日期格式无效')
  }

  return normalizedValue.toISOString()
}

function normalizeBoolean(value: unknown, defaultValue = false) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    if (value === 'true') return true
    if (value === 'false') return false
  }

  return defaultValue
}

function normalizeMediaValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const mediaId = Number(value)
  if (!Number.isFinite(mediaId)) {
    throw new ApplicationError('媒体 ID 无效')
  }

  return mediaId
}

function normalizeRelationList(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item))
}

function getClientIp(ctx: any) {
  const forwardedFor = ctx.request.headers['x-forwarded-for']
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim()
  }

  return ctx.request.ip || ctx.ip || undefined
}

function getActor(ctx: any) {
  const user = ctx.state?.user
  if (!user || typeof user !== 'object') {
    return {}
  }

  return {
    actorId: typeof user.id === 'number' ? user.id : undefined,
    actorEmail: typeof user.email === 'string' ? user.email : undefined,
    actorUsername: typeof user.username === 'string' ? user.username : undefined,
    actorRole: typeof user.role?.type === 'string' ? user.role.type : typeof user.role?.name === 'string' ? user.role.name : undefined,
  }
}

function getEntryLabel(entry: unknown) {
  if (!entry || typeof entry !== 'object') {
    return undefined
  }

  const record = entry as Record<string, unknown>
  return [record.title, record.name, record.upName, record.targetName]
    .find((value) => typeof value === 'string' && value.trim().length > 0) as string | undefined
}

async function recordAdminAuditLog(ctx: any, input: {
  action: 'create' | 'update' | 'delete' | 'upload' | 'sync-one' | 'sync-all'
  status: 'success' | 'failed'
  targetCollection: string
  targetId?: number
  targetName?: string
  locale?: string
  message?: string
  details?: Record<string, unknown>
}) {
  try {
    await strapi.entityService.create(AUDIT_LOG_UID, {
      data: {
        ...input,
        ...getActor(ctx),
        ip: getClientIp(ctx),
        userAgent: typeof ctx.request.headers['user-agent'] === 'string' ? ctx.request.headers['user-agent'] : undefined,
      },
    })
  } catch (error) {
    strapi.log.warn(`后台审计日志写入失败: ${(error as Error).message}`)
  }
}

function getUploadCandidates(input: unknown) {
  if (!input) {
    return []
  }

  return Array.isArray(input) ? input : [input]
}

function getUploadLimitMb(fieldName?: string) {
  const defaultMaxMb = Math.max(1, Number(process.env.ADMIN_PANEL_MAX_UPLOAD_MB || '8'))

  if (fieldName === 'avatar') {
    return Math.max(1, Number(process.env.ADMIN_PANEL_AVATAR_MAX_UPLOAD_MB || '4'))
  }

  if (fieldName === 'coverImage') {
    return Math.max(defaultMaxMb, Number(process.env.ADMIN_PANEL_COVER_MAX_UPLOAD_MB || '12'))
  }

  return defaultMaxMb
}

function validateUploadFiles(input: unknown, fieldName?: string) {
  const maxUploadMb = getUploadLimitMb(fieldName)
  const maxUploadBytes = maxUploadMb * 1024 * 1024
  const files = getUploadCandidates(input)

  if (files.length === 0) {
    throw new ApplicationError('未提供上传文件')
  }

  for (const file of files) {
    const mime = typeof file === 'object' && file && 'type' in file ? String((file as { type?: unknown }).type || '') : ''
    const size = typeof file === 'object' && file && 'size' in file ? Number((file as { size?: unknown }).size || 0) : 0

    if (!mime.startsWith('image/')) {
      throw new ApplicationError('仅允许上传图片文件')
    }

    if (size > maxUploadBytes) {
      throw new ApplicationError(`上传文件不得超过 ${maxUploadMb} MB`)
    }
  }
}

function pickAllowedFields(collection: PanelCollectionKey, input: Record<string, unknown>, locale?: string) {
  const config = COLLECTIONS[collection]
  const data: Record<string, unknown> = {}

  for (const field of config.fields) {
    if (!(field in input)) {
      continue
    }

    const value = input[field]

    switch (field) {
      case 'content':
      case 'description':
      case 'bio':
      case 'guests':
      case 'notes':
      case 'autoPublishKeywords':
        data[field] = normalizeRichValue(value)
        break
      case 'priority':
      case 'syncCount':
        data[field] = toNumber(value, 0)
        break
      case 'isActive':
      case 'isAutoImported':
        data[field] = normalizeBoolean(value)
        break
      case 'coverImage':
      case 'avatar':
        data[field] = normalizeMediaValue(value)
        break
      case 'students':
        data[field] = normalizeRelationList(value)
        break
      case 'startTime':
      case 'endTime':
      case 'importedAt':
      case 'originalPublishDate':
      case 'lastSyncAt':
        data[field] = normalizeDateTime(value)
        break
      case 'publishedAt': {
        const publishState = normalizeBoolean(value)
        data[field] = publishState ? new Date().toISOString() : null
        break
      }
      default:
        data[field] = value
    }
  }

  if (config.localized) {
    data.locale = mapLocale(locale)
  }

  return data
}

function ensureCollection(key: string): PanelCollectionKey {
  if (!isPanelCollectionKey(key)) {
    throw new NotFoundError('不支持的集合类型')
  }

  return key
}

function ensureWritableCollection(collection: PanelCollectionKey) {
  if (COLLECTIONS[collection].readOnly) {
    throw new ApplicationError('该集合为只读')
  }
}

function getInternalSecret() {
  return process.env.PANEL_INTERNAL_TOKEN || process.env.RATE_LIMIT_HASH_SECRET || process.env.APP_KEYS || 'development-rate-limit-secret'
}

function validateInternalToken(ctx: any) {
  const expectedToken = process.env.PANEL_INTERNAL_TOKEN

  if (!expectedToken) {
    if (process.env.NODE_ENV === 'production') {
      throw new ApplicationError('未配置内部接口令牌')
    }

    strapi.log.warn('PANEL_INTERNAL_TOKEN 未配置，仅允许开发环境使用内部限流接口')
    return
  }

  const providedToken = String(ctx.request.headers['x-panel-internal-token'] || '')
  const expected = Buffer.from(expectedToken)
  const provided = Buffer.from(providedToken)

  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    throw new ApplicationError('内部接口令牌无效')
  }
}

function hashRateLimitKey(scope: string, identifier: string) {
  return crypto
    .createHmac('sha256', getInternalSecret())
    .update(`${scope}:${identifier}`)
    .digest('hex')
}

function normalizeRateLimitInput(ctx: any) {
  const body = ctx.request.body || {}
  const scope = typeof body.scope === 'string' ? body.scope.trim().slice(0, 80) : ''
  const identifier = typeof body.identifier === 'string' ? body.identifier.trim().slice(0, 256) : ''
  const limit = Math.min(1000, Math.max(1, toNumber(body.limit, DEFAULT_RATE_LIMIT)))
  const windowMs = Math.min(60 * 60 * 1000, Math.max(1000, toNumber(body.windowMs, DEFAULT_RATE_LIMIT_WINDOW_MS)))

  if (!scope || !identifier) {
    throw new ApplicationError('限流参数无效')
  }

  return { scope, identifier, limit, windowMs }
}

async function cleanupExpiredRateLimits(now: Date) {
  if (Math.random() > 0.02) {
    return
  }

  try {
    await strapi.db.query(RATE_LIMIT_UID).deleteMany({
      where: {
        resetAt: {
          $lt: now.toISOString(),
        },
      },
    })
  } catch (error) {
    strapi.log.warn(`清理限流记录失败: ${(error as Error).message}`)
  }
}

async function checkRateLimit(ctx: any) {
  validateInternalToken(ctx)

  const { scope, identifier, limit, windowMs } = normalizeRateLimitInput(ctx)
  const now = new Date()
  const resetAt = new Date(now.getTime() + windowMs)
  const key = hashRateLimitKey(scope, identifier)

  await cleanupExpiredRateLimits(now)

  const records = await strapi.entityService.findMany(RATE_LIMIT_UID, {
    filters: { key },
    limit: 1,
  }) as Array<{ id: number; count?: number; resetAt?: string }>
  const record = records[0]

  if (!record || !record.resetAt || new Date(record.resetAt).getTime() <= now.getTime()) {
    const data = {
      key,
      scope,
      count: 1,
      resetAt: resetAt.toISOString(),
    }

    if (record) {
      await strapi.entityService.update(RATE_LIMIT_UID, record.id, { data })
    } else {
      await strapi.entityService.create(RATE_LIMIT_UID, { data })
    }

    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetAt: resetAt.toISOString(),
    }
  }

  const currentCount = Number(record.count || 0)
  if (currentCount >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
    }
  }

  await strapi.entityService.update(RATE_LIMIT_UID, record.id, {
    data: {
      count: currentCount + 1,
    },
  })

  return {
    allowed: true,
    remaining: Math.max(0, limit - currentCount - 1),
    resetAt: record.resetAt,
  }
}

async function listCollection(ctx: any, collection: PanelCollectionKey) {
  const config = COLLECTIONS[collection]
  const locale = mapLocale(ctx.query.locale)
  const page = Math.max(1, toNumber(ctx.query.page, 1))
  const pageSize = Math.min(100, Math.max(1, toNumber(ctx.query.pageSize, 12)))
  const start = (page - 1) * pageSize

  const filters = mergeFilters(
    buildSearchFilters(config.searchFields, ctx.query.search),
    buildStatusFilters(typeof ctx.query.status === 'string' ? ctx.query.status : undefined, config.supportsDraft)
  )

  const queryOptions: Record<string, unknown> = {
    filters,
    sort: config.defaultSort,
    start,
    limit: pageSize,
    populate: config.populate,
  }

  if (config.localized && locale) {
    queryOptions.locale = locale
  }

  const [data, total] = await Promise.all([
    strapi.entityService.findMany(config.uid as any, queryOptions),
    strapi.documents(config.uid as any).count({
      filters,
      locale,
    }),
  ])

  return {
    data,
    meta: {
      pagination: {
        page,
        pageSize,
        pageCount: Math.max(1, Math.ceil(total / pageSize)),
        total,
      },
    },
  }
}

async function findCollectionItem(ctx: any, collection: PanelCollectionKey) {
  const config = COLLECTIONS[collection]
  const id = toNumber(ctx.params.id, NaN)

  if (!Number.isFinite(id)) {
    throw new ApplicationError('内容 ID 无效')
  }

  const entry = await strapi.entityService.findOne(config.uid as any, id, {
    populate: config.populate,
    locale: config.localized ? mapLocale(ctx.query.locale) : undefined,
  })

  if (!entry) {
    throw new NotFoundError('内容不存在')
  }

  return { data: entry }
}

function getInputData(ctx: any) {
  const requestBody = ctx.request.body
  if (!requestBody || typeof requestBody !== 'object' || Array.isArray(requestBody)) {
    throw new ApplicationError('请求体无效')
  }

  const payload = 'data' in requestBody ? requestBody.data : requestBody
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ApplicationError('提交数据无效')
  }

  return payload as Record<string, unknown>
}

async function createCollectionItem(ctx: any, collection: PanelCollectionKey) {
  ensureWritableCollection(collection)
  const config = COLLECTIONS[collection]
  const input = getInputData(ctx)
  const data = pickAllowedFields(collection, input, ctx.request.body?.locale || ctx.query.locale)

  const entry = await strapi.entityService.create(config.uid as any, {
    data,
    populate: config.populate,
  })

  return { data: entry }
}

async function updateCollectionItem(ctx: any, collection: PanelCollectionKey) {
  ensureWritableCollection(collection)
  const config = COLLECTIONS[collection]
  const id = toNumber(ctx.params.id, NaN)

  if (!Number.isFinite(id)) {
    throw new ApplicationError('内容 ID 无效')
  }

  const input = getInputData(ctx)
  const data = pickAllowedFields(collection, input, ctx.request.body?.locale || ctx.query.locale)

  const entry = await strapi.entityService.update(config.uid as any, id, {
    data,
    populate: config.populate,
  })

  return { data: entry }
}

async function deleteCollectionItem(ctx: any, collection: PanelCollectionKey) {
  ensureWritableCollection(collection)
  const config = COLLECTIONS[collection]
  const id = toNumber(ctx.params.id, NaN)

  if (!Number.isFinite(id)) {
    throw new ApplicationError('内容 ID 无效')
  }

  await strapi.entityService.delete(config.uid as any, id)
  return { success: true }
}

async function uploadMedia(ctx: any) {
  const files = ctx.request.files?.files
  const fieldName = typeof ctx.request.body?.fieldName === 'string' ? ctx.request.body.fieldName : undefined
  validateUploadFiles(files, fieldName)

  const uploadedFiles = await strapi.plugin('upload').service('upload').upload(
    {
      data: {},
      files,
    },
    {
      user: ctx.state.user,
    }
  )

  return {
    data: uploadedFiles,
  }
}

export default {
  async list(ctx: any) {
    try {
      const collection = ensureCollection(ctx.params.collection)
      ctx.body = await listCollection(ctx, collection)
    } catch (error) {
      ctx.badRequest((error as Error).message)
    }
  },

  async findOne(ctx: any) {
    try {
      const collection = ensureCollection(ctx.params.collection)
      ctx.body = await findCollectionItem(ctx, collection)
    } catch (error) {
      if (error instanceof NotFoundError) {
        return ctx.notFound((error as Error).message)
      }
      ctx.badRequest((error as Error).message)
    }
  },

  async create(ctx: any) {
    let collection: PanelCollectionKey | undefined
    try {
      collection = ensureCollection(ctx.params.collection)
      ctx.body = await createCollectionItem(ctx, collection)
      const entry = ctx.body?.data
      await recordAdminAuditLog(ctx, {
        action: 'create',
        status: 'success',
        targetCollection: collection,
        targetId: typeof entry?.id === 'number' ? entry.id : undefined,
        targetName: getEntryLabel(entry),
        locale: mapLocale(ctx.request.body?.locale || ctx.query.locale),
      })
    } catch (error) {
      await recordAdminAuditLog(ctx, {
        action: 'create',
        status: 'failed',
        targetCollection: collection || String(ctx.params.collection || 'unknown'),
        locale: mapLocale(ctx.request.body?.locale || ctx.query.locale),
        message: (error as Error).message,
      })
      ctx.badRequest((error as Error).message)
    }
  },

  async update(ctx: any) {
    let collection: PanelCollectionKey | undefined
    const id = toNumber(ctx.params.id, NaN)
    try {
      collection = ensureCollection(ctx.params.collection)
      ctx.body = await updateCollectionItem(ctx, collection)
      const entry = ctx.body?.data
      await recordAdminAuditLog(ctx, {
        action: 'update',
        status: 'success',
        targetCollection: collection,
        targetId: Number.isFinite(id) ? id : undefined,
        targetName: getEntryLabel(entry),
        locale: mapLocale(ctx.request.body?.locale || ctx.query.locale),
      })
    } catch (error) {
      await recordAdminAuditLog(ctx, {
        action: 'update',
        status: 'failed',
        targetCollection: collection || String(ctx.params.collection || 'unknown'),
        targetId: Number.isFinite(id) ? id : undefined,
        locale: mapLocale(ctx.request.body?.locale || ctx.query.locale),
        message: (error as Error).message,
      })
      ctx.badRequest((error as Error).message)
    }
  },

  async delete(ctx: any) {
    let collection: PanelCollectionKey | undefined
    const id = toNumber(ctx.params.id, NaN)
    try {
      collection = ensureCollection(ctx.params.collection)
      ctx.body = await deleteCollectionItem(ctx, collection)
      await recordAdminAuditLog(ctx, {
        action: 'delete',
        status: 'success',
        targetCollection: collection,
        targetId: Number.isFinite(id) ? id : undefined,
        locale: mapLocale(ctx.query.locale),
      })
    } catch (error) {
      await recordAdminAuditLog(ctx, {
        action: 'delete',
        status: 'failed',
        targetCollection: collection || String(ctx.params.collection || 'unknown'),
        targetId: Number.isFinite(id) ? id : undefined,
        locale: mapLocale(ctx.query.locale),
        message: (error as Error).message,
      })
      ctx.badRequest((error as Error).message)
    }
  },

  async upload(ctx: any) {
    try {
      ctx.body = await uploadMedia(ctx)
      const uploaded = Array.isArray(ctx.body?.data) ? ctx.body.data[0] : undefined
      await recordAdminAuditLog(ctx, {
        action: 'upload',
        status: 'success',
        targetCollection: typeof ctx.request.body?.collection === 'string' ? ctx.request.body.collection : 'upload',
        targetId: typeof uploaded?.id === 'number' ? uploaded.id : undefined,
        targetName: getEntryLabel(uploaded),
        details: {
          fieldName: typeof ctx.request.body?.fieldName === 'string' ? ctx.request.body.fieldName : undefined,
        },
      })
    } catch (error) {
      await recordAdminAuditLog(ctx, {
        action: 'upload',
        status: 'failed',
        targetCollection: typeof ctx.request.body?.collection === 'string' ? ctx.request.body.collection : 'upload',
        message: (error as Error).message,
      })
      ctx.badRequest((error as Error).message)
    }
  },

  async rateLimit(ctx: any) {
    try {
      ctx.body = await checkRateLimit(ctx)
    } catch (error) {
      if ((error as Error).message.includes('令牌')) {
        return ctx.unauthorized((error as Error).message)
      }

      ctx.badRequest((error as Error).message)
    }
  },
}
