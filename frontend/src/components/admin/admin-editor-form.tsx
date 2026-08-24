'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/contexts/toast-context'
import { AdminPublishStateField } from '@/components/admin/admin-publish-state-field'
import {
  ADMIN_COLLECTION_META,
  resolveOptionLabel,
  type AdminCollectionKey,
  type AdminEditorField,
  type AdminMediaAsset,
  type AdminRelationOption,
  type AdminRowColumn,
} from '@/lib/admin-panel'
import type { AdminEntry } from '@/lib/server/admin-content'
import { labels as ADMIN_EDITOR_LABELS } from './admin-editor-labels'
import {
  buildInitialValues,
  getDisplayLabel,
  getLocationSelectOptions,
  type ComponentRow,
  type MediaState,
} from './admin-value-utils'
import type { Locale } from '@/lib/i18n'
import { getMediaUrl } from '@/lib/media'
import { cn } from '@/lib/utils'
import {
  getEventLocationLabel,
  normalizeEventLocationName,
} from '@/lib/utils/event-location'

interface AdminEditorFormProps {
  collection: AdminCollectionKey
  locale: Locale
  returnPath: string
  initialData?: AdminEntry | null
  relationOptions?: Record<string, AdminRelationOption[]>
}

const labels = ADMIN_EDITOR_LABELS

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

    // 必填项在提交前一次性校验完，避免填了一长串才被后端逐条拒回
    const missing = schema.fields
      .filter((field) => field.required)
      .filter((field) => {
        const value = formValues[field.name]
        return value === undefined || value === null || String(value).trim() === ''
      })
      .map((field) => getDisplayLabel(field, locale))

    if (missing.length > 0) {
      setError(`${t.missingFields}${missing.join('、')}`)
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
      {/* 标题与说明由页面头承载；表单本身不套卡片，靠字段间距分区 */}
      <div className="grid gap-5 md:grid-cols-2">
          {schema.fields.map((field) => {
            const value = formValues[field.name]
            const label = getDisplayLabel(field, locale)
            const isFullWidth = field.type === 'textarea' || field.type === 'multiselect' || field.type === 'relation-multiselect' || field.type === 'media' || field.type === 'json-csv' || field.type === 'component-rows'

            return (
              <div key={field.name} className={cn('space-y-2', isFullWidth && 'md:col-span-2')}>
                <label className="text-sm font-medium" htmlFor={field.name}>
                  {label}
                  {field.required ? <span className="ml-1 text-destructive" aria-hidden="true">*</span> : null}
                </label>
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

                {/* 外层已渲染字段名，这里只给开关本体与状态文案，避免同一标签出现两次 */}
                {field.type === 'publish-state' ? (
                  <AdminPublishStateField
                    locale={locale}
                    value={value}
                    onChange={(next) => updateField(field.name, next)}
                  />
                ) : null}

                {field.type === 'boolean' ? (
                  <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                    <input
                      id={field.name}
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(event) => updateField(field.name, event.target.checked)}
                    />
                    <span className="text-muted-foreground">{Boolean(value) ? t.booleanOn : t.booleanOff}</span>
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
                                        // 关联值是 documentId 字符串，不能 map(Number)
                                        const current = Array.isArray(value) ? value.map(String) : []
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
      </div>

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
