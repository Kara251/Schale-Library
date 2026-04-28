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
const CONTENT_QUALITY_UID = 'api::content-quality-issue.content-quality-issue' as any
const DEFAULT_RATE_LIMIT = 60
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60 * 1000
const SUPPORTED_QUALITY_LOCALES = ['zh-Hans', 'en', 'ja']

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

function buildCollectionSpecificFilters(collection: PanelCollectionKey, query: Record<string, unknown>) {
  if (collection === 'admin-audit-logs') {
    const filters: Record<string, unknown> = {}

    if (typeof query.action === 'string' && query.action) {
      filters.action = { $eq: query.action }
    }

    if (typeof query.status === 'string' && query.status && query.status !== 'all') {
      filters.status = { $eq: query.status }
    }

    if (typeof query.collection === 'string' && query.collection) {
      filters.targetCollection = { $eq: query.collection }
    }

    if (typeof query.actor === 'string' && query.actor.trim()) {
      filters.$or = [
        { actorEmail: { $containsi: query.actor.trim() } },
        { actorUsername: { $containsi: query.actor.trim() } },
      ]
    }

    const createdAt: Record<string, string> = {}
    if (typeof query.from === 'string' && query.from) {
      createdAt.$gte = new Date(query.from).toISOString()
    }
    if (typeof query.to === 'string' && query.to) {
      createdAt.$lte = new Date(query.to).toISOString()
    }
    if (Object.keys(createdAt).length > 0) {
      filters.createdAt = createdAt
    }

    return filters
  }

  if (collection === 'sync-logs') {
    const filters: Record<string, unknown> = {}
    if (typeof query.status === 'string' && query.status && query.status !== 'all') {
      filters.status = { $eq: query.status }
    }
    if (typeof query.stage === 'string' && query.stage && query.stage !== 'all') {
      filters.stage = { $eq: query.stage }
    }
    return filters
  }

  return {}
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

function getEnvFlag(name: string) {
  const value = process.env[name]
  if (value === undefined) {
    return undefined
  }

  return value === 'true' || value === '1'
}

function getPlaceholderStatus(value?: string) {
  const normalized = String(value || '').trim().toLowerCase()
  return !normalized || normalized === 'change-me' || normalized === 'change-me-too' || normalized.includes('tobemodified')
}

function createHealthCheck(key: string, label: string, ok: boolean, message: string, warning = false) {
  return {
    key,
    label,
    status: ok ? 'ok' : warning ? 'warning' : 'error',
    message,
  }
}

async function checkUsersPermissionsRole(type: string) {
  return strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type },
    populate: ['permissions'],
  })
}

async function getUnsafeRolePermissions(type: string) {
  const role = await checkUsersPermissionsRole(type)
  const permissions = Array.isArray(role?.permissions) ? role.permissions : []

  return permissions
    .filter((permission: any) => permission?.enabled)
    .map((permission: any) => String(permission.action || ''))
    .filter((action: string) => {
      const isCoreRead = /\.(find|findOne)$/.test(action)
      const isUserSelfRead = action.includes('plugin::users-permissions.user.me')
      const isAuthAction = action.includes('plugin::users-permissions.auth.')
      return !isCoreRead && !isUserSelfRead && !isAuthAction
    })
}

