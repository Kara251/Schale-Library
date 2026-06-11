import { errors } from '@strapi/utils'
import { acquireJobLock, releaseJobLock } from '../../../utils/job-lock'
import { COLLECTIONS, isPanelCollectionKey, mapLocale, type PanelCollectionKey } from '../services/collection-config'
import { buildCollectionSpecificFilters, buildSearchFilters, buildStatusFilters, mergeFilters, toNumber } from '../services/query-utils'
import { getInputData, normalizeRelationList, normalizeRichValue, pickAllowedFields } from '../services/input-schema'
import { exportAdminAuditLogs } from '../services/audit-export'
import { getEntryLabel, recordAdminAuditLog } from '../services/audit-log'
import { listQualityIssues, scanContentQuality } from '../services/content-quality'
import { checkRateLimit } from '../services/rate-limit'
import { getSystemHealth } from '../services/system-health'

const { ApplicationError, NotFoundError } = errors

const RESEARCH_CURATOR_UID = 'api::research-curator.research-curator' as any

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

  // 行与计数使用同一查询引擎与同一组过滤条件，避免草稿/发布双行模型下分页错乱
  const countOptions: Record<string, unknown> = { filters }
  if (config.localized && locale) {
    countOptions.locale = locale
  }

  const [data, total] = await Promise.all([
    strapi.entityService.findMany(config.uid as any, queryOptions),
    strapi.entityService.count(config.uid as any, countOptions as any),
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

async function createCollectionItem(ctx: any, collection: PanelCollectionKey) {
  ensureWritableCollection(collection)
  const config = COLLECTIONS[collection]
  const input = getInputData(ctx)
  const data = pickAllowedFields(collection, input, ctx.request.body?.locale || ctx.query.locale)

  const entry = await strapi.entityService.create(config.uid as any, {
    data: data as any,
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
    data: data as any,
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
        case 'set-featured':
          if (collection !== 'works') throw new ApplicationError('仅作品支持批量精选')
          data.isFeatured = true
          if (body.featuredPriority !== undefined) {
            data.featuredPriority = toNumber(body.featuredPriority, 0)
          }
          break
        case 'unset-featured':
          if (collection !== 'works') throw new ApplicationError('仅作品支持批量取消精选')
          data.isFeatured = false
          break
        case 'set-featured-priority':
          if (collection !== 'works') throw new ApplicationError('仅作品支持批量设置推荐优先级')
          data.featuredPriority = toNumber(body.featuredPriority, 0)
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

  const auditAction = action === 'publish' ? 'publish' : action === 'unpublish' ? 'unpublish' : 'update'
  await recordAdminAuditLog(ctx, {
    action: auditAction,
    status: errors.length > 0 ? (updated > 0 ? 'partial' : 'failed') : 'success',
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
    // 扫描会先插入新结果再清理旧结果，并发执行会互相删除数据，必须串行
    const lock = await acquireJobLock(strapi, 'content-quality-scan', 10 * 60 * 1000)
    if (!lock) {
      return ctx.conflict('已有质量扫描正在执行，请稍后再试')
    }

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
    } finally {
      await releaseJobLock(strapi, lock)
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

  async getCurator(ctx: any) {
    try {
      const locale = mapLocale(typeof ctx.query.locale === 'string' ? ctx.query.locale : undefined)
      const params: Record<string, unknown> = {
        populate: { featured_entry: { fields: ['id', 'documentId', 'title', 'slug'] } },
      }
      if (locale) params.locale = locale

      const entry = await strapi.documents(RESEARCH_CURATOR_UID).findFirst(params as any)
      ctx.send({ data: entry || null })
    } catch (error) {
      strapi.log.warn(`[panel] getCurator: ${(error as Error).message}`)
      ctx.send({ data: null })
    }
  },

  async updateCurator(ctx: any) {
    const body = ctx.request.body as { data?: Record<string, unknown>; locale?: string } | undefined
    if (!body?.data || typeof body.data !== 'object') {
      return ctx.badRequest('缺少 data 字段')
    }

    const inputData = body.data
    const localeParam = mapLocale(typeof body.locale === 'string' ? body.locale : undefined)
    const normalized: Record<string, unknown> = {}

    if ('featured_entry' in inputData) {
      const val = inputData.featured_entry
      normalized.featured_entry = typeof val === 'number' && val > 0 ? val : null
    }
    if ('pick_note' in inputData) normalized.pick_note = normalizeRichValue(inputData.pick_note)
    if ('path_description' in inputData) normalized.path_description = normalizeRichValue(inputData.path_description)

    try {
      const findParams: Record<string, unknown> = {}
      if (localeParam) findParams.locale = localeParam

      const existing = await strapi.documents(RESEARCH_CURATOR_UID).findFirst(findParams as any) as any

      let updated: unknown
      if (existing?.documentId) {
        updated = await strapi.documents(RESEARCH_CURATOR_UID).update({
          documentId: existing.documentId,
          data: normalized,
          locale: localeParam,
          populate: { featured_entry: { fields: ['id', 'documentId', 'title', 'slug'] } },
        } as any)
      } else {
        updated = await strapi.documents(RESEARCH_CURATOR_UID).create({
          data: normalized,
          locale: localeParam,
          populate: { featured_entry: { fields: ['id', 'documentId', 'title', 'slug'] } },
        } as any)
      }

      await recordAdminAuditLog(ctx, {
        action: 'update',
        status: 'success',
        targetCollection: 'research-curator',
        targetName: '考据策展配置',
        locale: localeParam,
      })

      ctx.send({ data: updated })
    } catch (error) {
      await recordAdminAuditLog(ctx, {
        action: 'update',
        status: 'failed',
        targetCollection: 'research-curator',
        locale: localeParam,
        message: (error as Error).message,
      })
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
