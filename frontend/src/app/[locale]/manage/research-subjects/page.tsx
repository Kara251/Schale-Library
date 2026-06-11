import { AdminGenericListPage } from '@/components/admin/admin-generic-list-page'

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; page?: string; status?: string }>
}

export default async function ResearchSubjectsManagePage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const query = await searchParams
  return (
    <AdminGenericListPage
      collection="research-subjects"
      locale={locale}
      searchParams={query}
      primaryField="name"
      badgeField="subject_type"
    />
  )
}
