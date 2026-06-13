'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/contexts/toast-context'
import {
  ADMIN_COLLECTION_META,
  resolveOptionLabel,
  type AdminCollectionKey,
  type AdminEditorField,
  type AdminMediaAsset,
  type AdminRelationOption,
  type AdminRowColumn,
} from '@/lib/admin-panel'
import type { AdminStrapiEntry } from '@/lib/server/admin-content'
import type { Locale } from '@/lib/i18n'
import { getMediaUrl } from '@/lib/media'
import { cn } from '@/lib/utils'
import {
  getEventLocationLabel,
  getEventLocationOptions,
  normalizeEventLocationName,
  type EventLocationLevel,
} from '@/lib/utils/event-location'

interface AdminEditorFormProps {
  collection: AdminCollectionKey
  locale: Locale
  returnPath: string
  initialData?: AdminStrapiEntry | null
  relationOptions?: Record<string, AdminRelationOption[]>
}

interface MediaState {
  id: number | null
  url: string | null
  name?: string | null
}

const labels: Record<Locale, {
  save: string
  saving: string
  cancel: string
  upload: string
  uploading: string
  uploadHint: string
  removeImage: string
  saveSuccess: string
  saveFailed: string
  requiredError: string
  emptySelection: string
  relationSearch: string
  addRow: string
  removeRow: string
  moveUp: string
  moveDown: string
  emptyRows: string
  emptyLocation: string
}> = {
  'zh-Hans': {
    save: '保存',
    saving: '保存中...',
    cancel: '返回列表',
    upload: '上传文件',
    uploading: '上传中...',
    uploadHint: '支持直接上传到受保护的维护接口。',
    removeImage: '移除当前图片',
    saveSuccess: '保存成功',
    saveFailed: '保存失败',
    requiredError: '请至少填写标题或名称',
    emptySelection: '暂无可选项',
    relationSearch: '搜索可选项',
    addRow: '添加一行',
    removeRow: '删除',
    moveUp: '上移',
    moveDown: '下移',
    emptyRows: '尚未添加内容',
    emptyLocation: '不填写',
  },
  en: {
    save: 'Save',
    saving: 'Saving...',
    cancel: 'Back to list',
    upload: 'Upload file',
    uploading: 'Uploading...',
    uploadHint: 'Files are sent through the protected maintainer endpoint.',
    removeImage: 'Remove current image',
    saveSuccess: 'Saved successfully',
    saveFailed: 'Save failed',
    requiredError: 'Please provide at least a title or name',
    emptySelection: 'No available options',
    relationSearch: 'Search options',
    addRow: 'Add row',
    removeRow: 'Remove',
    moveUp: 'Move up',
    moveDown: 'Move down',
    emptyRows: 'Nothing added yet',
    emptyLocation: 'Leave empty',
  },
  ja: {
    save: '保存',
    saving: '保存中...',
    cancel: '一覧へ戻る',
    upload: 'ファイルをアップロード',
    uploading: 'アップロード中...',
    uploadHint: '保護された管理用エンドポイント経由で送信されます。',
    removeImage: '現在の画像を削除',
    saveSuccess: '保存しました',
    saveFailed: '保存に失敗しました',
    requiredError: 'タイトルまたは名前を入力してください',
    emptySelection: '選択肢がありません',
    relationSearch: '選択肢を検索',
    addRow: '行を追加',
    removeRow: '削除',
    moveUp: '上へ',
    moveDown: '下へ',
    emptyRows: 'まだ何も追加されていません',
    emptyLocation: '空欄',
  },
}

