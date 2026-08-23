/**
 * 面板写入字段归一化：字段白名单 + 类型校验。
 * 未登记字段直接抛 unknown_field（400），不做静默丢弃。
 */
import { COLLECTIONS, type CollectionDef, type FieldDef } from './collections'

export class FieldValidationError extends Error {
  constructor(
    message: string,
    readonly field?: string
  ) {
    super(message)
    this.name = 'FieldValidationError'
  }
}

const ALLOWED_LOCALES = new Set(['zh-Hans', 'en', 'ja'])

function toI18nJson(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') {
    throw new FieldValidationError('文本字段必须是字符串')
  }
  return JSON.stringify({ 'zh-Hans': value })
}

export function unwrapI18n(json: string | null): Record<string, string> | string | null {
  if (!json) return null
  try {
    const parsed: unknown = JSON.parse(json)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>
    }
  } catch {
    // 非 JSON 原样返回
  }
  return json
}

function normalizeText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') throw new FieldValidationError('文本字段必须是字符串')
  return value
}

function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) throw new FieldValidationError('数字字段无效')
  return n
}

function normalizeBoolean(value: unknown): number {
  if (typeof value === 'boolean') return value ? 1 : 0
  if (value === 'true') return 1
  if (value === 'false' || value === null || value === undefined) return 0
  if (typeof value === 'number') return value ? 1 : 0
  throw new FieldValidationError('布尔字段无效')
}

function normalizeMedia(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') throw new FieldValidationError('媒体字段必须是 URL 字符串')
  return value
}

function normalizeRelationOne(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isInteger(n) || n <= 0) throw new FieldValidationError('关联 ID 无效')
  return n
}

function normalizeDatetime(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const ms = new Date(String(value)).getTime()
  if (Number.isNaN(ms)) throw new FieldValidationError('日期格式无效')
  return ms
}

function normalizePublishedAt(value: unknown): number | null {
  if (typeof value === 'string' && value !== 'true' && value !== 'false') {
    const ms = new Date(value).getTime()
    return Number.isNaN(ms) ? null : ms
  }
  const truthy =
    typeof value === 'boolean' ? value : typeof value === 'number' ? value !== 0 : value === 'true'
  return truthy ? Date.now() : null
}

function normalizeByKind(field: FieldDef, value: unknown): string | number | null {
  switch (field.kind) {
    case 'text':
      return field.localized ? toI18nJson(normalizeText(value)) : normalizeText(value)
    case 'number':
      return normalizeNumber(value)
    case 'boolean':
      return normalizeBoolean(value)
    case 'media':
      return normalizeMedia(value)
    case 'relation-one':
      return normalizeRelationOne(value)
    case 'datetime':
      return normalizeDatetime(value)
    case 'published-at':
      return normalizePublishedAt(value)
    default:
      throw new FieldValidationError(`不支持的字段类型: ${field.kind}`)
  }
}

export interface NormalizedInput {
  /** column → 归一化后的值（i18n 字段已是 JSON 字符串） */
  values: Record<string, string | number | null>
  /** 同上，但目标是集合的 1:1 副表（如 event_locations） */
  sideValues: Record<string, string | number | null>
}

/**
 * 按集合白名单过滤并归一化 payload。
 * payload 中任何未登记字段 → FieldValidationError（拒绝而非忽略）。
 */
export function pickAllowedFields(
  collectionKey: string,
  payload: Record<string, unknown>,
  locale: string | undefined
): NormalizedInput {
  const def: CollectionDef = COLLECTIONS[collectionKey]
  const values: Record<string, string | number | null> = {}
  const sideValues: Record<string, string | number | null> = {}

  for (const key of Object.keys(payload)) {
    const field = def.fields[key]
    if (field) {
      values[field.column] = normalizeByKind(field, payload[key])
      continue
    }
    // 副表字段在面板契约里与主表字段是平的，写入时才分流
    const sideField = def.sideTable?.fields[key]
    if (sideField) {
      sideValues[sideField.column] = normalizeByKind(sideField, payload[key])
      continue
    }
    throw new FieldValidationError(`未登记字段: ${key}`, key)
  }

  void locale // i18n 单列 JSON 方案下 locale 仅影响读取，不影响存储
  return { values, sideValues }
}

export function mapLocale(locale: string | null | undefined): string {
  return locale && ALLOWED_LOCALES.has(locale) ? locale : 'zh-Hans'
}
