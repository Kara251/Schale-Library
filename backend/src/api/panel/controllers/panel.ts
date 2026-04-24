import { errors } from '@strapi/utils'

const { ApplicationError, NotFoundError } = errors

type PanelCollectionKey =
  | 'announcements'
  | 'works'
  | 'online-events'
  | 'offline-events'
  | 'students'
  | 'bilibili-subscriptions'

interface CollectionConfig {
  uid: any
  localized: boolean
  populate?: any
  searchFields: string[]
  defaultSort: string
  supportsDraft: boolean
  fields: string[]
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
    fields: ['upName', 'uid', 'isActive', 'defaultNature', 'autoPublishKeywords', 'lastSyncAt', 'syncCount', 'notes'],
  },
}

function isPanelCollectionKey(value: string): value is PanelCollectionKey {
  return value in COLLECTIONS
}

function mapLocale(locale?: string | null): string | undefined {
  if (!locale) {
    return undefined
  }

  return locale === 'zh-Hans' ? 'zh-CN' : locale
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

function getUploadCandidates(input: unknown) {
  if (!input) {
    return []
  }

  return Array.isArray(input) ? input : [input]
}

function validateUploadFiles(input: unknown) {
  const maxUploadMb = Math.max(1, Number(process.env.ADMIN_PANEL_MAX_UPLOAD_MB || '10'))
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
  validateUploadFiles(files)

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
    try {
      const collection = ensureCollection(ctx.params.collection)
      ctx.body = await createCollectionItem(ctx, collection)
    } catch (error) {
      ctx.badRequest((error as Error).message)
    }
  },

  async update(ctx: any) {
    try {
      const collection = ensureCollection(ctx.params.collection)
      ctx.body = await updateCollectionItem(ctx, collection)
    } catch (error) {
      ctx.badRequest((error as Error).message)
    }
  },

  async delete(ctx: any) {
    try {
      const collection = ensureCollection(ctx.params.collection)
      ctx.body = await deleteCollectionItem(ctx, collection)
    } catch (error) {
      ctx.badRequest((error as Error).message)
    }
  },

  async upload(ctx: any) {
    try {
      ctx.body = await uploadMedia(ctx)
    } catch (error) {
      ctx.badRequest((error as Error).message)
    }
  },
}
