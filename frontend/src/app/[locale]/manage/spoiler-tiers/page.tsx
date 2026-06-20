import { AdminGenericListPage } from '@/components/admin/admin-generic-list-page'

interface SpoilerTiersManagePageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; page?: string; status?: string }>
}

export default async function SpoilerTiersManagePage({ params, searchParams }: SpoilerTiersManagePageProps) {
  const { locale } = await params
  const query = await searchParams

  return (
    <AdminGenericListPage
      collection="spoiler-tiers"
      locale={locale}
      searchParams={query}
      primaryField="name"
    />
  )
}
