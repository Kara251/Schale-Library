import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AdminRowActions } from '@/components/admin/admin-row-actions'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminPagination } from '@/components/admin/admin-pagination'
import { AdminSearchForm } from '@/components/admin/admin-search-form'
import { AdminTable } from '@/components/admin/admin-table'
import type { Locale } from '@/lib/i18n'
import { getAdminActionLabels } from '@/lib/admin-panel-labels'
import { type AdminStrapiEntry, listAdminCollection } from '@/lib/server/admin-content'
import { requireAdminSession } from '@/lib/server/admin-auth'

interface ResearchCitationAdminEntry extends AdminStrapiEntry {
  claim_short: string
  source_type: string
  confidence: string
}

interface ResearchCitationsManagePageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; page?: string; status?: string }>
}

const labels: Record<Locale, {
  title: string
  description: string
  search: string
  searchPlaceholder: string
  reset: string
  statusAll: string
  statusPublished: string
  statusDraft: string
  empty: string
  previous: string
  next: string
  pagination: string
  updatedAt: string
  publishStatus: string
  sourceType: string
  confidence: string
}> = {
  'zh-Hans': {
    title: '考据引证管理',
    description: '维护可复用的原始出处与置信度。',
    search: '筛选',
    searchPlaceholder: '搜索论点摘要或出处标注',
    reset: '重置',
    statusAll: '全部状态',
    statusPublished: '已发布',
    statusDraft: '草稿',
    empty: '暂无符合条件的考据引证。',
    previous: '上一页',
    next: '下一页',
    pagination: '第 {page} / {pageCount} 页',
    updatedAt: '更新时间',
    publishStatus: '发布状态',
    sourceType: '来源类型',
    confidence: '置信度',
  },
  en: {
    title: 'Research Citation Management',
    description: 'Manage reusable primary sources and confidence levels.',
    search: 'Filter',
    searchPlaceholder: 'Search claim or source reference',
    reset: 'Reset',
    statusAll: 'All statuses',
    statusPublished: 'Published',
    statusDraft: 'Draft',
    empty: 'No citations matched the current filters.',
    previous: 'Previous',
    next: 'Next',
    pagination: 'Page {page} / {pageCount}',
    updatedAt: 'Updated',
    publishStatus: 'Publication',
    sourceType: 'Source type',
    confidence: 'Confidence',
  },
  ja: {
    title: '考察引証管理',
    description: '再利用可能な一次ソースと信頼度を管理します。',
    search: '絞り込み',
    searchPlaceholder: '論点要約または出典注記を検索',
    reset: 'リセット',
    statusAll: 'すべての状態',
    statusPublished: '公開済み',
    statusDraft: '下書き',
    empty: '条件に一致する考察引証がありません。',
    previous: '前へ',
    next: '次へ',
    pagination: '{page} / {pageCount} ページ',
    updatedAt: '更新日時',
    publishStatus: '公開状態',
    sourceType: 'ソースタイプ',
    confidence: '信頼度',
  },
}

function formatDate(value?: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default async function ResearchCitationsManagePage({ params, searchParams }: ResearchCitationsManagePageProps) {
  const { locale } = await params
  const query = await searchParams
  const session = await requireAdminSession(locale, `/${locale}/manage/research-citations`)
  const t = labels[locale as Locale] || labels['zh-Hans']
  const actionLabels = getAdminActionLabels(locale as Locale)
  const page = Number(query.page || '1')
  const status = query.status === 'published' || query.status === 'draft' ? query.status : 'all'

  const response = await listAdminCollection<ResearchCitationAdminEntry>(session, 'research-citations', {
    page,
    search: query.search,
    status,
  })

  const buildHref = (nextPage: number) => {
    const p = new URLSearchParams()
    if (query.search) p.set('search', query.search)
    if (status !== 'all') p.set('status', status)
    p.set('page', String(nextPage))
    const qs = p.toString()
    return `/${locale}/manage/research-citations${qs ? `?${qs}` : ''}`
  }

  return (
    <div>
      <AdminPageHeader
        title={t.title}
        description={t.description}
        actions={
          <Button asChild>
            <Link href={`/${locale}/manage/research-citations/new`}>{actionLabels.create}</Link>
          </Button>
        }
      />
      <AdminSearchForm
        action={`/${locale}/manage/research-citations`}
        search={query.search}
        status={status}
        placeholder={t.searchPlaceholder}
        labels={{
          search: t.search,
          statusAll: t.statusAll,
          statusPublished: t.statusPublished,
          statusDraft: t.statusDraft,
          reset: t.reset,
        }}
      />
      <AdminTable
        items={response.data}
        emptyText={t.empty}
        columns={[
          {
            key: 'claim_short',
            header: t.title,
            render: (item) => <div className="min-w-[200px] font-medium">{item.claim_short}</div>,
          },
          {
            key: 'source_type',
            header: t.sourceType,
            className: 'w-32',
            render: (item) => <span className="text-xs">{item.source_type}</span>,
          },
          {
            key: 'confidence',
            header: t.confidence,
            className: 'w-28',
            render: (item) => <span className="text-xs">{item.confidence}</span>,
          },
          {
            key: 'publishedAt',
            header: t.publishStatus,
            className: 'w-28',
            render: (item) => (
              <Badge variant={item.publishedAt ? 'default' : 'outline'}>
                {item.publishedAt ? t.statusPublished : t.statusDraft}
              </Badge>
            ),
          },
          {
            key: 'updatedAt',
            header: t.updatedAt,
            className: 'w-44',
            render: (item) => formatDate(item.updatedAt),
          },
          {
            key: 'actions',
            header: actionLabels.actions,
            className: 'w-40',
            render: (item) => (
              <AdminRowActions
                locale={locale}
                collection="research-citations"
                id={item.id}
                labels={{
                  edit: actionLabels.edit,
                  delete: actionLabels.delete,
                  deleting: actionLabels.deleting,
                  confirm: actionLabels.deleteConfirm,
                  cancel: actionLabels.cancel,
                  confirmDelete: actionLabels.confirmDelete,
                  deleted: actionLabels.deleteSuccess,
                  failed: actionLabels.createFailed,
                }}
              />
            ),
          },
        ]}
      />
      <AdminPagination
        page={response.meta.pagination.page}
        pageCount={response.meta.pagination.pageCount}
        buildHref={buildHref}
        labels={{
          previous: t.previous,
          next: t.next,
          summary: t.pagination,
        }}
      />
    </div>
  )
}
