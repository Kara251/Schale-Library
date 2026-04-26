import { Badge } from '@/components/ui/badge'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminPagination } from '@/components/admin/admin-pagination'
import { AdminSearchForm } from '@/components/admin/admin-search-form'
import { AdminTable } from '@/components/admin/admin-table'
import type { Locale } from '@/lib/i18n'
import { type AdminStrapiEntry, listAdminCollection } from '@/lib/server/admin-content'
import { requireAdminSession } from '@/lib/server/admin-auth'

type SyncLogStatus = 'success' | 'partial' | 'failed'
type SyncLogAction = 'bilibili-sync-one' | 'bilibili-sync-all' | 'bilibili-sync-cron'

interface SyncLogAdminEntry extends AdminStrapiEntry {
  action: SyncLogAction
  status: SyncLogStatus
  message?: string
  targetName?: string
  total?: number
  created?: number
  skipped?: number
  errorCount?: number
  errors?: unknown
  startedAt?: string
  durationMs?: number
}

interface SyncLogsManagePageProps {
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
  action: string
  target: string
  result: string
  numbers: string
  startedAt: string
  duration: string
  message: string
  noTarget: string
  success: string
  partial: string
  failed: string
  syncOne: string
  syncAll: string
  syncCron: string
  created: string
  skipped: string
  errors: string
}> = {
  'zh-Hans': {
    title: '同步日志',
    description: '查看 B站 RSS 同步、定时任务与自动导入的最近执行结果。',
    search: '筛选',
    searchPlaceholder: '搜索目标名称或消息',
    reset: '重置',
    statusAll: '全部状态',
    statusPublished: '已发布',
    statusDraft: '草稿',
    empty: '暂无同步日志。',
    previous: '上一页',
    next: '下一页',
    pagination: '第 {page} / {pageCount} 页',
    action: '任务',
    target: '目标',
    result: '结果',
    numbers: '统计',
    startedAt: '开始时间',
    duration: '耗时',
    message: '消息',
    noTarget: '全部订阅',
    success: '成功',
    partial: '部分成功',
    failed: '失败',
    syncOne: '单个订阅',
    syncAll: '手动同步全部',
    syncCron: '定时同步',
    created: '新增',
    skipped: '跳过',
    errors: '错误',
  },
  en: {
    title: 'Sync Logs',
    description: 'Review recent Bilibili RSS sync, cron, and auto-import results.',
    search: 'Filter',
    searchPlaceholder: 'Search target names or messages',
    reset: 'Reset',
    statusAll: 'All statuses',
    statusPublished: 'Published',
    statusDraft: 'Draft',
    empty: 'No sync logs yet.',
    previous: 'Previous',
    next: 'Next',
    pagination: 'Page {page} / {pageCount}',
    action: 'Task',
    target: 'Target',
    result: 'Result',
    numbers: 'Counts',
    startedAt: 'Started',
    duration: 'Duration',
    message: 'Message',
    noTarget: 'All subscriptions',
    success: 'Success',
    partial: 'Partial',
    failed: 'Failed',
    syncOne: 'Single feed',
    syncAll: 'Manual full sync',
    syncCron: 'Scheduled sync',
    created: 'Created',
    skipped: 'Skipped',
    errors: 'Errors',
  },
  ja: {
    title: '同期ログ',
    description: 'B站 RSS 同期、定期タスク、自動取込の最近の実行結果を確認します。',
    search: '絞り込み',
    searchPlaceholder: '対象名またはメッセージを検索',
    reset: 'リセット',
    statusAll: 'すべての状態',
    statusPublished: '公開済み',
    statusDraft: '下書き',
    empty: '同期ログはまだありません。',
    previous: '前へ',
    next: '次へ',
    pagination: '{page} / {pageCount} ページ',
    action: 'タスク',
    target: '対象',
    result: '結果',
    numbers: '件数',
    startedAt: '開始日時',
    duration: '所要時間',
    message: 'メッセージ',
    noTarget: 'すべての購読',
    success: '成功',
    partial: '一部成功',
    failed: '失敗',
    syncOne: '単一購読',
    syncAll: '手動一括同期',
    syncCron: '定期同期',
    created: '追加',
    skipped: 'スキップ',
    errors: 'エラー',
  },
}

