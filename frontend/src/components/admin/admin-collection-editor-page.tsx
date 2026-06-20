import Link from 'next/link'

import { AdminEditorForm } from '@/components/admin/admin-editor-form'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { Button } from '@/components/ui/button'
import {
  ADMIN_COLLECTION_META,
  type AdminCollectionKey,
  type AdminRelationOption,
} from '@/lib/admin-panel'
import type { Locale } from '@/lib/i18n'
import {
  type AdminStrapiEntry,
  getAdminCollectionItem,
  listAdminCollection,
} from '@/lib/server/admin-content'
import { requireAdminSession } from '@/lib/server/admin-auth'
import type { AdminSession } from '@/lib/server/admin-auth'

interface AdminCollectionEditorPageProps {
  collection: AdminCollectionKey
  locale: Locale
  id?: string
}

const labels: Record<Locale, { back: string }> = {
  'zh-Hans': { back: '返回列表' },
  en: { back: 'Back to list' },
  ja: { back: '一覧へ戻る' },
}

interface RelationSourceConfig {
  collection: AdminCollectionKey
  localized: boolean
  toOption: (entry: AdminStrapiEntry) => AdminRelationOption
}

/** 关系选项数据源：relationKey → 拉取配置 */
const RELATION_SOURCES: Record<string, RelationSourceConfig> = {
  students: {
    collection: 'students',
    localized: true,
    toOption: (entry) => ({
      id: entry.id,
      label: String(entry.name || `#${entry.id}`),
      description: [entry.school, entry.organization].filter(Boolean).join(' / '),
    }),
  },
  schools: {
    collection: 'schools',
    localized: true,
    toOption: (entry) => ({
      id: entry.id,
      label: String(entry.name || `#${entry.id}`),
      description: typeof entry.slug === 'string' ? entry.slug : undefined,
    }),
  },
  'research-themes': {
    collection: 'research-themes',
    localized: true,
    toOption: (entry) => ({
      id: entry.id,
      label: String(entry.name || `#${entry.id}`),
      description: typeof entry.slug === 'string' ? entry.slug : undefined,
    }),
  },
  'research-citations': {
    collection: 'research-citations',
    localized: false,
    toOption: (entry) => ({
      id: entry.id,
      label: String(entry.claim_short || `#${entry.id}`),
      description: [entry.source_type, entry.source_ref].filter(Boolean).join(' / '),
    }),
  },
  'research-entries': {
    collection: 'research-entries',
    localized: true,
    toOption: (entry) => ({
      id: entry.id,
      label: String(entry.title || `#${entry.id}`),
      description: typeof entry.slug === 'string' ? entry.slug : undefined,
    }),
  },
  'research-subjects': {
    collection: 'research-subjects',
    localized: true,
    toOption: (entry) => ({
      id: entry.id,
      label: String(entry.name || `#${entry.id}`),
      description: typeof entry.subject_type === 'string' ? entry.subject_type : undefined,
    }),
  },
  'spoiler-tiers': {
    collection: 'spoiler-tiers',
    localized: true,
    toOption: (entry) => ({
      id: entry.id,
      label: String(entry.name || `#${entry.id}`),
      description: typeof entry.key === 'string' ? entry.key : undefined,
    }),
  },
}

async function loadRelationOptions(
  session: AdminSession,
  locale: Locale,
  relationKeys: string[]
): Promise<Record<string, AdminRelationOption[]>> {
  const relationOptions: Record<string, AdminRelationOption[]> = {}

  await Promise.all(relationKeys.map(async (relationKey) => {
    const source = RELATION_SOURCES[relationKey]
    if (!source) {
      return
    }

    const response = await listAdminCollection<AdminStrapiEntry>(session, source.collection, {
      locale: source.localized ? locale : undefined,
      page: 1,
      pageSize: 100,
      status: 'all',
    })
    relationOptions[relationKey] = response.data.map(source.toOption)
  }))

  return relationOptions
}

export async function AdminCollectionEditorPage({ collection, locale, id }: AdminCollectionEditorPageProps) {
  const session = await requireAdminSession(locale, `/${locale}/manage/${collection}${id ? `/${id}` : '/new'}`)
  const meta = ADMIN_COLLECTION_META[collection]
  const returnPath = `/${locale}/manage/${collection}`
  const t = labels[locale] || labels['zh-Hans']

  const initialData = id ? await getAdminCollectionItem(session, collection, Number(id), locale) : null

  const relationKeys = Array.from(new Set(
    meta.fields.flatMap((field) => [
      field.relationKey,
      ...(field.columns || []).map((column) => column.relationKey),
    ]).filter((key): key is string => Boolean(key))
  ))

  const relationOptions = await loadRelationOptions(session, locale, relationKeys)

  return (
    <div>
      <AdminPageHeader
        title={id ? meta.editLabel[locale] : meta.createLabel[locale]}
        description={meta.description[locale]}
        actions={
          <Button asChild variant="outline">
            <Link href={returnPath}>{t.back}</Link>
          </Button>
        }
      />
      <AdminEditorForm
        collection={collection}
        locale={locale}
        initialData={initialData}
        relationOptions={Object.keys(relationOptions).length ? relationOptions : undefined}
        returnPath={returnPath}
      />
    </div>
  )
}
