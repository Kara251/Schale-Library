import { ShieldCheck } from 'lucide-react'

import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminStatCard } from '@/components/admin/admin-stat-card'
import type { Locale } from '@/lib/i18n'
import { getAdminDashboardItems } from '@/lib/server/admin-content'
import { requireAdminSession } from '@/lib/server/admin-auth'

interface ManageDashboardPageProps {
  params: Promise<{ locale: string }>
}

const labels: Record<Locale, { title: string; description: string; view: string; securityTitle: string; securityBody: string }> = {
  'zh-Hans': {
    title: '仪表盘',
    description: '查看内容总量、快速进入各个维护模块。',
    view: '进入列表',
    securityTitle: '安全说明',
    securityBody: '当前自研后台通过同源接口与 HttpOnly Cookie 会话访问 Strapi，避免在浏览器中暴露维护者令牌。写操作、上传和同步动作会记录到审计日志。',
  },
  en: {
    title: 'Dashboard',
    description: 'Overview of content totals and quick entry points.',
    view: 'Open list',
    securityTitle: 'Security notes',
    securityBody: 'The panel uses same-origin APIs and HttpOnly cookies to access Strapi, keeping maintainer tokens out of browser storage. Write actions, uploads, and sync actions are recorded in audit logs.',
  },
  ja: {
    title: 'ダッシュボード',
    description: 'コンテンツ総数と管理モジュールへの入口を確認します。',
    view: '一覧を開く',
    securityTitle: 'セキュリティ',
    securityBody: 'この管理パネルは同一オリジン API と HttpOnly Cookie セッション経由で Strapi に接続し、ブラウザ保存領域へトークンを置きません。書き込み、アップロード、同期操作は監査ログに記録されます。',
  },
}

export default async function ManageDashboardPage({ params }: ManageDashboardPageProps) {
  const { locale } = await params
  const session = await requireAdminSession(locale, `/${locale}/manage`)
  const t = labels[locale as Locale] || labels['zh-Hans']
  const dashboardItems = await getAdminDashboardItems(session, locale)

  return (
    <div>
      <AdminPageHeader title={t.title} description={t.description} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

      <div className="mt-6 rounded-lg border bg-card p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">{t.securityTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t.securityBody}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
