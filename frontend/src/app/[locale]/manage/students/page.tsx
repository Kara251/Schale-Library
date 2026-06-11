import { AdminGenericListPage } from '@/components/admin/admin-generic-list-page'
import type { Locale } from '@/lib/i18n'

interface StudentsManagePageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; page?: string; status?: string }>
}

const extraTextFields: Array<{ field: string; label: Record<Locale, string>; className?: string }> = [
  {
    field: 'school_ref.name',
    label: { 'zh-Hans': '学院', en: 'School', ja: '学園' },
    className: 'w-32',
  },
  {
    field: 'organization',
    label: { 'zh-Hans': '组织', en: 'Club', ja: '所属' },
    className: 'w-36',
  },
]

export default async function StudentsManagePage({ params, searchParams }: StudentsManagePageProps) {
  const { locale } = await params
  const query = await searchParams

  return (
    <AdminGenericListPage
      collection="students"
      locale={locale}
      searchParams={query}
      primaryField="name"
      extraTextFields={extraTextFields}
    />
  )
}
