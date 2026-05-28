import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { ResearchCuratorForm } from '@/components/admin/research-curator-form'
import type { Locale } from '@/lib/i18n'
import { getCuratorAdmin, listAdminCollection } from '@/lib/server/admin-content'
import { requireAdminSession } from '@/lib/server/admin-auth'

interface ResearchCuratorManagePageProps {
  params: Promise<{ locale: string }>
}

const labels: Record<Locale, { title: string; description: string }> = {
  'zh-Hans': {
    title: '策展配置',
    description: '管理考据档案侧边栏的主编精选与推荐路径说明。',
  },
  en: {
    title: 'Curation Settings',
    description: 'Manage the research archive sidebar featured pick and recommended path.',
  },
  ja: {
    title: 'キュレーション設定',
    description: '考察アーカイブのサイドバーおすすめ設定を管理します。',
  },
}

export default async function ResearchCuratorManagePage({ params }: ResearchCuratorManagePageProps) {
  const { locale } = await params
  const session = await requireAdminSession(locale, `/${locale}/manage/research-curator`)
  const t = labels[locale as Locale] || labels['zh-Hans']

  const [curatorRes, entriesRes] = await Promise.all([
    getCuratorAdmin(session, locale).catch(() => ({ data: null })),
    listAdminCollection<{ id: number; title: string }>(session, 'research-entries', {
      locale,
      pageSize: 200,
      status: 'published',
    }).catch(() => ({ data: [] })),
  ])

  const entries = (entriesRes.data || []).map((e) => ({ id: e.id, title: e.title }))

  return (
    <div>
      <AdminPageHeader title={t.title} description={t.description} />
      <ResearchCuratorForm
        initialData={curatorRes.data}
        entries={entries}
        locale={locale as Locale}
      />
    </div>
  )
}
