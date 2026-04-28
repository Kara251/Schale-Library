import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AdminRowActions } from '@/components/admin/admin-row-actions'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminPagination } from '@/components/admin/admin-pagination'
import { AdminTable } from '@/components/admin/admin-table'
import { getAdminActionLabels } from '@/lib/admin-panel-labels'
import type { Locale } from '@/lib/i18n'
import { type AdminStrapiEntry, listAdminCollection } from '@/lib/server/admin-content'
import { requireAdminSession } from '@/lib/server/admin-auth'

interface WorkAdminEntry extends AdminStrapiEntry {
  title: string
  author?: string
  nature: 'official' | 'fanmade'
  workType: 'video' | 'image' | 'text' | 'other'
  isActive?: boolean
  isFeatured?: boolean
  featuredPriority?: number
  featuredUntil?: string | null
}

interface WorksManagePageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; page?: string; status?: string; featured?: string }>
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
  featuredAll: string
  featuredOnly: string
  featuredNormal: string
  featured: string
  priority: string
  empty: string
  previous: string
  next: string
  pagination: string
  author: string
  nature: string
  type: string
  updatedAt: string
  publication: string
}> = {
  'zh-Hans': {
    title: '推荐作品管理',
    description: '查看作品标题、作者、类型与发布状态。',
    search: '筛选',
    searchPlaceholder: '搜索作品标题或作者',
    reset: '重置',
    statusAll: '全部状态',
    statusPublished: '已发布',
    statusDraft: '草稿',
    featuredAll: '全部推荐状态',
    featuredOnly: '仅精选',
    featuredNormal: '非精选',
    featured: '精选',
    priority: '优先级',
    empty: '暂无符合条件的作品。',
    previous: '上一页',
    next: '下一页',
    pagination: '第 {page} / {pageCount} 页',
    author: '作者',
    nature: '性质',
    type: '类型',
    updatedAt: '更新时间',
    publication: '发布状态',
  },
  en: {
    title: 'Work Management',
    description: 'Review work title, author, type, and publication state.',
    search: 'Filter',
    searchPlaceholder: 'Search works by title or author',
    reset: 'Reset',
    statusAll: 'All statuses',
    statusPublished: 'Published',
    statusDraft: 'Draft',
    featuredAll: 'All feature states',
    featuredOnly: 'Featured only',
    featuredNormal: 'Not featured',
    featured: 'Featured',
    priority: 'Priority',
    empty: 'No works matched the current filters.',
    previous: 'Previous',
    next: 'Next',
    pagination: 'Page {page} / {pageCount}',
    author: 'Author',
    nature: 'Nature',
    type: 'Type',
    updatedAt: 'Updated',
    publication: 'Publication',
  },
  ja: {
    title: '作品管理',
    description: '作品タイトル、作者、種類、公開状態を確認します。',
    search: '絞り込み',
    searchPlaceholder: '作品名または作者を検索',
    reset: 'リセット',
    statusAll: 'すべての状態',
    statusPublished: '公開済み',
    statusDraft: '下書き',
    featuredAll: 'すべてのおすすめ状態',
    featuredOnly: 'おすすめのみ',
    featuredNormal: 'おすすめ以外',
    featured: 'おすすめ',
    priority: '優先度',
    empty: '条件に一致する作品がありません。',
    previous: '前へ',
    next: '次へ',
    pagination: '{page} / {pageCount} ページ',
    author: '作者',
    nature: '区分',
    type: '種類',
    updatedAt: '更新日時',
    publication: '公開状態',
  },
}

const natureLabels = {
  official: 'official',
  fanmade: 'fanmade',
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

export default async function WorksManagePage({ params, searchParams }: WorksManagePageProps) {
  const { locale } = await params
  const query = await searchParams
  const session = await requireAdminSession(locale, `/${locale}/manage/works`)
  const t = labels[locale as Locale] || labels['zh-Hans']
  const actionLabels = getAdminActionLabels(locale as Locale)
  const page = Number(query.page || '1')
  const status = query.status === 'published' || query.status === 'draft' ? query.status : 'all'
  const featured = query.featured === 'featured' || query.featured === 'not-featured' ? query.featured : 'all'

  const response = await listAdminCollection<WorkAdminEntry>(session, 'works', {
    locale,
    page,
    search: query.search,
    status,
    featured,
  })

  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams()
    if (query.search) params.set('search', query.search)
    if (status !== 'all') params.set('status', status)
    if (featured !== 'all') params.set('featured', featured)
    params.set('page', String(nextPage))
    const qs = params.toString()
    return `/${locale}/manage/works${qs ? `?${qs}` : ''}`
  }

  return (
    <div>
      <AdminPageHeader
        title={t.title}
        description={t.description}
        actions={
          <Button asChild>
            <Link href={`/${locale}/manage/works/new`}>{actionLabels.create}</Link>
          </Button>
        }
      />
      <form action={`/${locale}/manage/works`} className="mb-6 grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[minmax(0,1fr)_180px_180px_auto_auto]">
        <input
          name="search"
          defaultValue={query.search || ''}
          placeholder={t.searchPlaceholder}
          className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
        <select name="status" defaultValue={status} className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]">
          <option value="all">{t.statusAll}</option>
          <option value="published">{t.statusPublished}</option>
          <option value="draft">{t.statusDraft}</option>
        </select>
        <select name="featured" defaultValue={featured} className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]">
          <option value="all">{t.featuredAll}</option>
          <option value="featured">{t.featuredOnly}</option>
          <option value="not-featured">{t.featuredNormal}</option>
        </select>
        <Button type="submit">{t.search}</Button>
        <Button asChild variant="outline">
          <Link href={`/${locale}/manage/works`}>{t.reset}</Link>
        </Button>
      </form>
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
            key: 'author',
            header: t.author,
            render: (item) => item.author || '-',
          },
          {
            key: 'nature',
            header: t.nature,
            className: 'w-28',
            render: (item) => (
              <Badge variant={item.nature === 'official' ? 'default' : 'secondary'}>
                {natureLabels[item.nature]}
              </Badge>
            ),
          },
          {
            key: 'workType',
            header: t.type,
            className: 'w-24',
            render: (item) => <Badge variant="outline">{item.workType}</Badge>,
          },
          {
            key: 'isFeatured',
            header: t.featured,
            className: 'w-32',
            render: (item) => item.isFeatured ? (
              <div className="flex flex-col gap-1">
                <Badge variant="default">{t.featured}</Badge>
                <span className="text-xs text-muted-foreground">{t.priority}: {item.featuredPriority ?? 0}</span>
              </div>
            ) : '-',
          },
          {
            key: 'publishedAt',
            header: t.publication,
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
                collection="works"
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
