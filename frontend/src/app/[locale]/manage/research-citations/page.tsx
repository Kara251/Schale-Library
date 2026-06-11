import { AdminGenericListPage } from '@/components/admin/admin-generic-list-page'
import type { Locale } from '@/lib/i18n'

interface ResearchCitationsManagePageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; page?: string; status?: string }>
}

const extraTextFields: Array<{ field: string; label: Record<Locale, string>; className?: string }> = [
  {
    field: 'source_type',
    label: { 'zh-Hans': '来源类型', en: 'Source type', ja: 'ソースタイプ' },
    className: 'w-32',
  },
  {
    field: 'confidence',
    label: { 'zh-Hans': '置信度', en: 'Confidence', ja: '信頼度' },
    className: 'w-28',
  },
]

export default async function ResearchCitationsManagePage({ params, searchParams }: ResearchCitationsManagePageProps) {
  const { locale } = await params
  const query = await searchParams

  return (
    <AdminGenericListPage
      collection="research-citations"
      locale={locale}
      searchParams={query}
      primaryField="claim_short"
      extraTextFields={extraTextFields}
    />
  )
}