function toDateTimeLocal(value: string | null | undefined) {
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

function getInitialMedia(value: unknown): MediaState {
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

function getRelationIdValue(value: unknown): number | '' {
  if (value && typeof value === 'object' && 'id' in (value as Record<string, unknown>)) {
    const id = Number((value as { id: unknown }).id)
    return Number.isFinite(id) ? id : ''
  }
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : ''
}

type ComponentRow = Record<string, unknown>

function getInitialRows(field: AdminEditorField, value: unknown): ComponentRow[] {
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

function buildEmptyRow(field: AdminEditorField): ComponentRow {
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

function getInitialFieldValue(field: AdminEditorField, value: unknown): unknown {
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

function buildInitialValues(collection: AdminCollectionKey, initialData?: AdminStrapiEntry | null) {
  const schema = ADMIN_COLLECTION_META[collection]
  const values: Record<string, unknown> = {}

  for (const field of schema.fields) {
    values[field.name] = getInitialFieldValue(field, initialData?.[field.name])
  }

  return values
}

function getDisplayLabel(field: AdminEditorField, locale: Locale) {
  return field.label[locale] || field.label['zh-Hans']
}

function getLocationLevel(field: AdminEditorField): EventLocationLevel {
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

function getFormStringValue(values: Record<string, unknown>, key: string) {
  const value = values[key]
  return typeof value === 'string' ? value : ''
}

function getLocationSelectOptions(field: AdminEditorField, values: Record<string, unknown>, locale: Locale) {
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

export function AdminEditorForm({ collection, locale, returnPath, initialData, relationOptions }: AdminEditorFormProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [formValues, setFormValues] = useState<Record<string, unknown>>(() => buildInitialValues(collection, initialData))
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingField, setUploadingField] = useState<string | null>(null)
  const [relationSearch, setRelationSearch] = useState<Record<string, string>>({})
  const t = labels[locale] || labels['zh-Hans']
  const schema = ADMIN_COLLECTION_META[collection]

  const primaryFieldValue = ['title', 'name', 'upName'].reduce((result, key) => {
    if (result) {
      return result
    }

    const value = formValues[key]
    return typeof value === 'string' && value.trim() ? value.trim() : ''
  }, '')

  const updateField = (name: string, value: unknown) => {
    setFormValues((current) => ({ ...current, [name]: value }))
  }

  const updateLocationField = (field: AdminEditorField, value: string) => {
    setFormValues((current) => {
      const next = { ...current, [field.name]: value }
      if (field.name === 'country') {
        next.region = ''
        next.city = ''
      }
      if (field.name === 'region') {
        next.city = ''
      }
      return next
    })
  }

  const handleUpload = async (fieldName: string, file: File | null) => {
    if (!file) {
      return
    }

    setUploadingField(fieldName)
    setError(null)

    try {
      const body = new FormData()
      body.append('files', file)
      body.append('fieldName', fieldName)
      body.append('collection', collection)

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body,
        credentials: 'same-origin',
      })

      const data = (await response.json().catch(() => null)) as { data?: AdminMediaAsset[]; error?: string } | null
      if (!response.ok || !data?.data?.[0]) {
        throw new Error(data?.error || t.saveFailed)
      }

      const uploaded = data.data[0]
      updateField(fieldName, {
        id: uploaded.id,
        url: uploaded.url,
        name: uploaded.name,
      })
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t.saveFailed)
    } finally {
      setUploadingField(null)
    }
  }

  const serializeValue = (field: AdminEditorField, value: unknown) => {
    switch (field.type) {
      case 'media': {
        const media = value as MediaState
        return media?.id ?? null
      }
      case 'multiselect':
      case 'relation-multiselect':
        return Array.isArray(value) ? value : []
      case 'relation-select':
        return typeof value === 'number' && value > 0 ? value : null
      case 'component-rows':
        return Array.isArray(value) ? value : []
      case 'json-csv':
        return typeof value === 'string' && value.trim()
          ? value.split(',').map((v) => v.trim()).filter(Boolean)
          : []
      case 'number':
        return typeof value === 'string' ? value.trim() : value
      case 'datetime-local':
        return value || null
      case 'location-select':
        return normalizeEventLocationName(typeof value === 'string' ? value : '')
      default:
        return value
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!primaryFieldValue) {
      setError(t.requiredError)
      return
    }

    setError(null)
    setIsSaving(true)

    try {
      const data = Object.fromEntries(
        schema.fields.map((field) => [field.name, serializeValue(field, formValues[field.name])])
      )

      const endpoint = initialData?.id
        ? `/api/admin/content/${collection}/${initialData.id}?locale=${encodeURIComponent(locale)}`
        : `/api/admin/content/${collection}`

      const response = await fetch(endpoint, {
        method: initialData?.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ data, locale }),
      })

      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        throw new Error(payload?.error || t.saveFailed)
      }

      showToast({ message: t.saveSuccess, variant: 'success' })
      router.push(returnPath)
      router.refresh()
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : t.saveFailed
      setError(message)
      showToast({ message, variant: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{initialData?.id ? schema.editLabel[locale] : schema.createLabel[locale]}</CardTitle>
          <CardDescription>{schema.description[locale]}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          {schema.fields.map((field) => {
            const value = formValues[field.name]
            const label = getDisplayLabel(field, locale)
            const isFullWidth = field.type === 'textarea' || field.type === 'multiselect' || field.type === 'relation-multiselect' || field.type === 'media' || field.type === 'json-csv' || field.type === 'component-rows'

            return (
              <div key={field.name} className={cn('space-y-2', isFullWidth && 'md:col-span-2')}>
                <label className="text-sm font-medium" htmlFor={field.name}>{label}</label>
                {field.description ? (
                  <p className="text-xs text-muted-foreground">{field.description[locale] || field.description['zh-Hans']}</p>
                ) : null}
                {field.type === 'textarea' ? (
                  <textarea
                    id={field.name}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(event) => updateField(field.name, event.target.value)}
                    className="min-h-32 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  />
                ) : null}

                {field.type === 'json-csv' ? (
                  <div className="space-y-1.5">
                    <Input
                      id={field.name}
                      type="text"
                      value={typeof value === 'string' ? value : ''}
                      onChange={(event) => updateField(field.name, event.target.value)}
                      placeholder="value1, value2, ..."
                    />
                    <p className="text-xs text-muted-foreground">
                      {locale === 'zh-Hans' ? '多个值用英文逗号分隔' : locale === 'ja' ? '複数値はコンマで区切る' : 'Separate multiple values with commas'}
                    </p>
                  </div>
                ) : null}

                {field.type === 'text' || field.type === 'url' || field.type === 'number' || field.type === 'datetime-local' ? (
                  <Input
                    id={field.name}
                    type={field.type === 'datetime-local' ? 'datetime-local' : field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(event) => updateField(field.name, event.target.value)}
                  />
                ) : null}

                {field.type === 'location-select' ? (
                  <select
                    id={field.name}
                    value={normalizeEventLocationName(typeof value === 'string' ? value : '')}
                    onChange={(event) => updateLocationField(field, event.target.value)}
                    className="h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  >
                    <option value="">{t.emptyLocation}</option>
                    {getLocationSelectOptions(field, formValues, locale).map((option) => (
                      <option key={option.value} value={option.value}>
                        {getEventLocationLabel(option.value, locale)}
                      </option>
                    ))}
                  </select>
                ) : null}

                {field.type === 'boolean' ? (
                  <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(event) => updateField(field.name, event.target.checked)}
                    />
                    <span>{label}</span>
                  </label>
                ) : null}

                {field.type === 'select' ? (
                  <select
                    id={field.name}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(event) => updateField(field.name, event.target.value)}
                    className="h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  >
                    <option value="">-</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {resolveOptionLabel(option, locale)}
                      </option>
                    ))}
                  </select>
                ) : null}

                {field.type === 'multiselect' || field.type === 'relation-multiselect' ? (
                  <div className="rounded-md border p-3">
                    {(() => {
                      const options = relationOptions?.[field.relationKey || ''] || []
                      const search = relationSearch[field.name]?.trim().toLowerCase() || ''
                      const visibleOptions = search
                        ? options.filter((option) => {
                            const haystack = `${option.label} ${option.description || ''}`.toLowerCase()
                            return haystack.includes(search)
                          })
                        : options

                      return (
                        <div className="space-y-3">
                          {field.type === 'relation-multiselect' && options.length > 6 ? (
                            <Input
                              type="search"
                              value={relationSearch[field.name] || ''}
                              onChange={(event) => setRelationSearch((current) => ({ ...current, [field.name]: event.target.value }))}
                              placeholder={t.relationSearch}
                            />
                          ) : null}
                          {options.length === 0 || visibleOptions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t.emptySelection}</p>
                          ) : (
                            <div className="grid gap-2 md:grid-cols-2">
                              {visibleOptions.map((option) => {
                                const selected = Array.isArray(value) && value.includes(option.id)
                                return (
                                  <label key={option.id} className="flex items-start gap-3 rounded-md border px-3 py-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      onChange={(event) => {
                                        const current = Array.isArray(value) ? value.map(Number) : []
                                        updateField(
                                          field.name,
                                          event.target.checked
                                            ? [...current, option.id]
                                            : current.filter((item) => item !== option.id)
                                        )
                                      }}
                                    />
                                    <div>
                                      <p className="font-medium">{option.label}</p>
                                      {option.description ? <p className="text-xs text-muted-foreground">{option.description}</p> : null}
                                    </div>
                                  </label>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                ) : null}

                {field.type === 'relation-select' ? (
                  <select
                    id={field.name}
                    value={typeof value === 'number' ? String(value) : ''}
                    onChange={(event) => updateField(field.name, event.target.value ? Number(event.target.value) : '')}
                    className="h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  >
                    <option value="">-</option>
                    {(relationOptions?.[field.relationKey || ''] || []).map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}{option.description ? ` — ${option.description}` : ''}
                      </option>
                    ))}
                  </select>
                ) : null}

                {field.type === 'component-rows' ? (
                  <ComponentRowsEditor
                    field={field}
                    rows={Array.isArray(value) ? value as ComponentRow[] : []}
                    locale={locale}
                    relationOptions={relationOptions}
                    labels={{ add: t.addRow, remove: t.removeRow, moveUp: t.moveUp, moveDown: t.moveDown, empty: t.emptyRows }}
                    onChange={(rows) => updateField(field.name, rows)}
                  />
                ) : null}

                {field.type === 'media' ? (
                  <div className="rounded-md border p-3">
                    {(() => {
                      const media = value as MediaState
                      return (
                        <div className="space-y-3">
                          {media?.url ? (
                            <div className="relative h-48 overflow-hidden rounded-md border bg-secondary/20">
                              <Image src={getMediaUrl(media.url)} alt={media.name || label} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                            </div>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-3">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-secondary/60">
                              {uploadingField === field.name ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                              <span>{uploadingField === field.name ? t.uploading : t.upload}</span>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(event) => {
                                  const file = event.target.files?.[0] ?? null
                                  void handleUpload(field.name, file)
                                  event.currentTarget.value = ''
                                }}
                              />
                            </label>
                            {media?.id ? (
                              <Button type="button" variant="outline" onClick={() => updateField(field.name, { id: null, url: null, name: null })}>
                                {t.removeImage}
                              </Button>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground">{t.uploadHint}</p>
                        </div>
                      )
                    })()}
                  </div>
                ) : null}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? t.saving : t.save}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(returnPath)}>
          {t.cancel}
        </Button>
      </div>
    </form>
  )
}

interface ComponentRowsEditorProps {
  field: AdminEditorField
  rows: ComponentRow[]
  locale: Locale
  relationOptions?: Record<string, AdminRelationOption[]>
  labels: { add: string; remove: string; moveUp: string; moveDown: string; empty: string }
  onChange: (rows: ComponentRow[]) => void
}

function ComponentRowsEditor({ field, rows, locale, relationOptions, labels, onChange }: ComponentRowsEditorProps) {
  const columns = field.columns || []

  const updateRow = (index: number, name: string, value: unknown) => {
    const next = rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [name]: value } : row))
    onChange(next)
  }

  const moveRow = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= rows.length) {
      return
    }
    const next = [...rows]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    onChange(next)
  }

  const renderColumn = (column: AdminRowColumn, row: ComponentRow, index: number) => {
    const value = row[column.name]
    const columnLabel = column.label[locale] || column.label['zh-Hans']

    if (column.kind === 'relation') {
      const options = relationOptions?.[column.relationKey || ''] || []
      return (
        <select
          aria-label={columnLabel}
          value={typeof value === 'number' ? String(value) : ''}
          onChange={(event) => updateRow(index, column.name, event.target.value ? Number(event.target.value) : '')}
          className="h-9 w-full rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        >
          <option value="">-</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
      )
    }

    if (column.kind === 'select') {
      return (
        <select
          aria-label={columnLabel}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => updateRow(index, column.name, event.target.value)}
          className="h-9 w-full rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        >
          {(column.options || []).map((option) => (
            <option key={option.value} value={option.value}>{resolveOptionLabel(option, locale)}</option>
          ))}
        </select>
      )
    }

    return (
      <Input
        aria-label={columnLabel}
        type={column.kind === 'date' ? 'date' : 'text'}
        value={typeof value === 'string' ? value : ''}
        placeholder={columnLabel}
        onChange={(event) => updateRow(index, column.name, event.target.value)}
      />
    )
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{labels.empty}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-md border bg-secondary/10 p-2 md:flex-row md:items-center">
              <span className="hidden w-6 shrink-0 text-center text-xs text-muted-foreground md:block">{index + 1}</span>
              <div className="grid flex-1 gap-2 md:grid-cols-3">
                {columns.map((column) => (
                  <div key={column.name}>{renderColumn(column, row, index)}</div>
                ))}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button type="button" variant="ghost" size="sm" disabled={index === 0} onClick={() => moveRow(index, -1)} aria-label={labels.moveUp}>
                  ↑
                </Button>
                <Button type="button" variant="ghost" size="sm" disabled={index === rows.length - 1} onClick={() => moveRow(index, 1)} aria-label={labels.moveDown}>
                  ↓
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}>
                  {labels.remove}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, buildEmptyRow(field)])}>
        {labels.add}
      </Button>
    </div>
  )
}
