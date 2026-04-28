import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { requireAdminSession } from '@/lib/server/admin-auth'
import { runBulkAction, type BulkActionPayload } from '@/lib/server/admin-content'
import type { AdminCollectionKey } from '@/lib/admin-panel'
import type { Locale } from '@/lib/i18n'

interface BulkActionsPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ updated?: string; failed?: string }>
}

const labels: Record<Locale, {
  title: string
  description: string
  collection: string
  action: string
  ids: string
  idsHelp: string
  optional: string
  submit: string
  result: string
}> = {
  'zh-Hans': {
    title: '批量操作',
    description: '对后台内容执行批量发布、下架、启用、停用和字段修复。',
    collection: '集合',
    action: '操作',
    ids: '内容 ID',
    idsHelp: '用英文逗号分隔，例如 1,2,3。',
    optional: '可选参数',
    submit: '执行批量操作',
    result: '上次执行',
  },
  en: {
    title: 'Bulk Actions',
    description: 'Publish, unpublish, activate, deactivate, and repair fields in batches.',
    collection: 'Collection',
    action: 'Action',
    ids: 'Content IDs',
    idsHelp: 'Separate IDs with commas, for example 1,2,3.',
    optional: 'Optional parameters',
    submit: 'Run bulk action',
    result: 'Last result',
  },
  ja: {
    title: '一括操作',
    description: '公開、非公開、有効化、無効化、フィールド修復を一括実行します。',
    collection: 'コレクション',
    action: '操作',
    ids: 'コンテンツ ID',
    idsHelp: '1,2,3 のようにカンマ区切りで入力します。',
    optional: '任意パラメータ',
    submit: '一括操作を実行',
    result: '前回の結果',
  },
}

function parseIds(value: FormDataEntryValue | null) {
  return String(value || '')
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item))
}

export default async function BulkActionsPage({ params, searchParams }: BulkActionsPageProps) {
  const { locale } = await params
  const query = await searchParams
  await requireAdminSession(locale, `/${locale}/manage/bulk-actions`)
  const t = labels[locale as Locale] || labels['zh-Hans']

  async function bulkAction(formData: FormData) {
    'use server'
    const session = await requireAdminSession(locale, `/${locale}/manage/bulk-actions`)
    const payload: BulkActionPayload = {
      collection: String(formData.get('collection') || 'works') as AdminCollectionKey,
      action: String(formData.get('action') || 'publish'),
      ids: parseIds(formData.get('ids')),
      locale,
      studentIds: parseIds(formData.get('studentIds')),
      sourcePlatform: String(formData.get('sourcePlatform') || ''),
      school: String(formData.get('school') || ''),
      organization: String(formData.get('organization') || ''),
      featuredPriority: Number(formData.get('featuredPriority') || 0),
    }
    const result = await runBulkAction(session, payload)
    redirect(`/${locale}/manage/bulk-actions?updated=${result.updated}&failed=${result.failed}`)
  }

  return (
    <div>
      <AdminPageHeader title={t.title} description={t.description} />

      {(query.updated || query.failed) && (
        <div className="mb-4 rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          {t.result}: updated={query.updated || 0}, failed={query.failed || 0}
        </div>
      )}

      <form action={bulkAction} className="space-y-4 rounded-lg border bg-card p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium">{t.collection}</span>
            <select name="collection" className="w-full rounded-md border bg-background px-3 py-2">
              <option value="works">works</option>
              <option value="students">students</option>
              <option value="announcements">announcements</option>
              <option value="online-events">online-events</option>
              <option value="offline-events">offline-events</option>
              <option value="bilibili-subscriptions">bilibili-subscriptions</option>
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">{t.action}</span>
            <select name="action" className="w-full rounded-md border bg-background px-3 py-2">
              <option value="publish">publish</option>
              <option value="unpublish">unpublish</option>
              <option value="activate">activate</option>
              <option value="deactivate">deactivate</option>
              <option value="set-students">set-students</option>
              <option value="set-source-platform">set-source-platform</option>
              <option value="set-featured">set-featured</option>
              <option value="unset-featured">unset-featured</option>
              <option value="set-featured-priority">set-featured-priority</option>
              <option value="set-student-school">set-student-school</option>
              <option value="set-student-organization">set-student-organization</option>
            </select>
          </label>
        </div>

        <label className="block space-y-2 text-sm">
          <span className="font-medium">{t.ids}</span>
          <textarea name="ids" required rows={3} className="w-full rounded-md border bg-background px-3 py-2" />
          <span className="text-xs text-muted-foreground">{t.idsHelp}</span>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium">{t.optional}: studentIds</span>
            <input name="studentIds" className="w-full rounded-md border bg-background px-3 py-2" />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">{t.optional}: sourcePlatform</span>
            <input name="sourcePlatform" className="w-full rounded-md border bg-background px-3 py-2" />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">{t.optional}: school</span>
            <input name="school" className="w-full rounded-md border bg-background px-3 py-2" />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">{t.optional}: organization</span>
            <input name="organization" className="w-full rounded-md border bg-background px-3 py-2" />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">{t.optional}: featuredPriority</span>
            <input name="featuredPriority" type="number" defaultValue="0" className="w-full rounded-md border bg-background px-3 py-2" />
          </label>
        </div>

        <Button type="submit">{t.submit}</Button>
      </form>
    </div>
  )
}
