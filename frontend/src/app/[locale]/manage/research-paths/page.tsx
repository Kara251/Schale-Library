import { AdminGenericListPage } from '@/components/admin/admin-generic-list-page'

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; page?: string; status?: string }>
}

export default async function ResearchPathsManagePage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const query = await searchParams
  return (
    <AdminGenericListPage
      collection="research-paths"
      locale={locale}
      searchParams={query}
      primaryField="title"
      badgeField="difficulty"
    />
  )
}