async function checkRssHubHealth() {
  const service = strapi.service('api::bilibili-subscription.bilibili-subscription')
  const instance = (service.getRssHubInstances?.() || [process.env.RSSHUB_URL || 'http://localhost:1200'])[0]
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3000)

  try {
    const response = await fetch(instance, { signal: controller.signal })
    return {
      instance,
      ok: response.ok || response.status === 404,
      message: `RSSHub ${instance} responded with ${response.status}`,
    }
  } catch (error) {
    return {
      instance,
      ok: false,
      message: `RSSHub ${instance} unavailable: ${(error as Error).message}`,
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

async function getSystemHealth() {
  const requiredEnv = [
    'APP_KEYS',
    'API_TOKEN_SALT',
    'ADMIN_JWT_SECRET',
    'TRANSFER_TOKEN_SALT',
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'ADMIN_PANEL_ALLOWED_ROLES',
    'PANEL_INTERNAL_TOKEN',
    'RATE_LIMIT_HASH_SECRET',
  ]
  const missingEnv = requiredEnv.filter((name) => getPlaceholderStatus(process.env[name]))
  const checks: Array<Record<string, unknown>> = []

  checks.push(createHealthCheck(
    'production-env',
    'Production secrets',
    missingEnv.length === 0 || process.env.NODE_ENV !== 'production',
    missingEnv.length === 0 ? 'Required production secrets are configured.' : `Missing or placeholder values: ${missingEnv.join(', ')}`,
    process.env.NODE_ENV !== 'production'
  ))

  const databaseClient = process.env.DATABASE_CLIENT || 'sqlite'
  checks.push(createHealthCheck(
    'database',
    'Database',
    process.env.NODE_ENV !== 'production' || databaseClient === 'postgres' || getEnvFlag('ALLOW_PRODUCTION_SQLITE') === true,
    `DATABASE_CLIENT=${databaseClient}`,
    process.env.NODE_ENV !== 'production'
  ))

  const cloudinaryValues = [process.env.CLOUDINARY_NAME, process.env.CLOUDINARY_KEY, process.env.CLOUDINARY_SECRET]
  const cloudinaryConfigured = cloudinaryValues.every(Boolean)
  const cloudinaryPartial = cloudinaryValues.some(Boolean) && !cloudinaryConfigured
  checks.push(createHealthCheck(
    'cloudinary',
    'Upload provider',
    !cloudinaryPartial,
    cloudinaryConfigured ? 'Cloudinary is configured.' : cloudinaryPartial ? 'Cloudinary variables must be configured together.' : 'Using local upload provider.',
    !cloudinaryConfigured && !cloudinaryPartial
  ))

  const allowedRoles = (process.env.ADMIN_PANEL_ALLOWED_ROLES || '')
    .split(',')
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean)
  const missingRoles: string[] = []
  for (const role of allowedRoles) {
    if (!await checkUsersPermissionsRole(role)) {
      missingRoles.push(role)
    }
  }
  checks.push(createHealthCheck(
    'panel-roles',
    'Panel roles',
    allowedRoles.length > 0 && missingRoles.length === 0,
    allowedRoles.length === 0 ? 'ADMIN_PANEL_ALLOWED_ROLES is empty.' : missingRoles.length > 0 ? `Missing roles: ${missingRoles.join(', ')}` : `Allowed roles exist: ${allowedRoles.join(', ')}`
  ))

  const [publicUnsafe, authenticatedUnsafe] = await Promise.all([
    getUnsafeRolePermissions('public').catch(() => []),
    getUnsafeRolePermissions('authenticated').catch(() => []),
  ])
  checks.push(createHealthCheck(
    'public-permissions',
    'Public permissions',
    publicUnsafe.length === 0,
    publicUnsafe.length > 0 ? `Unsafe public actions: ${publicUnsafe.join(', ')}` : 'No unsafe public write actions detected.'
  ))
  checks.push(createHealthCheck(
    'authenticated-permissions',
    'Authenticated permissions',
    authenticatedUnsafe.length === 0,
    authenticatedUnsafe.length > 0 ? `Unsafe authenticated actions: ${authenticatedUnsafe.join(', ')}` : 'No unsafe authenticated write actions detected.'
  ))

  const rss = await checkRssHubHealth()
  checks.push(createHealthCheck('rsshub', 'RSSHub', rss.ok, rss.message, true))

  return {
    status: checks.some((check) => check.status === 'error') ? 'error' : checks.some((check) => check.status === 'warning') ? 'warning' : 'ok',
    generatedAt: new Date().toISOString(),
    checks,
  }
}

function getEntryTitle(entry: any) {
  return String(entry?.title || entry?.name || entry?.upName || entry?.targetName || `#${entry?.id || ''}`).trim()
}

function toIssue(input: {
  issueType: string
  severity?: string
  collection: string
  entry?: any
  locale?: string
  message: string
  details?: Record<string, unknown>
}) {
  return {
    issueType: input.issueType,
    severity: input.severity || 'warning',
    status: 'open',
    collection: input.collection,
    targetId: typeof input.entry?.id === 'number' ? input.entry.id : undefined,
    targetDocumentId: typeof input.entry?.documentId === 'string' ? input.entry.documentId : undefined,
    locale: input.locale || input.entry?.locale,
    title: input.entry ? getEntryTitle(input.entry) : undefined,
    message: input.message,
    details: input.details,
    detectedAt: new Date().toISOString(),
  }
}

function addMissingTranslations(issues: any[], collection: string, entries: any[]) {
  const byDocumentId = new Map<string, any[]>()
  for (const entry of entries) {
    if (!entry?.documentId) {
      continue
    }
    const list = byDocumentId.get(entry.documentId) || []
    list.push(entry)
    byDocumentId.set(entry.documentId, list)
  }

  for (const entriesForDocument of byDocumentId.values()) {
    const locales = new Set(entriesForDocument.map((entry) => entry.locale).filter(Boolean))
    const representative = entriesForDocument[0]
    for (const locale of SUPPORTED_QUALITY_LOCALES) {
      if (!locales.has(locale)) {
        issues.push(toIssue({
          issueType: 'missing-translation',
          collection,
          entry: representative,
          locale,
          message: `${collection} 缺少 ${locale} 版本`,
          severity: 'info',
        }))
      }
    }
  }
}

async function findAllForQuality(uid: any, options: Record<string, unknown> = {}) {
  return strapi.entityService.findMany(uid, {
    ...options,
    locale: 'all',
    limit: 1000,
  } as any) as Promise<any[]>
}

async function scanContentQuality() {
  const issues: any[] = []
  const [works, students, onlineEvents, offlineEvents, announcements] = await Promise.all([
    findAllForQuality('api::work.work', { populate: { coverImage: true, students: true } }),
    findAllForQuality('api::student.student', { populate: { avatar: true } }),
    findAllForQuality('api::online-event.online-event', { populate: { coverImage: true } }),
    findAllForQuality('api::offline-event.offline-event', { populate: { coverImage: true } }),
    findAllForQuality('api::announcement.announcement', { populate: { coverImage: true } }),
  ])

  addMissingTranslations(issues, 'works', works)
  addMissingTranslations(issues, 'students', students)
  addMissingTranslations(issues, 'online-events', onlineEvents)
  addMissingTranslations(issues, 'offline-events', offlineEvents)
  addMissingTranslations(issues, 'announcements', announcements)

  const sourceGroups = new Map<string, any[]>()
  for (const work of works) {
    if (!work.coverImage && !work.coverImageUrl) {
      issues.push(toIssue({ issueType: 'missing-image', collection: 'works', entry: work, message: '作品缺少封面图或远程封面地址' }))
    }
    if (!Array.isArray(work.students) || work.students.length === 0) {
      issues.push(toIssue({ issueType: 'missing-students', collection: 'works', entry: work, message: '作品尚未关联学生' }))
    }
    if (!work.link && !work.sourceUrl) {
      issues.push(toIssue({ issueType: 'missing-link', collection: 'works', entry: work, message: '作品缺少外链或来源地址' }))
    }
    if (!work.publishedAt) {
      issues.push(toIssue({ issueType: 'draft', severity: 'info', collection: 'works', entry: work, message: '作品仍处于草稿状态' }))
    }

    const sourceKey = work.sourceUrl || (work.sourcePlatform && work.sourceId ? `${work.sourcePlatform}:${work.sourceId}` : '')
    if (sourceKey) {
      const list = sourceGroups.get(sourceKey) || []
      list.push(work)
      sourceGroups.set(sourceKey, list)
    }
  }

  for (const duplicates of sourceGroups.values()) {
    if (duplicates.length > 1) {
      for (const work of duplicates) {
        issues.push(toIssue({
          issueType: 'duplicate-source',
          severity: 'error',
          collection: 'works',
          entry: work,
          message: '存在重复来源的作品',
          details: { duplicateIds: duplicates.map((item) => item.id) },
        }))
      }
    }
  }

  for (const student of students) {
    if (!student.avatar) {
      issues.push(toIssue({ issueType: 'missing-image', collection: 'students', entry: student, message: '学生缺少头像', severity: 'info' }))
    }
    if (!student.school) {
      issues.push(toIssue({ issueType: 'missing-link', collection: 'students', entry: student, message: '学生缺少学校信息', severity: 'info' }))
    }
    if (!student.publishedAt) {
      issues.push(toIssue({ issueType: 'draft', severity: 'info', collection: 'students', entry: student, message: '学生仍处于草稿状态' }))
    }
  }

  for (const [collection, events] of [['online-events', onlineEvents], ['offline-events', offlineEvents]] as const) {
    for (const event of events) {
      if (!event.coverImage) {
        issues.push(toIssue({ issueType: 'missing-image', collection, entry: event, message: '活动缺少封面图', severity: 'info' }))
      }
      if (!event.link) {
        issues.push(toIssue({ issueType: 'missing-link', collection, entry: event, message: '活动缺少外链', severity: 'info' }))
      }
      if (event.startTime && event.endTime && new Date(event.startTime).getTime() > new Date(event.endTime).getTime()) {
        issues.push(toIssue({ issueType: 'invalid-event-time', severity: 'error', collection, entry: event, message: '活动结束时间早于开始时间' }))
      }
      if (!event.publishedAt) {
        issues.push(toIssue({ issueType: 'draft', severity: 'info', collection, entry: event, message: '活动仍处于草稿状态' }))
      }
    }
  }

  await strapi.db.query(CONTENT_QUALITY_UID).deleteMany({ where: { status: 'open' } })
  for (const issue of issues) {
    await strapi.entityService.create(CONTENT_QUALITY_UID, { data: issue })
  }

  return issues
}

async function listQualityIssues(ctx: any) {
  const page = Math.max(1, toNumber(ctx.query.page, 1))
  const pageSize = Math.min(100, Math.max(1, toNumber(ctx.query.pageSize, 20)))
  const start = (page - 1) * pageSize
  const filters: Record<string, unknown> = {}

  if (typeof ctx.query.status === 'string' && ctx.query.status && ctx.query.status !== 'all') {
    filters.status = { $eq: ctx.query.status }
  }
  if (typeof ctx.query.severity === 'string' && ctx.query.severity && ctx.query.severity !== 'all') {
    filters.severity = { $eq: ctx.query.severity }
  }
  if (typeof ctx.query.collection === 'string' && ctx.query.collection && ctx.query.collection !== 'all') {
    filters.collection = { $eq: ctx.query.collection }
  }
  if (typeof ctx.query.issueType === 'string' && ctx.query.issueType && ctx.query.issueType !== 'all') {
    filters.issueType = { $eq: ctx.query.issueType }
  }

  const [data, total] = await Promise.all([
    strapi.entityService.findMany(CONTENT_QUALITY_UID, {
      filters,
      sort: 'detectedAt:desc',
      start,
      limit: pageSize,
    }),
    strapi.documents(CONTENT_QUALITY_UID).count({ filters }),
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
    buildStatusFilters(typeof ctx.query.status === 'string' ? ctx.query.status : undefined, config.supportsDraft),
    buildCollectionSpecificFilters(collection, ctx.query)
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

function escapeCsv(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

async function exportAdminAuditLogs(ctx: any) {
  const filters = mergeFilters(
    buildSearchFilters(COLLECTIONS['admin-audit-logs'].searchFields, ctx.query.search),
    buildCollectionSpecificFilters('admin-audit-logs', ctx.query)
  )
  const rows = await strapi.entityService.findMany(AUDIT_LOG_UID, {
    filters,
    sort: 'createdAt:desc',
    limit: 1000,
  }) as any[]
  const header = ['createdAt', 'action', 'status', 'actorEmail', 'actorUsername', 'targetCollection', 'targetId', 'targetName', 'locale', 'message']
  const csv = [
    header.join(','),
    ...rows.map((row) => header.map((key) => escapeCsv(row[key])).join(',')),
  ].join('\n')

  ctx.set('Content-Type', 'text/csv; charset=utf-8')
  ctx.set('Content-Disposition', 'attachment; filename="admin-audit-logs.csv"')
  ctx.body = csv
}

function normalizeIds(value: unknown) {
  if (!Array.isArray(value)) {
    throw new ApplicationError('ids 必须是数组')
  }

  const ids = value
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id))

  if (ids.length === 0) {
    throw new ApplicationError('未选择任何内容')
  }

  return ids
}

async function runBulkAction(ctx: any) {
  const body = ctx.request.body || {}
  const collection = ensureCollection(String(body.collection || ''))
  ensureWritableCollection(collection)

  const action = String(body.action || '')
  const ids = normalizeIds(body.ids)
  const locale = mapLocale(body.locale)
  const config = COLLECTIONS[collection]
  let updated = 0
  const errors: string[] = []

  for (const id of ids) {
    try {
      const data: Record<string, unknown> = {}

      switch (action) {
        case 'publish':
          if (!config.supportsDraft) throw new ApplicationError('该集合不支持发布状态')
          data.publishedAt = new Date().toISOString()
          break
        case 'unpublish':
          if (!config.supportsDraft) throw new ApplicationError('该集合不支持发布状态')
          data.publishedAt = null
          break
        case 'activate':
          if (!config.fields.includes('isActive')) throw new ApplicationError('该集合不支持启用状态')
          data.isActive = true
          break
        case 'deactivate':
          if (!config.fields.includes('isActive')) throw new ApplicationError('该集合不支持启用状态')
          data.isActive = false
          break
        case 'set-students':
          if (collection !== 'works') throw new ApplicationError('仅作品支持批量关联学生')
          data.students = normalizeRelationList(body.studentIds)
          break
        case 'set-source-platform':
          if (collection !== 'works') throw new ApplicationError('仅作品支持批量设置来源平台')
          data.sourcePlatform = String(body.sourcePlatform || 'manual')
          break
        case 'set-student-school':
          if (collection !== 'students') throw new ApplicationError('仅学生支持批量设置学校')
          data.school = String(body.school || 'other')
          break
        case 'set-student-organization':
          if (collection !== 'students') throw new ApplicationError('仅学生支持批量设置组织')
          data.organization = String(body.organization || '')
          break
        default:
          throw new ApplicationError('不支持的批量操作')
      }

      await strapi.entityService.update(config.uid as any, id, {
        data,
        locale: config.localized ? locale : undefined,
      } as any)
      updated++
    } catch (error) {
      errors.push(`#${id}: ${(error as Error).message}`)
    }
  }

  await recordAdminAuditLog(ctx, {
    action: 'update',
    status: errors.length > 0 ? 'failed' : 'success',
    targetCollection: collection,
    locale,
    message: `批量操作 ${action}: 成功 ${updated}/${ids.length}`,
    details: { action, ids, errors },
  })

  return {
    success: errors.length === 0,
    updated,
    failed: errors.length,
    errors,
  }
}

export default {
  async systemHealth(ctx: any) {
    try {
      ctx.body = await getSystemHealth()
    } catch (error) {
      ctx.badRequest((error as Error).message)
    }
  },

  async qualityIssues(ctx: any) {
    try {
      ctx.body = await listQualityIssues(ctx)
    } catch (error) {
      ctx.badRequest((error as Error).message)
    }
  },

  async scanQuality(ctx: any) {
    try {
      const issues = await scanContentQuality()
      await recordAdminAuditLog(ctx, {
        action: 'update',
        status: 'success',
        targetCollection: 'content-quality-issues',
        message: `内容质量扫描完成，发现 ${issues.length} 个问题`,
        details: { count: issues.length },
      })
      ctx.body = { success: true, count: issues.length }
    } catch (error) {
      await recordAdminAuditLog(ctx, {
        action: 'update',
        status: 'failed',
        targetCollection: 'content-quality-issues',
        message: (error as Error).message,
      })
      ctx.badRequest((error as Error).message)
    }
  },

  async bulkAction(ctx: any) {
    try {
      ctx.body = await runBulkAction(ctx)
    } catch (error) {
      ctx.badRequest((error as Error).message)
    }
  },

  async exportAuditLogs(ctx: any) {
    try {
      await exportAdminAuditLogs(ctx)
    } catch (error) {
      ctx.badRequest((error as Error).message)
    }
  },

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
