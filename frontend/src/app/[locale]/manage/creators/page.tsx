import Link from 'next/link'

import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminPagination } from '@/components/admin/admin-pagination'
import { AdminRowActions } from '@/components/admin/admin-row-actions'
import { AdminSearchForm } from '@/components/admin/admin-search-form'
import { AdminTable } from '@/components/admin/admin-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getAdminActionLabels } from '@/lib/admin-panel-labels'
import type { Locale } from '@/lib/i18n'
import { type AdminStrapiEntry, listAdminCollection } from '@/lib/server/admin-content'
import { requireAdminSession } from '@/lib/server/admin-auth'

/** 每页条数选项；首项为默认值（不写进 URL）。 */
const PAGE_SIZE_OPTIONS = [12, 24, 50]

interface CreatorAdminEntry extends AdminStrapiEntry {
  name: string
  slug: string
  platform: string
  isFeatured: boolean
  featuredPriority: number
}

interface CreatorsManagePageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; page?: string; pageSize?: string; status?: string }>
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
  platform: string
  featured: string
  notFeatured: string
  priority: string
  updatedAt: string
  publishStatus: string
  previous: string
  next: string
  pagination: string
  totalSummary: string
  perPage: string
}> = {
  'zh-Hans': {
    title: '创作者',
    description: '维护创作者档案与代表作。',
    search: '筛选',
    searchPlaceholder: '搜索创作者名称或 Slug',
    reset: '重置',
    statusAll: '全部状态',
    statusPublished: '已发布',
    statusDraft: '草稿',
    empty: '暂无符合条件的创作者。',
    platform: '平台',
    featured: '精选',
    notFeatured: '未精选',
    priority: '优先级',
    updatedAt: '更新时间',
    publishStatus: '发布状态',
    previous: '上一页',
    next: '下一页',
    pagination: '第 {page} / {pageCount} 页',
    totalSummary: '共 {total} 条',
    perPage: '每页',
  },
  en: {
    title: 'Creators',
    description: 'Manage creator profiles, featured picks, and representative works.',
    search: 'Filter',
    searchPlaceholder: 'Search creators by name or slug',
    reset: 'Reset',
    statusAll: 'All statuses',
    statusPublished: 'Published',
    statusDraft: 'Draft',
    empty: 'No creators matched the current filters.',
    platform: 'Platform',
    featured: 'Featured',
    notFeatured: 'Not featured',
    priority: 'Priority',
    updatedAt: 'Updated at',
    publishStatus: 'Publish status',
    previous: 'Previous',
    next: 'Next',
    pagination: 'Page {page} / {pageCount}',
    totalSummary: '{total} items',
    perPage: 'Per page',
  },
  ja: {
    title: 'クリエイター',
    description: 'クリエイター情報、おすすめ設定、代表作品を管理します。',
    search: '絞り込み',
    searchPlaceholder: 'クリエイター名またはスラグで検索',
    reset: 'リセット',
    statusAll: 'すべての状態',
    statusPublished: '公開済み',
    statusDraft: '下書き',
    empty: '条件に一致するクリエイターはありません。',
    platform: 'プラットフォーム',
    featured: 'おすすめ',
    notFeatured: '通常',
    priority: '優先度',
    updatedAt: '更新日時',
    publishStatus: '公開状態',
    previous: '前へ',
    next: '次へ',
    pagination: '{page} / {pageCount} ページ',
    totalSummary: '全 {total} 件',
    perPage: '1 ページ',
  },
}

function formatDate(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

export default async function CreatorsManagePage({ params, searchParams }: CreatorsManagePageProps) {
  const { locale } = await params
  const query = await searchParams
  const session = await requireAdminSession(locale, `/${locale}/manage/creators`)
  const t = labels[locale as Locale] || labels['zh-Hans']
  const actionLabels = getAdminActionLabels(locale as Locale)
  // 钳制：?page=abc 会变成 NaN，界面上就成了「第 NaN 页」
  const page = Math.max(1, Number(query.page || '1') || 1)
  const pageSize = PAGE_SIZE_OPTIONS.includes(Number(query.pageSize))
    ? Number(query.pageSize)
    : PAGE_SIZE_OPTIONS[0]!
  const status = query.status === 'published' || query.status === 'draft' ? query.status : 'all'

  const response = await listAdminCollection<CreatorAdminEntry>(session, 'creators', {
    locale,
    page,
    pageSize,
    search: query.search,
    status,
  })

  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams()
    if (query.search) params.set('search', query.search)
    if (status !== 'all') params.set('status', status)
    params.set('page', String(nextPage))
    const qs = params.toString()
    return `/${locale}/manage/creators${qs ? `?${qs}` : ''}`
  }

  // 换每页条数时回到第一页：原页码在新分页下多半越界
  const buildPageSizeHref = (nextPageSize: number) => {
    const params = new URLSearchParams()
    if (query.search) params.set('search', query.search)
    if (status !== 'all') params.set('status', status)
    params.set('page', '1')
    if (nextPageSize !== PAGE_SIZE_OPTIONS[0]) params.set('pageSize', String(nextPageSize))
    const qs = params.toString()
    return `/${locale}/manage/creators${qs ? `?${qs}` : ''}`
  }

  return (
    <div>
      <AdminPageHeader
        title={t.title}
        description={t.description}
        actions={
          <Button asChild>
            <Link href={`/${locale}/manage/creators/new`}>{actionLabels.create}</Link>
          </Button>
        }
      />
      <AdminSearchForm
        action={`/${locale}/manage/creators`}
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
            key: 'name',
            header: t.title,
            render: (item) => <div className="min-w-[180px] font-medium">{item.name}</div>,
          },
          {
            key: 'platform',
            header: t.platform,
            render: (item) => <span>{item.platform}</span>,
          },
          {
            key: 'isFeatured',
            header: t.featured,
            className: 'w-28',
            render: (item) => (
              <Badge variant={item.isFeatured ? 'default' : 'secondary'}>
                {item.isFeatured ? t.featured : t.notFeatured}
              </Badge>
            ),
          },
          {
            key: 'featuredPriority',
            header: t.priority,
            className: 'w-24',
            render: (item) => <span>{item.featuredPriority}</span>,
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
                collection="creators"
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
        total={response.meta.pagination.total}
        pageSize={pageSize}
        buildHref={buildHref}
        buildPageSizeHref={buildPageSizeHref}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        labels={{
          previous: t.previous,
          next: t.next,
          summary: t.pagination,
          totalSummary: t.totalSummary,
          perPage: t.perPage,
        }}
      />
    </div>
  )
}
