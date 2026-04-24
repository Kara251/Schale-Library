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

interface AdminCollectionEditorPageProps {
  collection: AdminCollectionKey
  locale: Locale
  id?: string
}

interface StudentOptionEntry extends AdminStrapiEntry {
  name: string
  school?: string
  organization?: string
}

const labels: Record<Locale, { back: string }> = {
  'zh-Hans': { back: '返回列表' },
  en: { back: 'Back to list' },
  ja: { back: '一覧へ戻る' },
}

export async function AdminCollectionEditorPage({ collection, locale, id }: AdminCollectionEditorPageProps) {
  const session = await requireAdminSession(locale, `/${locale}/manage/${collection}${id ? `/${id}` : '/new'}`)
  const meta = ADMIN_COLLECTION_META[collection]
  const returnPath = `/${locale}/manage/${collection}`
  const t = labels[locale] || labels['zh-Hans']

  const initialData = id ? await getAdminCollectionItem(session, collection, Number(id), locale) : null

  let relationOptions: Record<string, AdminRelationOption[]> | undefined
  if (collection === 'works') {
    const students = await listAdminCollection<StudentOptionEntry>(session, 'students', {
      locale,
      page: 1,
      pageSize: 100,
      status: 'all',
    })

    relationOptions = {
      students: students.data.map((student) => ({
        id: student.id,
        label: student.name,
        description: [student.school, student.organization].filter(Boolean).join(' / '),
      })),
    }
  }

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
        relationOptions={relationOptions}
        returnPath={returnPath}
      />
    </div>
  )
}
