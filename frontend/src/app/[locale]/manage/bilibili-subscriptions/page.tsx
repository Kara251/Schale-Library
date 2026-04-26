import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BilibiliSyncActions } from '@/components/admin/bilibili-sync-actions'
import { AdminRowActions } from '@/components/admin/admin-row-actions'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminPagination } from '@/components/admin/admin-pagination'
import { AdminSearchForm } from '@/components/admin/admin-search-form'
import { AdminTable } from '@/components/admin/admin-table'
import { getAdminActionLabels } from '@/lib/admin-panel-labels'
import type { Locale } from '@/lib/i18n'
import { type AdminStrapiEntry, listAdminCollection } from '@/lib/server/admin-content'
import { requireAdminSession } from '@/lib/server/admin-auth'

interface BilibiliSubscriptionAdminEntry extends AdminStrapiEntry {
  upName: string
  uid: string
  isActive: boolean
  defaultNature: 'official' | 'fanmade'
  syncCount?: number
  lastSyncAt?: string
}

interface BilibiliSubscriptionsManagePageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; page?: string }>
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
  uid: string
  status: string
  nature: string
  syncCount: string
  lastSyncAt: string
  active: string
  inactive: string
  syncOne: string
  syncAll: string
  syncing: string
  syncFailed: string
}> = {
  'zh-Hans': {
    title: 'B站订阅管理',
    description: '查看订阅状态、默认性质与同步统计。',
    search: '筛选',
    searchPlaceholder: '搜索 UP 名称或 UID',
    reset: '重置',
    statusAll: '全部状态',
    statusPublished: '已发布',
    statusDraft: '草稿',
    empty: '暂无符合条件的订阅。',
    previous: '上一页',
    next: '下一页',
    pagination: '第 {page} / {pageCount} 页',
    uid: 'UID',
    status: '状态',
    nature: '默认性质',
    syncCount: '同步次数',
    lastSyncAt: '最近同步',
    active: '启用',
    inactive: '停用',
    syncOne: '同步该订阅',
    syncAll: '同步全部活跃订阅',
    syncing: '同步中...',
    syncFailed: '同步失败',
  },
  en: {
    title: 'Bilibili Subscription Management',
    description: 'Review subscription status, default nature, and sync metrics.',
    search: 'Filter',
    searchPlaceholder: 'Search creator names or UID',
    reset: 'Reset',
    statusAll: 'All statuses',
    statusPublished: 'Published',
    statusDraft: 'Draft',
    empty: 'No subscriptions matched the current filters.',
    previous: 'Previous',
    next: 'Next',
    pagination: 'Page {page} / {pageCount}',
    uid: 'UID',
    status: 'Status',
    nature: 'Default nature',
    syncCount: 'Sync count',
    lastSyncAt: 'Last sync',
    active: 'Active',
    inactive: 'Inactive',
    syncOne: 'Sync subscription',
    syncAll: 'Sync all active feeds',
    syncing: 'Syncing...',
    syncFailed: 'Sync failed',
  },
  ja: {
    title: 'B站購読管理',
    description: '購読状態、既定区分、同期統計を確認します。',
    search: '絞り込み',
    searchPlaceholder: 'UP 名または UID を検索',
    reset: 'リセット',
    statusAll: 'すべての状態',
    statusPublished: '公開済み',
    statusDraft: '下書き',
    empty: '条件に一致する購読がありません。',
    previous: '前へ',
    next: '次へ',
    pagination: '{page} / {pageCount} ページ',
    uid: 'UID',
    status: '状態',
    nature: '既定区分',
    syncCount: '同期回数',
    lastSyncAt: '最終同期',
    active: '有効',
    inactive: '無効',
    syncOne: 'この購読を同期',
    syncAll: '有効な購読を一括同期',
    syncing: '同期中...',
    syncFailed: '同期に失敗しました',
  },
}

function formatDate(value?: string) {
  return value ? new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value)) : '-'
}

export default async function BilibiliSubscriptionsManagePage({ params, searchParams }: BilibiliSubscriptionsManagePageProps) {
  const { locale } = await params
  const query = await searchParams
  const session = await requireAdminSession(locale, `/${locale}/manage/bilibili-subscriptions`)
  const t = labels[locale as Locale] || labels['zh-Hans']
  const actionLabels = getAdminActionLabels(locale as Locale)
  const page = Number(query.page || '1')

  const response = await listAdminCollection<BilibiliSubscriptionAdminEntry>(session, 'bilibili-subscriptions', {
    page,
    search: query.search,
  })

  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams()
    if (query.search) params.set('search', query.search)
    params.set('page', String(nextPage))
    const qs = params.toString()
    return `/${locale}/manage/bilibili-subscriptions${qs ? `?${qs}` : ''}`
  }

  return (
    <div>
      <AdminPageHeader
        title={t.title}
        description={t.description}
        actions={
          <div className="flex flex-wrap gap-2">
            <BilibiliSyncActions
              labels={{
                syncOne: t.syncOne,
                syncAll: t.syncAll,
                syncing: t.syncing,
                failed: t.syncFailed,
              }}
            />
            <Button asChild>
              <Link href={`/${locale}/manage/bilibili-subscriptions/new`}>{actionLabels.create}</Link>
            </Button>
          </div>
        }
      />
      <AdminSearchForm
        action={`/${locale}/manage/bilibili-subscriptions`}
        search={query.search}
        showStatus={false}
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
            key: 'upName',
            header: t.title,
            render: (item) => <div className="min-w-[200px] font-medium">{item.upName}</div>,
          },
          {
            key: 'uid',
            header: t.uid,
            render: (item) => item.uid,
          },
          {
            key: 'isActive',
            header: t.status,
            className: 'w-24',
            render: (item) => <Badge variant={item.isActive ? 'default' : 'secondary'}>{item.isActive ? t.active : t.inactive}</Badge>,
          },
          {
            key: 'defaultNature',
            header: t.nature,
            className: 'w-28',
            render: (item) => <Badge variant="outline">{item.defaultNature}</Badge>,
          },
          {
            key: 'syncCount',
            header: t.syncCount,
            className: 'w-24',
            render: (item) => item.syncCount ?? 0,
          },
          {
            key: 'lastSyncAt',
            header: t.lastSyncAt,
            className: 'w-44',
            render: (item) => formatDate(item.lastSyncAt),
          },
          {
            key: 'actions',
            header: actionLabels.actions,
            className: 'w-64',
            render: (item) => (
              <div className="flex flex-wrap gap-2">
                <BilibiliSyncActions
                  id={item.id}
                  labels={{
                    syncOne: t.syncOne,
                    syncAll: t.syncAll,
                    syncing: t.syncing,
                    failed: t.syncFailed,
                  }}
                />
                <AdminRowActions
                  locale={locale}
                  collection="bilibili-subscriptions"
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
              </div>
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
