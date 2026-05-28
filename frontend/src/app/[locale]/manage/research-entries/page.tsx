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

interface ResearchEntryAdminEntry extends AdminStrapiEntry {
  title: string
  stance: string
  media_type: string
}

interface ResearchEntriesManagePageProps {
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
  stance: string
  mediaType: string
}> = {
  'zh-Hans': {
    title: '考据条目管理',
    description: '维护考据档案的主体内容与发布状态。',
    search: '筛选',
    searchPlaceholder: '搜索标题或摘要',
    reset: '重置',
    statusAll: '全部状态',
    statusPublished: '已发布',
    statusDraft: '草稿',
    empty: '暂无符合条件的考据条目。',
    previous: '上一页',
    next: '下一页',
    pagination: '第 {page} / {pageCount} 页',
    updatedAt: '更新时间',
    publishStatus: '发布状态',
    stance: '立场',
    mediaType: '媒介',
  },
  en: {
    title: 'Research Entry Management',
    description: 'Manage research archive entries and publication state.',
    search: 'Filter',
    searchPlaceholder: 'Search title or summary',
    reset: 'Reset',
    statusAll: 'All statuses',
    statusPublished: 'Published',
    statusDraft: 'Draft',
    empty: 'No entries matched the current filters.',
    previous: 'Previous',
    next: 'Next',
    pagination: 'Page {page} / {pageCount}',
    updatedAt: 'Updated',
    publishStatus: 'Publication',
    stance: 'Stance',
    mediaType: 'Media',
  },
  ja: {
    title: '考察記事管理',
    description: '考察アーカイブの記事と公開状態を管理します。',
    search: '絞り込み',
    searchPlaceholder: 'タイトルまたは要約を検索',
    reset: 'リセット',
    statusAll: 'すべての状態',
    statusPublished: '公開済み',
    statusDraft: '下書き',
    empty: '条件に一致する考察記事がありません。',
    previous: '前へ',
    next: '次へ',
    pagination: '{page} / {pageCount} ページ',
    updatedAt: '更新日時',
    publishStatus: '公開状態',
    stance: 'スタンス',
    mediaType: 'メディア',
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

export default async function ResearchEntriesManagePage({ params, searchParams }: ResearchEntriesManagePageProps) {
  const { locale } = await params
  const query = await searchParams
  const session = await requireAdminSession(locale, `/${locale}/manage/research-entries`)
  const t = labels[locale as Locale] || labels['zh-Hans']
  const actionLabels = getAdminActionLabels(locale as Locale)
  const page = Number(query.page || '1')
  const status = query.status === 'published' || query.status === 'draft' ? query.status : 'all'

  const response = await listAdminCollection<ResearchEntryAdminEntry>(session, 'research-entries', {
    locale,
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
    return `/${locale}/manage/research-entries${qs ? `?${qs}` : ''}`
  }

  return (
    <div>
      <AdminPageHeader
        title={t.title}
        description={t.description}
        actions={
          <Button asChild>
            <Link href={`/${locale}/manage/research-entries/new`}>{actionLabels.create}</Link>
          </Button>
        }
      />
      <AdminSearchForm
        action={`/${locale}/manage/research-entries`}
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
            key: 'title',
            header: t.title,
            render: (item) => <div className="min-w-[200px] font-medium">{item.title}</div>,
          },
          {
            key: 'stance',
            header: t.stance,
            className: 'w-28',
            render: (item) => <span className="text-xs">{item.stance}</span>,
          },
          {
            key: 'media_type',
            header: t.mediaType,
            className: 'w-28',
            render: (item) => <span className="text-xs">{item.media_type}</span>,
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
                collection="research-entries"
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