function formatDate(value: string | undefined, locale: string) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatDuration(value?: number) {
  if (!Number.isFinite(value)) {
    return '-'
  }

  const seconds = Math.max(0, Math.round((value || 0) / 1000))
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

function getActionLabel(action: SyncLogAction, t: typeof labels['zh-Hans']) {
  if (action === 'bilibili-sync-one') return t.syncOne
  if (action === 'bilibili-sync-cron') return t.syncCron
  return t.syncAll
}

function getStatusLabel(status: SyncLogStatus, t: typeof labels['zh-Hans']) {
  if (status === 'failed') return t.failed
  if (status === 'partial') return t.partial
  return t.success
}

function getErrorPreview(errors: unknown) {
  if (!Array.isArray(errors)) {
    return ''
  }

  return errors
    .filter((error): error is string => typeof error === 'string' && error.trim().length > 0)
    .slice(0, 2)
    .join(' / ')
}

export default async function SyncLogsManagePage({ params, searchParams }: SyncLogsManagePageProps) {
  const { locale } = await params
  const query = await searchParams
  const session = await requireAdminSession(locale, `/${locale}/manage/sync-logs`)
  const t = labels[locale as Locale] || labels['zh-Hans']
  const page = Number(query.page || '1')

  const response = await listAdminCollection<SyncLogAdminEntry>(session, 'sync-logs', {
    page,
    search: query.search,
  })

  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams()
    if (query.search) params.set('search', query.search)
    params.set('page', String(nextPage))
    const qs = params.toString()
    return `/${locale}/manage/sync-logs${qs ? `?${qs}` : ''}`
  }

  return (
    <div>
      <AdminPageHeader title={t.title} description={t.description} />
      <AdminSearchForm
        action={`/${locale}/manage/sync-logs`}
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
            key: 'status',
            header: t.result,
            className: 'w-32',
            render: (item) => (
              <Badge variant={item.status === 'failed' ? 'destructive' : item.status === 'partial' ? 'secondary' : 'default'}>
                {getStatusLabel(item.status, t)}
              </Badge>
            ),
          },
          {
            key: 'action',
            header: t.action,
            className: 'w-40',
            render: (item) => getActionLabel(item.action, t),
          },
          {
            key: 'targetName',
            header: t.target,
            className: 'min-w-40',
            render: (item) => item.targetName || t.noTarget,
          },
          {
            key: 'counts',
            header: t.numbers,
            className: 'min-w-44',
            render: (item) => (
              <div className="space-y-1 text-xs leading-5 text-muted-foreground">
                <p>{t.created}: <span className="text-foreground">{item.created ?? 0}</span></p>
                <p>{t.skipped}: <span className="text-foreground">{item.skipped ?? 0}</span></p>
                <p>{t.errors}: <span className="text-foreground">{item.errorCount ?? 0}</span></p>
              </div>
            ),
          },
          {
            key: 'startedAt',
            header: t.startedAt,
            className: 'w-44',
            render: (item) => formatDate(item.startedAt, locale),
          },
          {
            key: 'durationMs',
            header: t.duration,
            className: 'w-24',
            render: (item) => formatDuration(item.durationMs),
          },
          {
            key: 'message',
            header: t.message,
            className: 'min-w-72',
            render: (item) => (
              <div className="max-w-xl space-y-1">
                <p className="leading-6">{item.message || '-'}</p>
                {getErrorPreview(item.errors) ? (
                  <p className="text-xs leading-5 text-destructive">{getErrorPreview(item.errors)}</p>
                ) : null}
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
