import { revalidatePath } from 'next/cache'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminPagination } from '@/components/admin/admin-pagination'
import { AdminTable } from '@/components/admin/admin-table'
import { listContentQualityIssues, scanContentQuality } from '@/lib/server/admin-content'
import { requireAdminSession } from '@/lib/server/admin-auth'
import type { Locale } from '@/lib/i18n'

interface ContentQualityPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string; status?: string; severity?: string; collection?: string; issueType?: string }>
}

const labels: Record<Locale, {
  title: string
  description: string
  scan: string
  empty: string
  issue: string
  severity: string
  collection: string
  target: string
  locale: string
  detectedAt: string
  previous: string
  next: string
  pagination: string
  all: string
  filter: string
  reset: string
}> = {
  'zh-Hans': {
    title: '内容质量',
    description: '扫描缺图、缺翻译、重复来源、草稿、无学生关联、精选推荐和活动时间异常。',
    scan: '重新扫描',
    empty: '暂无内容质量问题。',
    issue: '问题',
    severity: '级别',
    collection: '集合',
    target: '对象',
    locale: '语言',
    detectedAt: '发现时间',
    previous: '上一页',
    next: '下一页',
    pagination: '第 {page} / {pageCount} 页',
    all: '全部',
    filter: '筛选',
    reset: '重置',
  },
  en: {
    title: 'Content Quality',
    description: 'Scan missing images, translations, duplicate sources, drafts, missing students, featured works, and invalid event times.',
    scan: 'Run scan',
    empty: 'No content quality issues.',
    issue: 'Issue',
    severity: 'Severity',
    collection: 'Collection',
    target: 'Target',
    locale: 'Locale',
    detectedAt: 'Detected',
    previous: 'Previous',
    next: 'Next',
    pagination: 'Page {page} / {pageCount}',
    all: 'All',
    filter: 'Filter',
    reset: 'Reset',
  },
  ja: {
    title: '品質チェック',
    description: '画像不足、翻訳不足、重複ソース、下書き、生徒未関連、おすすめ作品、イベント時間異常を確認します。',
    scan: '再スキャン',
    empty: '品質問題はありません。',
    issue: '問題',
    severity: '重要度',
    collection: 'コレクション',
    target: '対象',
    locale: '言語',
    detectedAt: '検出日時',
    previous: '前へ',
    next: '次へ',
    pagination: '{page} / {pageCount} ページ',
    all: 'すべて',
    filter: '絞り込み',
    reset: 'リセット',
  },
}

function formatDate(locale: string, value?: string) {
  return value ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '-'
}

function severityVariant(severity: string) {
  if (severity === 'error') return 'destructive' as const
  if (severity === 'warning') return 'secondary' as const
  return 'outline' as const
}

export default async function ContentQualityPage({ params, searchParams }: ContentQualityPageProps) {
  const { locale } = await params
  const query = await searchParams
  const session = await requireAdminSession(locale, `/${locale}/manage/content-quality`)
  const t = labels[locale as Locale] || labels['zh-Hans']
  const page = Math.max(1, Number(query.page || '1'))

  async function scanAction() {
    'use server'
    const actionSession = await requireAdminSession(locale, `/${locale}/manage/content-quality`)
    await scanContentQuality(actionSession)
    revalidatePath(`/${locale}/manage/content-quality`)
  }

  const response = await listContentQualityIssues(session, {
    page,
    status: query.status || 'open',
    severity: query.severity,
    collection: query.collection,
    issueType: query.issueType,
  })

  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams()
    for (const key of ['status', 'severity', 'collection', 'issueType'] as const) {
      if (query[key]) params.set(key, query[key] as string)
    }
    params.set('page', String(nextPage))
    return `/${locale}/manage/content-quality?${params.toString()}`
  }

  return (
    <div>
      <AdminPageHeader
        title={t.title}
        description={t.description}
        actions={
          <form action={scanAction}>
            <Button type="submit">{t.scan}</Button>
          </form>
        }
      />

      <form action={`/${locale}/manage/content-quality`} className="mb-4 grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-5">
        <select name="status" defaultValue={query.status || 'open'} className="rounded-md border bg-background px-3 py-2 text-sm">
          <option value="open">{t.all}</option>
          <option value="resolved">resolved</option>
        </select>
        <select name="severity" defaultValue={query.severity || 'all'} className="rounded-md border bg-background px-3 py-2 text-sm">
          <option value="all">{t.severity}: {t.all}</option>
          <option value="error">error</option>
          <option value="warning">warning</option>
          <option value="info">info</option>
        </select>
        <input name="collection" defaultValue={query.collection || ''} placeholder={t.collection} className="rounded-md border bg-background px-3 py-2 text-sm" />
        <input name="issueType" defaultValue={query.issueType || ''} placeholder={t.issue} className="rounded-md border bg-background px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <Button type="submit" variant="outline">{t.filter}</Button>
          <Button asChild variant="ghost"><a href={`/${locale}/manage/content-quality`}>{t.reset}</a></Button>
        </div>
      </form>

      <AdminTable
        items={response.data}
        emptyText={t.empty}
        columns={[
          {
            key: 'issue',
            header: t.issue,
            render: (item) => (
              <div className="min-w-[260px]">
                <div className="font-medium">{item.message}</div>
                <div className="mt-1 text-xs text-muted-foreground">{item.issueType}</div>
              </div>
            ),
          },
          {
            key: 'severity',
            header: t.severity,
            className: 'w-28',
            render: (item) => <Badge variant={severityVariant(item.severity)}>{item.severity}</Badge>,
          },
          {
            key: 'collection',
            header: t.collection,
            className: 'w-40',
            render: (item) => item.collection,
          },
          {
            key: 'target',
            header: t.target,
            render: (item) => item.title || item.targetDocumentId || item.targetId || '-',
          },
          {
            key: 'locale',
            header: t.locale,
            className: 'w-24',
            render: (item) => item.locale || '-',
          },
          {
            key: 'detectedAt',
            header: t.detectedAt,
            className: 'w-44',
            render: (item) => formatDate(locale, item.detectedAt),
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
