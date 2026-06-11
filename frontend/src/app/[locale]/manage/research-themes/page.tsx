import { AdminGenericListPage } from '@/components/admin/admin-generic-list-page'

interface ResearchThemesManagePageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; page?: string; status?: string }>
}

export default async function ResearchThemesManagePage({ params, searchParams }: ResearchThemesManagePageProps) {
  const { locale } = await params
  const query = await searchParams

  return (
    <AdminGenericListPage
      collection="research-themes"
      locale={locale}
      searchParams={query}
      primaryField="name"
    />
  )
}
