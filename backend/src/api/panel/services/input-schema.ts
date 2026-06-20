import { errors } from '@strapi/utils'

import { COLLECTIONS, mapLocale, type PanelCollectionKey } from './collection-config'
import { toNumber } from './query-utils'
import { RELATED_LINK_TYPE_SET, REVISION_TYPE_SET } from './research-constants'

const { ApplicationError } = errors

type FieldKind =
  | 'text'
  | 'number'
  | 'boolean'
  | 'media'
  | 'relation-list'
  | 'relation-one'
  | 'datetime'
  | 'published-at'
  | 'related-links'
  | 'revisions'
  | 'path-steps'
  | 'passthrough'

type FieldSchema = {
  kind: FieldKind
  defaultNumber?: number
  defaultBoolean?: boolean
}

const FIELD_SCHEMAS: Record<string, FieldSchema> = {
  content: { kind: 'text' },
  description: { kind: 'text' },
  featuredReason: { kind: 'text' },
  bio: { kind: 'text' },
  guests: { kind: 'text' },
  notes: { kind: 'text' },
  autoPublishKeywords: { kind: 'text' },
  summary: { kind: 'text' },
  body: { kind: 'text' },
  source_quote: { kind: 'text' },
  curated_intro: { kind: 'text' },
  priority: { kind: 'number' },
  syncCount: { kind: 'number' },
  featuredPriority: { kind: 'number' },
  order: { kind: 'number' },
  isActive: { kind: 'boolean' },
  isAutoImported: { kind: 'boolean' },
  isFeatured: { kind: 'boolean' },
  isPinned: { kind: 'boolean' },
  coverImage: { kind: 'media' },
  avatar: { kind: 'media' },
  icon: { kind: 'media' },
  source_image: { kind: 'media' },
  cover: { kind: 'media' },
  logo: { kind: 'media' },
  students: { kind: 'relation-list' },
  themes: { kind: 'relation-list' },
  citations: { kind: 'relation-list' },
  subjects: { kind: 'relation-list' },
  school_ref: { kind: 'relation-one' },
  related_links: { kind: 'related-links' },
  revisions: { kind: 'revisions' },
  steps: { kind: 'path-steps' },
  startTime: { kind: 'datetime' },
  endTime: { kind: 'datetime' },
  importedAt: { kind: 'datetime' },
  originalPublishDate: { kind: 'datetime' },
  featuredUntil: { kind: 'datetime' },
  lastSyncAt: { kind: 'datetime' },
  publishedAt: { kind: 'published-at' },
}


export function normalizeRichValue(value: unknown) {
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

export function normalizeRelationList(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item))
}

function normalizeSingleRelation(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : null
}

function normalizeRelatedLinks(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null
      const record = item as Record<string, unknown>
      const target = normalizeSingleRelation(record.target_entry)
      if (!target) return null
      const relationType = typeof record.relation_type === 'string' && RELATED_LINK_TYPE_SET.has(record.relation_type)
        ? record.relation_type
        : 'related'
      return {
        target_entry: target,
        relation_type: relationType,
        curate_note: typeof record.curate_note === 'string' ? record.curate_note : '',
        order: toNumber(record.order, index),
      }
    })
    .filter(Boolean)
}

function normalizeRevisions(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const record = item as Record<string, unknown>
      const date = typeof record.date === 'string' ? record.date.slice(0, 10) : ''
      if (!date || Number.isNaN(new Date(date).getTime())) return null
      const revisionType = typeof record.revision_type === 'string' && REVISION_TYPE_SET.has(record.revision_type)
        ? record.revision_type
        : 'updated'
      return {
        date,
        revision_type: revisionType,
        note: typeof record.note === 'string' ? record.note : '',
      }
    })
    .filter(Boolean)
}

function normalizePathSteps(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const record = item as Record<string, unknown>
      const entry = normalizeSingleRelation(record.entry)
      if (!entry) return null
      return {
        entry,
        step_note: typeof record.step_note === 'string' ? record.step_note : '',
      }
    })
    .filter(Boolean)
}

function normalizePublishedAt(value: unknown) {
  if (typeof value === 'string' && value !== 'true' && value !== 'false') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
  }

  return normalizeBoolean(value) ? new Date().toISOString() : null
}

function normalizeField(field: string, value: unknown) {
  const schema = FIELD_SCHEMAS[field] || { kind: 'passthrough' }

  switch (schema.kind) {
    case 'text':
      return normalizeRichValue(value)
    case 'number':
      return toNumber(value, schema.defaultNumber || 0)
    case 'boolean':
      return normalizeBoolean(value, schema.defaultBoolean || false)
    case 'media':
      return normalizeMediaValue(value)
    case 'relation-list':
      return normalizeRelationList(value)
    case 'relation-one':
      return normalizeSingleRelation(value)
    case 'datetime':
      return normalizeDateTime(value)
    case 'published-at':
      return normalizePublishedAt(value)
    case 'related-links':
      return normalizeRelatedLinks(value)
    case 'revisions':
      return normalizeRevisions(value)
    case 'path-steps':
      return normalizePathSteps(value)
    default:
      return value
  }
}

export function pickAllowedFields(collection: PanelCollectionKey, input: Record<string, unknown>, locale?: string) {
  const config = COLLECTIONS[collection]
  const data: Record<string, unknown> = {}

  for (const field of config.fields) {
    if (!(field in input)) {
      continue
    }

    data[field] = normalizeField(field, input[field])
  }

  if (config.localized) {
    data.locale = mapLocale(locale)
  }

  return data
}

export function getInputData(ctx: any) {
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
