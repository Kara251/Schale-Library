import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AdminRowActions } from '@/components/admin/admin-row-actions'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminPagination } from '@/components/admin/admin-pagination'
import { AdminSearchForm } from '@/components/admin/admin-search-form'
import { AdminTable } from '@/components/admin/admin-table'
import type { Locale } from '@/lib/i18n'
import { ADMIN_COLLECTION_META, type AdminCollectionKey } from '@/lib/admin-panel'
import { getAdminActionLabels } from '@/lib/admin-panel-labels'
import { type AdminStrapiEntry, listAdminCollection } from '@/lib/server/admin-content'
import { requireAdminSession } from '@/lib/server/admin-auth'
import { AdminPublishStatusBadge } from '@/components/admin/admin-publish-status-badge'

/** 每页条数选项；首项为默认值（不写进 URL）。上限受 client 端 50 约束。 */
const PAGE_SIZE_OPTIONS = [12, 24, 50]

const commonLabels: Record<Locale, {
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
  updatedAt: string
  publishStatus: string
  slug: string
}> = {
  'zh-Hans': {
    search: '筛选',
    searchPlaceholder: '搜索名称',
    reset: '重置',
    statusAll: '全部状态',
    statusPublished: '已发布',
    statusScheduled: '已排期',
    statusDraft: '草稿',
    empty: '暂无符合条件的内容。',
    previous: '上一页',
    next: '下一页',
    pagination: '第 {page} / {pageCount} 页',
    totalSummary: '共 {total} 条',
    perPage: '每页',
    updatedAt: '更新时间',
    publishStatus: '发布状态',
    slug: 'Slug',
  },
  en: {
    search: 'Filter',
    searchPlaceholder: 'Search name',
    reset: 'Reset',
    statusAll: 'All statuses',
    statusPublished: 'Published',
    statusScheduled: 'Scheduled',
    statusDraft: 'Draft',
    empty: 'Nothing matched the current filters.',
    previous: 'Previous',
    next: 'Next',
    pagination: 'Page {page} / {pageCount}',
    totalSummary: '{total} items',
    perPage: 'Per page',
    updatedAt: 'Updated',
    publishStatus: 'Publication',
    slug: 'Slug',
  },
  ja: {
    search: '絞り込み',
    searchPlaceholder: '名前を検索',
    reset: 'リセット',
    statusAll: 'すべての状態',
    statusPublished: '公開済み',
    statusScheduled: '予約済み',
    statusDraft: '下書き',
    empty: '条件に一致する内容がありません。',
    previous: '前へ',
    next: '次へ',
    pagination: '{page} / {pageCount} ページ',
    totalSummary: '全 {total} 件',
    perPage: '1 ページ',
    updatedAt: '更新日時',
    publishStatus: '公開状態',
    slug: 'スラッグ',
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

interface AdminGenericListPageProps {
  collection: AdminCollectionKey
  locale: string
  searchParams: { search?: string; page?: string; pageSize?: string; status?: string }
  /** 主标题列取哪个字段（默认 name，回退 title） */
  primaryField?: string
  /** 额外的徽章列字段，如 subject_type / difficulty */
  badgeField?: string
  extraTextFields?: Array<{
    field: string
    label: Record<Locale, string>
    className?: string
  }>
}

/**
 * 通用的后台集合列表页：名称 / slug / 发布状态 / 更新时间 / 操作。
 * 适用于结构简单的集合，避免每个 manage 页面重复同一套表格脚手架。
 */
export async function AdminGenericListPage({
  collection,
  locale,
  searchParams,
  primaryField = 'name',
  badgeField,
  extraTextFields = [],
}: AdminGenericListPageProps) {
  const session = await requireAdminSession(locale, `/${locale}/manage/${collection}`)
  const meta = ADMIN_COLLECTION_META[collection]
  const t = commonLabels[locale as Locale] || commonLabels['zh-Hans']
  const actionLabels = getAdminActionLabels(locale as Locale)
  // 钳制：?page=abc 会变成 NaN，界面上就成了「第 NaN 页」
  const page = Math.max(1, Number(searchParams.page || '1') || 1)
  const pageSize = PAGE_SIZE_OPTIONS.includes(Number(searchParams.pageSize))
    ? Number(searchParams.pageSize)
    : PAGE_SIZE_OPTIONS[0]!
  const status = searchParams.status === 'published' || searchParams.status === 'scheduled' || searchParams.status === 'draft' ? searchParams.status : 'all'

  const response = await listAdminCollection<AdminStrapiEntry>(session, collection, {
    locale,
    page,
    pageSize,
    search: searchParams.search,
    status,
  })

  const buildQuery = (overrides: { page?: number; pageSize?: number }) => {
    const p = new URLSearchParams()
    if (searchParams.search) p.set('search', searchParams.search)
    if (status !== 'all') p.set('status', status)
    p.set('page', String(overrides.page ?? page))
    const nextPageSize = overrides.pageSize ?? pageSize
    if (nextPageSize !== PAGE_SIZE_OPTIONS[0]) p.set('pageSize', String(nextPageSize))
    const qs = p.toString()
    return `/${locale}/manage/${collection}${qs ? `?${qs}` : ''}`
  }

  const buildHref = (nextPage: number) => buildQuery({ page: nextPage })
  // 换每页条数时回到第一页：原页码在新分页下多半越界
  const buildPageSizeHref = (nextPageSize: number) => buildQuery({ page: 1, pageSize: nextPageSize })

  const getPrimary = (item: AdminStrapiEntry) =>
    String(item[primaryField] || item.name || item.title || `#${item.id}`)

  const getFieldValue = (item: AdminStrapiEntry, field: string) => {
    const value = field.split('.').reduce<unknown>((current, key) => {
      if (!current || typeof current !== 'object') return undefined
      return (current as Record<string, unknown>)[key]
    }, item)
    return typeof value === 'string' || typeof value === 'number' ? String(value) : '-'
  }

  return (
    <div>
      <AdminPageHeader
        title={meta.title[locale as Locale] || meta.title['zh-Hans']}
        description={meta.description[locale as Locale] || meta.description['zh-Hans']}
        actions={
          <Button asChild>
            <Link href={`/${locale}/manage/${collection}/new`}>{actionLabels.create}</Link>
          </Button>
        }
      />
      <AdminSearchForm
        action={`/${locale}/manage/${collection}`}
        search={searchParams.search}
        status={meta.supportsDraft ? status : undefined}
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
            key: 'primary',
            header: meta.title[locale as Locale] || meta.title['zh-Hans'],
            render: (item) => <div className="min-w-[180px] font-medium">{getPrimary(item)}</div>,
          },
          {
            key: 'slug',
            header: t.slug,
            className: 'w-40',
            render: (item) => <span className="text-xs text-muted-foreground">{typeof item.slug === 'string' ? item.slug : '-'}</span>,
          },
          ...(badgeField ? [{
            key: badgeField,
            header: badgeField,
            className: 'w-28',
            render: (item: AdminStrapiEntry) => (
              <Badge variant="outline">{String(item[badgeField] || '-')}</Badge>
            ),
          }] : []),
          ...extraTextFields.map((field) => ({
            key: field.field,
            header: field.label[locale as Locale] || field.label['zh-Hans'],
            className: field.className || 'w-32',
            render: (item: AdminStrapiEntry) => (
              <span className="text-xs text-muted-foreground">{getFieldValue(item, field.field)}</span>
            ),
          })),
          ...(meta.supportsDraft ? [{
            key: 'publishedAt',
            header: t.publishStatus,
            className: 'w-28',
            render: (item: AdminStrapiEntry) => (
              <AdminPublishStatusBadge
                status={typeof item.status === 'string' ? item.status : undefined}
                labels={{ published: t.statusPublished, scheduled: t.statusScheduled, draft: t.statusDraft }}
              />
            ),
          }] : []),
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
                collection={collection}
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
