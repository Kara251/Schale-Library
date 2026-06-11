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

const commonLabels: Record<Locale, {
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
  slug: string
}> = {
  'zh-Hans': {
    search: '筛选',
    searchPlaceholder: '搜索名称',
    reset: '重置',
    statusAll: '全部状态',
    statusPublished: '已发布',
    statusDraft: '草稿',
    empty: '暂无符合条件的内容。',
    previous: '上一页',
    next: '下一页',
    pagination: '第 {page} / {pageCount} 页',
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
    statusDraft: 'Draft',
    empty: 'Nothing matched the current filters.',
    previous: 'Previous',
    next: 'Next',
    pagination: 'Page {page} / {pageCount}',
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
    statusDraft: '下書き',
    empty: '条件に一致する内容がありません。',
    previous: '前へ',
    next: '次へ',
    pagination: '{page} / {pageCount} ページ',
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
  searchParams: { search?: string; page?: string; status?: string }
  /** 主标题列取哪个字段（默认 name，回退 title） */
  primaryField?: string
  /** 额外的徽章列字段，如 subject_type / difficulty */
  badgeField?: string
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
}: AdminGenericListPageProps) {
  const session = await requireAdminSession(locale, `/${locale}/manage/${collection}`)
  const meta = ADMIN_COLLECTION_META[collection]
  const t = commonLabels[locale as Locale] || commonLabels['zh-Hans']
  const actionLabels = getAdminActionLabels(locale as Locale)
  const page = Number(searchParams.page || '1')
  const status = searchParams.status === 'published' || searchParams.status === 'draft' ? searchParams.status : 'all'

  const response = await listAdminCollection<AdminStrapiEntry>(session, collection, {
    locale,
    page,
    search: searchParams.search,
    status,
  })

  const buildHref = (nextPage: number) => {
    const p = new URLSearchParams()
    if (searchParams.search) p.set('search', searchParams.search)
    if (status !== 'all') p.set('status', status)
    p.set('page', String(nextPage))
    const qs = p.toString()
    return `/${locale}/manage/${collection}${qs ? `?${qs}` : ''}`
  }

  const getPrimary = (item: AdminStrapiEntry) =>
    String(item[primaryField] || item.name || item.title || `#${item.id}`)

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
          ...(meta.supportsDraft ? [{
            key: 'publishedAt',
            header: t.publishStatus,
            className: 'w-28',
            render: (item: AdminStrapiEntry) => (
              <Badge variant={item.publishedAt ? 'default' : 'outline'}>
                {item.publishedAt ? t.statusPublished : t.statusDraft}
              </Badge>
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
