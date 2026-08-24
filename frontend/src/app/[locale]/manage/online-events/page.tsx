import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { AdminRowActions } from '@/components/admin/admin-row-actions'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminPagination } from '@/components/admin/admin-pagination'
import { AdminSearchForm } from '@/components/admin/admin-search-form'
import { AdminTable } from '@/components/admin/admin-table'
import { getAdminActionLabels } from '@/lib/admin-panel-labels'
import type { Locale } from '@/lib/i18n'
import { type AdminEntry, listAdminCollection } from '@/lib/server/admin-content'
import { requireAdminSession } from '@/lib/server/admin-auth'
import { AdminPublishStatusText } from '@/components/admin/admin-publish-status'

/** 每页条数选项；首项为默认值（不写进 URL）。 */
const PAGE_SIZE_OPTIONS = [12, 24, 50]

interface OnlineEventAdminEntry extends AdminEntry {
  title: string
  organizer?: string
  nature: 'official' | 'fanmade'
  startTime: string
  endTime: string
}

interface OnlineEventsManagePageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; page?: string; pageSize?: string; status?: string }>
}

const labels: Record<Locale, {
  title: string
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
  organizer: string
  period: string
  nature: string
  publication: string
}> = {
  'zh-Hans': {
    title: '线上活动管理',
    search: '筛选',
    searchPlaceholder: '搜索活动标题或主办方',
    reset: '重置',
    statusAll: '全部状态',
    statusPublished: '已发布',
    statusScheduled: '已排期',
    statusDraft: '草稿',
    empty: '暂无符合条件的线上活动。',
    previous: '上一页',
    next: '下一页',
    pagination: '第 {page} / {pageCount} 页',
    totalSummary: '共 {total} 条',
    perPage: '每页',
    organizer: '主办方',
    period: '活动时间',
    nature: '性质',
    publication: '发布状态',
  },
  en: {
    title: 'Online Event Management',
    search: 'Filter',
    searchPlaceholder: 'Search event titles or organizers',
    reset: 'Reset',
    statusAll: 'All statuses',
    statusPublished: 'Published',
    statusScheduled: 'Scheduled',
    statusDraft: 'Draft',
    empty: 'No online events matched the current filters.',
    previous: 'Previous',
    next: 'Next',
    pagination: 'Page {page} / {pageCount}',
    totalSummary: '{total} items',
    perPage: 'Per page',
    organizer: 'Organizer',
    period: 'Schedule',
    nature: 'Nature',
    publication: 'Publication',
  },
  ja: {
    title: 'オンラインイベント管理',
    search: '絞り込み',
    searchPlaceholder: 'イベント名または主催者を検索',
    reset: 'リセット',
    statusAll: 'すべての状態',
    statusPublished: '公開済み',
    statusScheduled: '予約済み',
    statusDraft: '下書き',
    empty: '条件に一致するオンラインイベントがありません。',
    previous: '前へ',
    next: '次へ',
    pagination: '{page} / {pageCount} ページ',
    totalSummary: '全 {total} 件',
    perPage: '1 ページ',
    organizer: '主催',
    period: '開催期間',
    nature: '区分',
    publication: '公開状態',
  },
}

function formatDateRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`
}

export default async function OnlineEventsManagePage({ params, searchParams }: OnlineEventsManagePageProps) {
  const { locale } = await params
  const query = await searchParams
  const session = await requireAdminSession(locale, `/${locale}/manage/online-events`)
  const t = labels[locale as Locale] || labels['zh-Hans']
  const actionLabels = getAdminActionLabels(locale as Locale)
  // 钳制：?page=abc 会变成 NaN，界面上就成了「第 NaN 页」
  const page = Math.max(1, Number(query.page || '1') || 1)
  const pageSize = PAGE_SIZE_OPTIONS.includes(Number(query.pageSize))
    ? Number(query.pageSize)
    : PAGE_SIZE_OPTIONS[0]!
  const status = query.status === 'published' || query.status === 'scheduled' || query.status === 'draft' ? query.status : 'all'

  const response = await listAdminCollection<OnlineEventAdminEntry>(session, 'online-events', {
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
    // 翻页要保留每页条数，否则选了 50/页再点下一页会被打回默认值
    if (pageSize !== PAGE_SIZE_OPTIONS[0]) params.set('pageSize', String(pageSize))
    const qs = params.toString()
    return `/${locale}/manage/online-events${qs ? `?${qs}` : ''}`
  }

  // 换每页条数时回到第一页：原页码在新分页下多半越界
  const buildPageSizeHref = (nextPageSize: number) => {
    const params = new URLSearchParams()
    if (query.search) params.set('search', query.search)
    if (status !== 'all') params.set('status', status)
    params.set('page', '1')
    if (nextPageSize !== PAGE_SIZE_OPTIONS[0]) params.set('pageSize', String(nextPageSize))
    const qs = params.toString()
    return `/${locale}/manage/online-events${qs ? `?${qs}` : ''}`
  }

  return (
    <div>
      <AdminPageHeader
        title={t.title}
       
        actions={
          <Button asChild>
            <Link href={`/${locale}/manage/online-events/new`}>{actionLabels.create}</Link>
          </Button>
        }
      />
      <AdminSearchForm
        action={`/${locale}/manage/online-events`}
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
            key: 'organizer',
            header: t.organizer,
            render: (item) => item.organizer || '-',
          },
          {
            key: 'period',
            header: t.period,
            className: 'w-56',
            render: (item) => formatDateRange(item.startTime, item.endTime),
          },
          {
            key: 'nature',
            header: t.nature,
            className: 'w-24',
            render: (item) => <span className="text-sm">{item.nature}</span>,
          },
          {
            key: 'publishedAt',
            header: t.publication,
            className: 'w-28',
            render: (item) => (
              <AdminPublishStatusText
                status={typeof item.status === 'string' ? item.status : undefined}
                labels={{ published: t.statusPublished, scheduled: t.statusScheduled, draft: t.statusDraft }}
              />
            ),
          },
          {
            key: 'actions',
            header: actionLabels.actions,
            className: 'w-40',
            render: (item) => (
              <AdminRowActions
                locale={locale}
                collection="online-events"
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
