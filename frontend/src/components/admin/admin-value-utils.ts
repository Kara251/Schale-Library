import {
  ADMIN_COLLECTION_META,
  type AdminCollectionKey,
  type AdminEditorField,
  type AdminMediaAsset,
} from '@/lib/admin-panel'
import type { AdminEntry } from '@/lib/server/admin-content'
import type { Locale } from '@/lib/i18n'
import {
  getEventLocationLabel,
  getEventLocationOptions,
  normalizeEventLocationName,
  type EventLocationLevel,
} from '@/lib/utils/event-location'

export interface MediaState {
  id: number | null
  url: string | null
  name?: string | null
}

export function toDateTimeLocal(value: string | null | undefined) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const pad = (input: number) => String(input).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function getInitialMedia(value: unknown): MediaState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { id: null, url: null }
  }

  const media = value as AdminMediaAsset
  return {
    id: typeof media.id === 'number' ? media.id : null,
    url: typeof media.url === 'string' ? media.url : null,
    name: media.name,
  }
}

export function getRelationIdValue(value: unknown): number | '' {
  if (value && typeof value === 'object' && 'id' in (value as Record<string, unknown>)) {
    const id = Number((value as { id: unknown }).id)
    return Number.isFinite(id) ? id : ''
  }
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : ''
}

export type ComponentRow = Record<string, unknown>

export function getInitialRows(field: AdminEditorField, value: unknown): ComponentRow[] {
  if (!Array.isArray(value) || !field.columns) {
    return []
  }

  return value.map((item) => {
    const record = item && typeof item === 'object' ? item as Record<string, unknown> : {}
    const row: ComponentRow = {}
    for (const column of field.columns || []) {
      const raw = record[column.name]
      if (column.kind === 'relation') {
        row[column.name] = getRelationIdValue(raw)
      } else if (column.kind === 'date') {
        row[column.name] = typeof raw === 'string' ? raw.slice(0, 10) : ''
      } else {
        row[column.name] = typeof raw === 'string' ? raw : ''
      }
    }
    return row
  })
}

export function buildEmptyRow(field: AdminEditorField): ComponentRow {
  const row: ComponentRow = {}
  for (const column of field.columns || []) {
    if (column.kind === 'relation') {
      row[column.name] = ''
    } else if (column.kind === 'select') {
      row[column.name] = column.options?.[0]?.value || ''
    } else if (column.kind === 'date') {
      row[column.name] = new Date().toISOString().slice(0, 10)
    } else {
      row[column.name] = ''
    }
  }
  return row
}

export function getInitialFieldValue(field: AdminEditorField, value: unknown): unknown {
  switch (field.type) {
    case 'boolean':
      return Boolean(value)
    case 'number':
      return typeof value === 'number' ? String(value) : value ? String(value) : '0'
    case 'datetime-local':
      return typeof value === 'string' ? toDateTimeLocal(value) : ''
    case 'media':
      return getInitialMedia(value)
    case 'multiselect':
    case 'relation-multiselect':
      return Array.isArray(value)
        ? value
            .map((item) => (item && typeof item === 'object' && 'id' in item ? Number((item as { id: number }).id) : Number(item)))
            .filter((item) => Number.isFinite(item))
        : []
    case 'relation-select':
      return getRelationIdValue(value)
    case 'component-rows':
      return getInitialRows(field, value)
    case 'json-csv':
      return Array.isArray(value) ? value.join(', ') : typeof value === 'string' ? value : ''
    default:
      return typeof value === 'string' ? value : ''
  }
}

export function buildInitialValues(collection: AdminCollectionKey, initialData?: AdminEntry | null) {
  const schema = ADMIN_COLLECTION_META[collection]
  const values: Record<string, unknown> = {}

  for (const field of schema.fields) {
    values[field.name] = getInitialFieldValue(field, initialData?.[field.name])
  }

  return values
}

export function getDisplayLabel(field: AdminEditorField, locale: Locale) {
  return field.label[locale] || field.label['zh-Hans']
}

export function getLocationLevel(field: AdminEditorField): EventLocationLevel {
  if (field.locationLevel) {
    return field.locationLevel
  }
  if (field.name === 'city') {
    return 'city'
  }
  if (field.name === 'region') {
    return 'region'
  }
  return 'country'
}

export function getFormStringValue(values: Record<string, unknown>, key: string) {
  const value = values[key]
  return typeof value === 'string' ? value : ''
}

export function getLocationSelectOptions(field: AdminEditorField, values: Record<string, unknown>, locale: Locale) {
  const level = getLocationLevel(field)
  const options = getEventLocationOptions(level, locale, {
    country: getFormStringValue(values, 'country'),
    region: getFormStringValue(values, 'region'),
  })
  const currentValue = normalizeEventLocationName(getFormStringValue(values, field.name))

  if (currentValue && !options.some((option) => option.value === currentValue)) {
    return [
      {
        value: currentValue,
        label: {
          'zh-Hans': currentValue,
          en: getEventLocationLabel(currentValue, 'en'),
          ja: getEventLocationLabel(currentValue, 'ja'),
        },
      },
      ...options,
    ]
  }

  return options
}
