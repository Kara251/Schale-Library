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
  type AdminCollectionKey,
  type AdminEditorField,
  type AdminMediaAsset,
  type AdminRelationOption,
} from '@/lib/admin-panel'
import type { AdminStrapiEntry } from '@/lib/server/admin-content'
import type { Locale } from '@/lib/i18n'
import { getMediaUrl } from '@/lib/media'
import { cn } from '@/lib/utils'

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
      return Array.isArray(value)
        ? value
            .map((item) => (item && typeof item === 'object' && 'id' in item ? Number((item as { id: number }).id) : Number(item)))
            .filter((item) => Number.isFinite(item))
        : []
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

export function AdminEditorForm({ collection, locale, returnPath, initialData, relationOptions }: AdminEditorFormProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [formValues, setFormValues] = useState<Record<string, unknown>>(() => buildInitialValues(collection, initialData))
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingField, setUploadingField] = useState<string | null>(null)
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
        return Array.isArray(value) ? value : []
      case 'number':
        return typeof value === 'string' ? value.trim() : value
      case 'datetime-local':
        return value || null
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
            const isFullWidth = field.type === 'textarea' || field.type === 'multiselect' || field.type === 'media'

            return (
              <div key={field.name} className={cn('space-y-2', isFullWidth && 'md:col-span-2')}>
                <label className="text-sm font-medium" htmlFor={field.name}>{label}</label>
                {field.type === 'textarea' ? (
                  <textarea
                    id={field.name}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(event) => updateField(field.name, event.target.value)}
                    className="min-h-32 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  />
                ) : null}

                {field.type === 'text' || field.type === 'url' || field.type === 'number' || field.type === 'datetime-local' ? (
                  <Input
                    id={field.name}
                    type={field.type === 'datetime-local' ? 'datetime-local' : field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(event) => updateField(field.name, event.target.value)}
                  />
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
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : null}

                {field.type === 'multiselect' ? (
                  <div className="rounded-md border p-3">
                    {(relationOptions?.[field.relationKey || ''] || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t.emptySelection}</p>
                    ) : (
                      <div className="grid gap-2 md:grid-cols-2">
                        {(relationOptions?.[field.relationKey || ''] || []).map((option) => {
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
