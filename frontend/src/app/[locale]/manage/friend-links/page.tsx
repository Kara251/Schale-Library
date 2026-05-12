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

interface FriendLinkAdminEntry extends AdminStrapiEntry {
  title: string
  url: string
  priority: number
  isActive: boolean
}

interface FriendLinksManagePageProps {
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
  active: string
  inactive: string
  priority: string
  url: string
  updatedAt: string
  publishStatus: string
  previous: string
  next: string
  pagination: string
}> = {
  'zh-Hans': {
    title: '友情链接管理',
    description: '维护首页底部展示的友链卡片。',
    search: '筛选',
    searchPlaceholder: '搜索友链标题、简介或 URL',
    reset: '重置',
    statusAll: '全部状态',
    statusPublished: '已发布',
    statusDraft: '草稿',
    empty: '暂无符合条件的友情链接。',
    active: '启用',
    inactive: '停用',
    priority: '优先级',
    url: '链接',
    updatedAt: '更新时间',
    publishStatus: '发布状态',
    previous: '上一页',
    next: '下一页',
    pagination: '第 {page} / {pageCount} 页',
  },
  en: {
    title: 'Friend Link Management',
    description: 'Manage friend link cards shown at the bottom of the home page.',
    search: 'Filter',
    searchPlaceholder: 'Search title, description, or URL',
    reset: 'Reset',
    statusAll: 'All statuses',
    statusPublished: 'Published',
    statusDraft: 'Draft',
    empty: 'No friend links matched the current filters.',
    active: 'Active',
    inactive: 'Inactive',
    priority: 'Priority',
    url: 'URL',
    updatedAt: 'Updated',
    publishStatus: 'Publication',
    previous: 'Previous',
    next: 'Next',
    pagination: 'Page {page} / {pageCount}',
  },
  ja: {
    title: '相互リンク管理',
    description: 'ホーム下部に表示する相互リンクカードを管理します。',
    search: '絞り込み',
    searchPlaceholder: 'タイトル、説明、URL を検索',
    reset: 'リセット',
    statusAll: 'すべての状態',
    statusPublished: '公開済み',
    statusDraft: '下書き',
    empty: '条件に一致する相互リンクがありません。',
    active: '有効',
    inactive: '無効',
    priority: '優先度',
    url: 'URL',
    updatedAt: '更新日時',
    publishStatus: '公開状態',
    previous: '前へ',
    next: '次へ',
    pagination: '{page} / {pageCount} ページ',
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

export default async function FriendLinksManagePage({ params, searchParams }: FriendLinksManagePageProps) {
  const { locale } = await params
  const query = await searchParams
  const session = await requireAdminSession(locale, `/${locale}/manage/friend-links`)
  const t = labels[locale as Locale] || labels['zh-Hans']
  const actionLabels = getAdminActionLabels(locale as Locale)
  const page = Number(query.page || '1')
  const status = query.status === 'published' || query.status === 'draft' ? query.status : 'all'

  const response = await listAdminCollection<FriendLinkAdminEntry>(session, 'friend-links', {
    locale,
    page,
    search: query.search,
    status,
  })

  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams()
    if (query.search) params.set('search', query.search)
    if (status !== 'all') params.set('status', status)
    params.set('page', String(nextPage))
    const qs = params.toString()
    return `/${locale}/manage/friend-links${qs ? `?${qs}` : ''}`
  }

  return (
    <div>
      <AdminPageHeader
        title={t.title}
        description={t.description}
        actions={
          <Button asChild>
            <Link href={`/${locale}/manage/friend-links/new`}>{actionLabels.create}</Link>
          </Button>
        }
      />
      <AdminSearchForm
        action={`/${locale}/manage/friend-links`}
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
            render: (item) => <div className="min-w-[220px] font-medium">{item.title}</div>,
          },
          {
            key: 'url',
            header: t.url,
            render: (item) => <span className="line-clamp-1 max-w-[240px] text-sm text-muted-foreground">{item.url}</span>,
          },
          {
            key: 'priority',
            header: t.priority,
            className: 'w-24',
            render: (item) => <span>{item.priority}</span>,
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
                collection="friend-links"
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
