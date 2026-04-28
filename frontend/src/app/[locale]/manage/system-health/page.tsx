import { Badge } from '@/components/ui/badge'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { getSystemHealth } from '@/lib/server/admin-content'
import { requireAdminSession } from '@/lib/server/admin-auth'
import type { Locale } from '@/lib/i18n'

interface SystemHealthPageProps {
  params: Promise<{ locale: string }>
}

const labels: Record<Locale, {
  title: string
  description: string
  generatedAt: string
  ok: string
  warning: string
  error: string
}> = {
  'zh-Hans': {
    title: '系统自检',
    description: '检查部署变量、数据库、上传服务、维护角色、公开权限和 RSSHub 连通性。',
    generatedAt: '检查时间',
    ok: '正常',
    warning: '注意',
    error: '错误',
  },
  en: {
    title: 'System Health',
    description: 'Check deploy variables, database, uploads, maintainer roles, public permissions, and RSSHub.',
    generatedAt: 'Generated at',
    ok: 'OK',
    warning: 'Warning',
    error: 'Error',
  },
  ja: {
    title: 'システム確認',
    description: 'デプロイ変数、データベース、アップロード、管理ロール、公開権限、RSSHub を確認します。',
    generatedAt: '確認日時',
    ok: '正常',
    warning: '注意',
    error: 'エラー',
  },
}

function statusLabel(status: 'ok' | 'warning' | 'error', t: typeof labels['zh-Hans']) {
  if (status === 'ok') return t.ok
  if (status === 'warning') return t.warning
  return t.error
}

function statusVariant(status: 'ok' | 'warning' | 'error') {
  if (status === 'ok') return 'default' as const
  if (status === 'warning') return 'secondary' as const
  return 'destructive' as const
}

export default async function SystemHealthPage({ params }: SystemHealthPageProps) {
  const { locale } = await params
  const session = await requireAdminSession(locale, `/${locale}/manage/system-health`)
  const t = labels[locale as Locale] || labels['zh-Hans']
  const health = await getSystemHealth(session)

  return (
    <div>
      <AdminPageHeader title={t.title} description={t.description} />

      <div className="mb-4 rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        {t.generatedAt}: {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(health.generatedAt))}
      </div>

      <div className="space-y-3">
        {health.checks.map((check) => (
          <div key={check.key} className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">{check.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{check.message}</p>
              </div>
              <Badge variant={statusVariant(check.status)}>{statusLabel(check.status, t)}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
