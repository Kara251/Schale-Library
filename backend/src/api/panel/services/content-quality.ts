import crypto from 'node:crypto'

import { normalizeRichValue } from './input-schema'
import { toNumber } from './query-utils'

const CONTENT_QUALITY_UID = 'api::content-quality-issue.content-quality-issue' as any
const QUALITY_SCAN_PAGE_SIZE = 100
const SUPPORTED_QUALITY_LOCALES = ['zh-Hans', 'en', 'ja']

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

function normalizeText(value: unknown) {
  return String(value || '').trim()
}

function hasUsableUrl(value: unknown) {
  const url = normalizeText(value)
  if (!url) return false

  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

async function findAllForQuality(uid: any, options: Record<string, unknown> = {}) {
  const entries: any[] = []
  let start = 0

  while (true) {
    const page = await strapi.entityService.findMany(uid, {
      ...options,
      locale: 'all',
      sort: options.sort || 'id:asc',
      start,
      limit: QUALITY_SCAN_PAGE_SIZE,
    } as any) as any[]

    entries.push(...page)
    if (page.length < QUALITY_SCAN_PAGE_SIZE) {
      return entries
    }

    start += QUALITY_SCAN_PAGE_SIZE
  }
}

export async function scanContentQuality() {
  const issues: any[] = []
  const [works, students, onlineEvents, offlineEvents, announcements, friendLinks] = await Promise.all([
    findAllForQuality('api::work.work', { populate: { coverImage: true, students: true } }),
    findAllForQuality('api::student.student', { populate: { avatar: true, school_ref: true } }),
    findAllForQuality('api::online-event.online-event', { populate: { coverImage: true } }),
    findAllForQuality('api::offline-event.offline-event', { populate: { coverImage: true } }),
    findAllForQuality('api::announcement.announcement', { populate: { coverImage: true } }),
    findAllForQuality('api::friend-link.friend-link', { populate: { icon: true } }),
  ])

  addMissingTranslations(issues, 'works', works)
  addMissingTranslations(issues, 'students', students)
  addMissingTranslations(issues, 'online-events', onlineEvents)
  addMissingTranslations(issues, 'offline-events', offlineEvents)
  addMissingTranslations(issues, 'announcements', announcements)
  addMissingTranslations(issues, 'friend-links', friendLinks)

  const sourceGroups = new Map<string, any[]>()
  const now = Date.now()
  for (const work of works) {
    if (!work.coverImage && !work.coverImageUrl) {
      issues.push(toIssue({ issueType: 'missing-image', collection: 'works', entry: work, message: '作品缺少封面图或远程封面地址' }))
    }
    if (work.isFeatured) {
      if (!work.coverImage && !work.coverImageUrl) {
        issues.push(toIssue({ issueType: 'featured-missing-image', severity: 'error', collection: 'works', entry: work, message: '精选作品缺少封面图或远程封面地址' }))
      }
      if (!normalizeRichValue(work.featuredReason).trim()) {
        issues.push(toIssue({ issueType: 'featured-missing-reason', severity: 'warning', collection: 'works', entry: work, message: '精选作品缺少推荐理由' }))
      }
      if (work.featuredUntil && new Date(work.featuredUntil).getTime() <= now) {
        issues.push(toIssue({ issueType: 'featured-expired', severity: 'warning', collection: 'works', entry: work, message: '精选作品已过期但仍标记为精选' }))
      }
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
    if (!student.school_ref) {
      issues.push(toIssue({ issueType: 'missing-link', collection: 'students', entry: student, message: '学生缺少学院关联', severity: 'info' }))
    }
    if (!student.publishedAt) {
      issues.push(toIssue({ issueType: 'draft', severity: 'info', collection: 'students', entry: student, message: '学生仍处于草稿状态' }))
    }
  }

  for (const [collection, events] of [['online-events', onlineEvents], ['offline-events', offlineEvents]] as const) {
    const eventSourceGroups = new Map<string, any[]>()

    for (const event of events) {
      if (!event.coverImage) {
        issues.push(toIssue({ issueType: 'missing-image', collection, entry: event, message: '活动缺少封面图', severity: 'info' }))
      }
      if (!event.link) {
        issues.push(toIssue({ issueType: 'missing-link', collection, entry: event, message: '活动缺少外链', severity: 'info' }))
      }
      if (event.link && !hasUsableUrl(event.link)) {
        issues.push(toIssue({ issueType: 'invalid-link', severity: 'error', collection, entry: event, message: '活动外链不是有效 URL' }))
      }
      if (event.sourceUrl && !hasUsableUrl(event.sourceUrl)) {
        issues.push(toIssue({ issueType: 'invalid-source-url', severity: 'error', collection, entry: event, message: '活动信源链接不是有效 URL' }))
      }
      if (event.ticketUrl && !hasUsableUrl(event.ticketUrl)) {
        issues.push(toIssue({ issueType: 'invalid-ticket-url', severity: 'error', collection, entry: event, message: '活动票务链接不是有效 URL' }))
      }
      if (event.ticketStatus && event.ticketStatus !== 'unknown' && !event.ticketUrl && !event.link) {
        issues.push(toIssue({ issueType: 'ticket-status-missing-link', severity: 'warning', collection, entry: event, message: '活动已设置票务状态但缺少票务或活动链接' }))
      }
      if (['ticketing', 'lottery'].includes(String(event.ticketStatus || '')) && !event.ticketPriceText && event.priceMin == null && event.priceMax == null) {
        issues.push(toIssue({ issueType: 'ticketing-missing-price', severity: 'info', collection, entry: event, message: '售票或抽选活动缺少票价说明' }))
      }
      const sourceName = normalizeText(event.sourceName || event.sourcePlatform)
      if (sourceName && !event.sourceUrl) {
        issues.push(toIssue({ issueType: 'source-name-missing-url', severity: 'warning', collection, entry: event, message: '活动已填写来源但缺少来源链接' }))
      }
      if (/(baonly|official|ticket|票务|官方)/i.test(sourceName) && !event.lastVerifiedAt) {
        issues.push(toIssue({ issueType: 'source-missing-verification', severity: 'info', collection, entry: event, message: '活动缺少最后核验时间' }))
      }
      if (event.sourceUrl) {
        const list = eventSourceGroups.get(event.sourceUrl) || []
        list.push(event)
        eventSourceGroups.set(event.sourceUrl, list)
      }
      if (event.startTime && event.endTime && new Date(event.startTime).getTime() > new Date(event.endTime).getTime()) {
        issues.push(toIssue({ issueType: 'invalid-event-time', severity: 'error', collection, entry: event, message: '活动结束时间早于开始时间' }))
      }
      if (collection === 'online-events') {
        if (!normalizeText(event.country) && !normalizeText(event.region)) {
          issues.push(toIssue({ issueType: 'online-event-missing-region', severity: 'warning', collection, entry: event, message: '线上活动缺少国家/地区信息' }))
        }
      }
      if (collection === 'offline-events') {
        if (!normalizeText(event.country) && !normalizeText(event.region) && !normalizeText(event.city)) {
          issues.push(toIssue({ issueType: 'offline-event-missing-region', severity: 'warning', collection, entry: event, message: '线下活动缺少国家/地区、省市信息' }))
        }
        if (!normalizeText(event.venue) && !normalizeText(event.location)) {
          issues.push(toIssue({ issueType: 'offline-event-missing-venue', severity: 'warning', collection, entry: event, message: '线下活动缺少场馆或地点' }))
        }
        if (event.mapUrl && !hasUsableUrl(event.mapUrl)) {
          issues.push(toIssue({ issueType: 'invalid-map-url', severity: 'error', collection, entry: event, message: '活动地图链接不是有效 URL' }))
        }
      }
      if (!event.publishedAt) {
        issues.push(toIssue({ issueType: 'draft', severity: 'info', collection, entry: event, message: '活动仍处于草稿状态' }))
      }
    }

    for (const duplicates of eventSourceGroups.values()) {
      if (duplicates.length > 1) {
        for (const event of duplicates) {
          issues.push(toIssue({
            issueType: 'duplicate-event-source',
            severity: 'error',
            collection,
            entry: event,
            message: '存在重复信源的活动',
            details: { duplicateIds: duplicates.map((item) => item.id) },
          }))
        }
      }
    }
  }

  for (const link of friendLinks) {
    if (!link.icon) {
      issues.push(toIssue({ issueType: 'missing-image', collection: 'friend-links', entry: link, message: '友情链接缺少图标', severity: 'info' }))
    }
    if (!link.url) {
      issues.push(toIssue({ issueType: 'missing-link', collection: 'friend-links', entry: link, message: '友情链接缺少跳转链接', severity: 'error' }))
    }
    if (!link.publishedAt) {
      issues.push(toIssue({ issueType: 'draft', severity: 'info', collection: 'friend-links', entry: link, message: '友情链接仍处于草稿状态' }))
    }
  }

  const scanId = crypto.randomUUID()
  const replacementDetectedAt = new Date().toISOString()
  const issueRows = issues.map((issue) => ({
    ...issue,
    detectedAt: replacementDetectedAt,
    details: {
      ...(issue.details || {}),
      scanId,
    },
  }))

  const BATCH_SIZE = 100
  for (let index = 0; index < issueRows.length; index += BATCH_SIZE) {
    const batch = issueRows.slice(index, index + BATCH_SIZE)
    await Promise.all(batch.map((row) => strapi.entityService.create(CONTENT_QUALITY_UID, { data: row })))
  }

  await strapi.db.query(CONTENT_QUALITY_UID).deleteMany({
    where: {
      status: 'open',
      detectedAt: {
        $lt: replacementDetectedAt,
      },
    },
  })

  return issues
}

export async function listQualityIssues(ctx: any) {
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
    strapi.entityService.count(CONTENT_QUALITY_UID, { filters } as any),
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
