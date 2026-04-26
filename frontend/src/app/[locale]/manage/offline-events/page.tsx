import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AdminRowActions } from '@/components/admin/admin-row-actions'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminPagination } from '@/components/admin/admin-pagination'
import { AdminSearchForm } from '@/components/admin/admin-search-form'
import { AdminTable } from '@/components/admin/admin-table'
import { getAdminActionLabels } from '@/lib/admin-panel-labels'
import type { Locale } from '@/lib/i18n'
import { type AdminStrapiEntry, listAdminCollection } from '@/lib/server/admin-content'
import { requireAdminSession } from '@/lib/server/admin-auth'

interface OfflineEventAdminEntry extends AdminStrapiEntry {
  title: string
  organizer?: string
  location: string
  nature: 'official' | 'fanmade'
  startTime: string
  endTime: string
}

interface OfflineEventsManagePageProps {
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
  organizer: string
  location: string
  period: string
  nature: string
  publication: string
}> = {
  'zh-Hans': {
    title: '线下活动管理',
    description: '查看线下活动时间、地点与发布状态。',
    search: '筛选',
    searchPlaceholder: '搜索活动标题、主办方或地点',
    reset: '重置',
    statusAll: '全部状态',
    statusPublished: '已发布',
    statusDraft: '草稿',
    empty: '暂无符合条件的线下活动。',
    previous: '上一页',
    next: '下一页',
    pagination: '第 {page} / {pageCount} 页',
    organizer: '主办方',
    location: '地点',
    period: '活动时间',
    nature: '性质',
    publication: '发布状态',
  },
  en: {
    title: 'Offline Event Management',
    description: 'Review schedule, location, and publication state.',
    search: 'Filter',
    searchPlaceholder: 'Search event titles, organizers, or places',
    reset: 'Reset',
    statusAll: 'All statuses',
    statusPublished: 'Published',
    statusDraft: 'Draft',
    empty: 'No offline events matched the current filters.',
    previous: 'Previous',
    next: 'Next',
    pagination: 'Page {page} / {pageCount}',
    organizer: 'Organizer',
    location: 'Location',
    period: 'Schedule',
    nature: 'Nature',
    publication: 'Publication',
  },
  ja: {
    title: 'オフラインイベント管理',
    description: '開催時間、場所、公開状態を確認します。',
    search: '絞り込み',
    searchPlaceholder: 'イベント名、主催、場所を検索',
    reset: 'リセット',
    statusAll: 'すべての状態',
    statusPublished: '公開済み',
    statusDraft: '下書き',
    empty: '条件に一致するオフラインイベントがありません。',
    previous: '前へ',
    next: '次へ',
    pagination: '{page} / {pageCount} ページ',
    organizer: '主催',
    location: '場所',
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

export default async function OfflineEventsManagePage({ params, searchParams }: OfflineEventsManagePageProps) {
  const { locale } = await params
  const query = await searchParams
  const session = await requireAdminSession(locale, `/${locale}/manage/offline-events`)
  const t = labels[locale as Locale] || labels['zh-Hans']
  const actionLabels = getAdminActionLabels(locale as Locale)
  const page = Number(query.page || '1')
  const status = query.status === 'published' || query.status === 'draft' ? query.status : 'all'

  const response = await listAdminCollection<OfflineEventAdminEntry>(session, 'offline-events', {
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
    return `/${locale}/manage/offline-events${qs ? `?${qs}` : ''}`
  }

  return (
    <div>
      <AdminPageHeader
        title={t.title}
        description={t.description}
        actions={
          <Button asChild>
            <Link href={`/${locale}/manage/offline-events/new`}>{actionLabels.create}</Link>
          </Button>
        }
      />
      <AdminSearchForm
        action={`/${locale}/manage/offline-events`}
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
            key: 'location',
            header: t.location,
            render: (item) => item.location,
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
            key: 'publishedAt',
            header: t.publication,
            className: 'w-28',
            render: (item) => <Badge variant={item.publishedAt ? 'default' : 'outline'}>{item.publishedAt ? t.statusPublished : t.statusDraft}</Badge>,
          },
          {
            key: 'actions',
            header: actionLabels.actions,
            className: 'w-40',
            render: (item) => (
              <AdminRowActions
                locale={locale}
                collection="offline-events"
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
        labels={{ previous: t.previous, next: t.next, summary: t.pagination }}
      />
    </div>
  )
}
