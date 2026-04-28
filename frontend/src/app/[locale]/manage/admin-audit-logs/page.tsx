import { Badge } from '@/components/ui/badge'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminPagination } from '@/components/admin/admin-pagination'
import { AdminSearchForm } from '@/components/admin/admin-search-form'
import { AdminTable } from '@/components/admin/admin-table'
import type { Locale } from '@/lib/i18n'
import { type AdminStrapiEntry, listAdminCollection } from '@/lib/server/admin-content'
import { requireAdminSession } from '@/lib/server/admin-auth'

type AuditStatus = 'success' | 'failed'
type AuditAction = 'create' | 'update' | 'delete' | 'upload' | 'sync-one' | 'sync-all'

interface AdminAuditLogEntry extends AdminStrapiEntry {
  action: AuditAction
  status: AuditStatus
  actorEmail?: string
  actorUsername?: string
  actorRole?: string
  targetCollection: string
  targetId?: number
  targetName?: string
  locale?: string
  message?: string
  ip?: string
  createdAt?: string
}

interface AuditLogsManagePageProps {
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
  result: string
  action: string
  actor: string
  target: string
  time: string
  message: string
  success: string
  failed: string
}> = {
  'zh-Hans': {
    title: '审计日志',
    description: '查看自研后台的写操作、上传和同步动作。',
    search: '筛选',
    searchPlaceholder: '搜索账号、集合、目标或消息',
    reset: '重置',
    statusAll: '全部状态',
    statusPublished: '成功',
    statusDraft: '失败',
    empty: '暂无审计日志。',
    previous: '上一页',
    next: '下一页',
    pagination: '第 {page} / {pageCount} 页',
    result: '结果',
    action: '操作',
    actor: '操作者',
    target: '目标',
    time: '时间',
    message: '消息',
    success: '成功',
    failed: '失败',
  },
  en: {
    title: 'Audit Logs',
    description: 'Review custom panel write actions, uploads, and sync actions.',
    search: 'Filter',
    searchPlaceholder: 'Search account, collection, target, or message',
    reset: 'Reset',
    statusAll: 'All statuses',
    statusPublished: 'Success',
    statusDraft: 'Failed',
    empty: 'No audit logs yet.',
    previous: 'Previous',
    next: 'Next',
    pagination: 'Page {page} / {pageCount}',
    result: 'Result',
    action: 'Action',
    actor: 'Actor',
    target: 'Target',
    time: 'Time',
    message: 'Message',
    success: 'Success',
    failed: 'Failed',
  },
  ja: {
    title: '監査ログ',
    description: '独自管理パネルの書き込み、アップロード、同期操作を確認します。',
    search: '絞り込み',
    searchPlaceholder: 'アカウント、コレクション、対象、メッセージを検索',
    reset: 'リセット',
    statusAll: 'すべての状態',
    statusPublished: '成功',
    statusDraft: '失敗',
    empty: '監査ログはまだありません。',
    previous: '前へ',
    next: '次へ',
    pagination: '{page} / {pageCount} ページ',
    result: '結果',
    action: '操作',
    actor: '実行者',
    target: '対象',
    time: '時刻',
    message: 'メッセージ',
    success: '成功',
    failed: '失敗',
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

function getStatusVariant(status: AuditStatus): 'destructive' | 'default' {
  return status === 'failed' ? 'destructive' : 'default'
}

export default async function AdminAuditLogsManagePage({ params, searchParams }: AuditLogsManagePageProps) {
  const { locale } = await params
  const query = await searchParams
  const session = await requireAdminSession(locale, `/${locale}/manage/admin-audit-logs`)
  const t = labels[locale as Locale] || labels['zh-Hans']
  const page = Number(query.page || '1')

  const response = await listAdminCollection<AdminAuditLogEntry>(session, 'admin-audit-logs', {
    page,
    search: query.search,
  })

  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams()
    if (query.search) params.set('search', query.search)
    params.set('page', String(nextPage))
    const qs = params.toString()
    return `/${locale}/manage/admin-audit-logs${qs ? `?${qs}` : ''}`
  }

  return (
    <div>
      <AdminPageHeader title={t.title} description={t.description} />
      <AdminSearchForm
        action={`/${locale}/manage/admin-audit-logs`}
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
            className: 'w-28',
            render: (item) => (
              <Badge variant={getStatusVariant(item.status)}>
                {item.status === 'failed' ? t.failed : t.success}
              </Badge>
            ),
          },
          {
            key: 'action',
            header: t.action,
            className: 'w-32',
            render: (item) => item.action,
          },
          {
            key: 'actor',
            header: t.actor,
            className: 'min-w-48',
            render: (item) => (
              <div className="space-y-1">
                <p className="font-medium">{item.actorUsername || item.actorEmail || '-'}</p>
                {item.actorRole ? <p className="text-xs text-muted-foreground">{item.actorRole}</p> : null}
              </div>
            ),
          },
          {
            key: 'target',
            header: t.target,
            className: 'min-w-48',
            render: (item) => (
              <div className="space-y-1">
                <p className="font-medium">{item.targetCollection}</p>
                <p className="text-xs text-muted-foreground">
                  {[item.targetName, item.targetId ? `#${item.targetId}` : null, item.locale].filter(Boolean).join(' / ') || '-'}
                </p>
              </div>
            ),
          },
          {
            key: 'createdAt',
            header: t.time,
            className: 'w-44',
            render: (item) => formatDate(item.createdAt, locale),
          },
          {
            key: 'message',
            header: t.message,
            className: 'min-w-72',
            render: (item) => (
              <div className="max-w-xl space-y-1">
                <p className="leading-6">{item.message || '-'}</p>
                {item.ip ? <p className="text-xs text-muted-foreground">{item.ip}</p> : null}
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
