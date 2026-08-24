import Link from 'next/link'

import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminStatCard } from '@/components/admin/admin-stat-card'
import type { Locale } from '@/lib/i18n'
import { getAdminDashboardItems } from '@/lib/server/admin-content'
import { requireAdminSession } from '@/lib/server/admin-auth'

interface ManageDashboardPageProps {
  params: Promise<{ locale: string }>
}

const labels: Record<Locale, {
  title: string
  view: string
  configTitle: string
  curatorTitle: string
  curatorBody: string
}> = {
  'zh-Hans': {
    title: '仪表盘',
    view: '进入列表',
    configTitle: '配置项',
    curatorTitle: '策展配置',
    curatorBody: '编辑考据档案的主编精选与推荐阅读路径。',
  },
  en: {
    title: 'Dashboard',
    view: 'Open list',
    configTitle: 'Settings',
    curatorTitle: 'Curation settings',
    curatorBody: 'Edit the research archive editor pick and recommended path.',
  },
  ja: {
    title: 'ダッシュボード',
    view: '一覧を開く',
    configTitle: '設定',
    curatorTitle: 'キュレーション設定',
    curatorBody: '考察アーカイブのおすすめと読み順を編集します。',
  },
}

export default async function ManageDashboardPage({ params }: ManageDashboardPageProps) {
  const { locale } = await params
  const session = await requireAdminSession(locale, `/${locale}/manage`)
  const t = labels[locale as Locale] || labels['zh-Hans']
  const dashboardItems = await getAdminDashboardItems(session, locale)

  return (
    <div>
      <AdminPageHeader title={t.title} />

      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
        {dashboardItems.map((item) => (
          <AdminStatCard
            key={item.key}
            title={item.title}
            value={item.total}
            href={item.href}
            viewLabel={t.view}
          />
        ))}
      </div>

      <div className="mt-10 border-t pt-6">
        <h2 className="text-base font-bold">{t.configTitle}</h2>
        <Link
          href={`/${locale}/manage/research-curator`}
          className="mt-3 block max-w-xl transition-colors hover:text-primary"
        >
          <span className="block font-medium">{t.curatorTitle}</span>
          <span className="mt-1 block text-sm leading-6 text-muted-foreground">{t.curatorBody}</span>
        </Link>
      </div>
    </div>
  )
}
