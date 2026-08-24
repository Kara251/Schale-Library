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

/** 每页条数选项；首项为默认值（不写进 URL）。 */
const PAGE_SIZE_OPTIONS = [12, 24, 50]

interface AnnouncementAdminEntry extends AdminStrapiEntry {
  title: string
  priority: number
  isPinned?: boolean
  isActive: boolean
}

interface AnnouncementsManagePageProps {
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
  statusScheduled: string
  statusDraft: string
  empty: string
  previous: string
  next: string
  pagination: string
  totalSummary: string
  perPage: string
  active: string
  inactive: string
  pinned: string
  priority: string
  updatedAt: string
  publishStatus: string
}> = {
  'zh-Hans': {
    title: '公告管理',
    description: '查看公告标题、优先级与发布状态。',
    search: '筛选',
    searchPlaceholder: '搜索公告标题',
    reset: '重置',
    statusAll: '全部状态',
    statusPublished: '已发布',
    statusScheduled: '已排期',
    statusDraft: '草稿',
    empty: '暂无符合条件的公告。',
    previous: '上一页',
    next: '下一页',
    pagination: '第 {page} / {pageCount} 页',
    totalSummary: '共 {total} 条',
    perPage: '每页',
    active: '启用',
    inactive: '停用',
    pinned: '置顶',
    priority: '优先级',
    updatedAt: '更新时间',
    publishStatus: '发布状态',
  },
  en: {
    title: 'Announcement Management',
    description: 'Review titles, priority, and publication state.',
    search: 'Filter',
    searchPlaceholder: 'Search announcement titles',
    reset: 'Reset',
    statusAll: 'All statuses',
    statusPublished: 'Published',
    statusScheduled: 'Scheduled',
    statusDraft: 'Draft',
    empty: 'No announcements matched the current filters.',
    previous: 'Previous',
    next: 'Next',
    pagination: 'Page {page} / {pageCount}',
    totalSummary: '{total} items',
    perPage: 'Per page',
    active: 'Active',
    inactive: 'Inactive',
    pinned: 'Pinned',
    priority: 'Priority',
    updatedAt: 'Updated',
    publishStatus: 'Publication',
  },
  ja: {
    title: 'お知らせ管理',
    description: 'タイトル、優先度、公開状態を確認します。',
    search: '絞り込み',
    searchPlaceholder: 'お知らせタイトルを検索',
    reset: 'リセット',
    statusAll: 'すべての状態',
    statusPublished: '公開済み',
    statusScheduled: '予約済み',
    statusDraft: '下書き',
    empty: '条件に一致するお知らせがありません。',
    previous: '前へ',
    next: '次へ',
    pagination: '{page} / {pageCount} ページ',
    totalSummary: '全 {total} 件',
    perPage: '1 ページ',
    active: '有効',
    inactive: '無効',
    pinned: '固定',
    priority: '優先度',
    updatedAt: '更新日時',
    publishStatus: '公開状態',
  },
}

function formatDate(value?: string) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default async function AnnouncementsManagePage({ params, searchParams }: AnnouncementsManagePageProps) {
  const { locale } = await params
  const query = await searchParams
  const session = await requireAdminSession(locale, `/${locale}/manage/announcements`)
  const t = labels[locale as Locale] || labels['zh-Hans']
  const actionLabels = getAdminActionLabels(locale as Locale)
  // 钳制：?page=abc 会变成 NaN，界面上就成了「第 NaN 页」
  const page = Math.max(1, Number(query.page || '1') || 1)
  const pageSize = PAGE_SIZE_OPTIONS.includes(Number(query.pageSize))
    ? Number(query.pageSize)
    : PAGE_SIZE_OPTIONS[0]!
  const status = query.status === 'published' || query.status === 'scheduled' || query.status === 'draft' ? query.status : 'all'

  const response = await listAdminCollection<AnnouncementAdminEntry>(session, 'announcements', {
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
    return `/${locale}/manage/announcements${qs ? `?${qs}` : ''}`
  }

  // 换每页条数时回到第一页：原页码在新分页下多半越界
  const buildPageSizeHref = (nextPageSize: number) => {
    const params = new URLSearchParams()
    if (query.search) params.set('search', query.search)
    if (status !== 'all') params.set('status', status)
    params.set('page', '1')
    if (nextPageSize !== PAGE_SIZE_OPTIONS[0]) params.set('pageSize', String(nextPageSize))
    const qs = params.toString()
    return `/${locale}/manage/announcements${qs ? `?${qs}` : ''}`
  }

  return (
    <div>
      <AdminPageHeader
        title={t.title}
        description={t.description}
        actions={
          <Button asChild>
            <Link href={`/${locale}/manage/announcements/new`}>{actionLabels.create}</Link>
          </Button>
        }
      />
      <AdminSearchForm
        action={`/${locale}/manage/announcements`}
        search={query.search}
        status={status}
        placeholder={t.searchPlaceholder}
        labels={{
          search: t.search,
          statusAll: t.statusAll,
          statusPublished: t.statusPublished,
          statusScheduled: t.statusScheduled,
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
            render: (item) => <div className="min-w-[220px] font-medium">{item.title}</div>,
          },
          {
            key: 'priority',
            header: t.priority,
            className: 'w-24',
            render: (item) => <span>{item.priority}</span>,
          },
          {
            key: 'isPinned',
            header: t.pinned,
            className: 'w-24',
            render: (item) => item.isPinned ? <Badge variant="default">{t.pinned}</Badge> : '-',
          },
          {
            key: 'isActive',
            header: t.active,
            className: 'w-28',
            render: (item) => (
              <Badge variant={item.isActive ? 'default' : 'secondary'}>
                {item.isActive ? t.active : t.inactive}
              </Badge>
            ),
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
                collection="announcements"
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
