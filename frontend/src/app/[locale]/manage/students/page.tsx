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

interface StudentAdminEntry extends AdminStrapiEntry {
  name: string
  school?: string
  organization?: string
}

interface StudentsManagePageProps {
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
  school: string
  organization: string
  publication: string
}> = {
  'zh-Hans': {
    title: '学生管理',
    description: '查看学生基础信息与发布状态。',
    search: '筛选',
    searchPlaceholder: '搜索学生名或组织',
    reset: '重置',
    statusAll: '全部状态',
    statusPublished: '已发布',
    statusDraft: '草稿',
    empty: '暂无符合条件的学生。',
    previous: '上一页',
    next: '下一页',
    pagination: '第 {page} / {pageCount} 页',
    school: '学校',
    organization: '组织',
    publication: '发布状态',
  },
  en: {
    title: 'Student Management',
    description: 'Review student basics and publication state.',
    search: 'Filter',
    searchPlaceholder: 'Search names or clubs',
    reset: 'Reset',
    statusAll: 'All statuses',
    statusPublished: 'Published',
    statusDraft: 'Draft',
    empty: 'No students matched the current filters.',
    previous: 'Previous',
    next: 'Next',
    pagination: 'Page {page} / {pageCount}',
    school: 'School',
    organization: 'Club',
    publication: 'Publication',
  },
  ja: {
    title: '生徒管理',
    description: '生徒の基本情報と公開状態を確認します。',
    search: '絞り込み',
    searchPlaceholder: '名前または所属を検索',
    reset: 'リセット',
    statusAll: 'すべての状態',
    statusPublished: '公開済み',
    statusDraft: '下書き',
    empty: '条件に一致する生徒がありません。',
    previous: '前へ',
    next: '次へ',
    pagination: '{page} / {pageCount} ページ',
    school: '学校',
    organization: '所属',
    publication: '公開状態',
  },
}

export default async function StudentsManagePage({ params, searchParams }: StudentsManagePageProps) {
  const { locale } = await params
  const query = await searchParams
  const session = await requireAdminSession(locale, `/${locale}/manage/students`)
  const t = labels[locale as Locale] || labels['zh-Hans']
  const actionLabels = getAdminActionLabels(locale as Locale)
  const page = Number(query.page || '1')
  const status = query.status === 'published' || query.status === 'draft' ? query.status : 'all'

  const response = await listAdminCollection<StudentAdminEntry>(session, 'students', {
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
    return `/${locale}/manage/students${qs ? `?${qs}` : ''}`
  }

  return (
    <div>
      <AdminPageHeader
        title={t.title}
        description={t.description}
        actions={
          <Button asChild>
            <Link href={`/${locale}/manage/students/new`}>{actionLabels.create}</Link>
          </Button>
        }
      />
      <AdminSearchForm
        action={`/${locale}/manage/students`}
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
            key: 'name',
            header: t.title,
            render: (item) => <div className="min-w-[200px] font-medium">{item.name}</div>,
          },
          {
            key: 'school',
            header: t.school,
            render: (item) => item.school || '-',
          },
          {
            key: 'organization',
            header: t.organization,
            render: (item) => item.organization || '-',
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
                collection="students"
                id={item.id}
                labels={{
                  edit: actionLabels.edit,
                  delete: actionLabels.delete,
                  deleting: actionLabels.deleting,
                  confirm: actionLabels.deleteConfirm,
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
