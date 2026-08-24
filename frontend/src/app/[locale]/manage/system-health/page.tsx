import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { getSystemHealth } from '@/lib/server/admin-content'
import { requireAdminSession } from '@/lib/server/admin-auth'
import type { Locale } from '@/lib/i18n'

interface SystemHealthPageProps {
  params: Promise<{ locale: string }>
}

const labels: Record<Locale, {
  title: string
  generatedAt: string
  ok: string
  warning: string
  error: string
}> = {
  'zh-Hans': {
    title: '系统自检',
    generatedAt: '检查时间',
    ok: '正常',
    warning: '注意',
    error: '错误',
  },
  en: {
    title: 'System Health',
    generatedAt: 'Generated at',
    ok: 'OK',
    warning: 'Warning',
    error: 'Error',
  },
  ja: {
    title: 'システム確認',
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

function statusClass(status: 'ok' | 'warning' | 'error') {
  if (status === 'ok') return 'text-sm font-medium text-primary'
  if (status === 'warning') return 'text-sm font-medium text-foreground'
  return 'text-sm font-medium text-destructive'
}

export default async function SystemHealthPage({ params }: SystemHealthPageProps) {
  const { locale } = await params
  const session = await requireAdminSession(locale, `/${locale}/manage/system-health`)
  const t = labels[locale as Locale] || labels['zh-Hans']
  const health = await getSystemHealth(session)

  return (
    <div>
      <AdminPageHeader title={t.title} />

      <div className="mb-6 text-sm text-muted-foreground">
        {t.generatedAt}: {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(health.generatedAt))}
      </div>

      <div className="divide-y border-t">
        {health.checks.map((check) => (
          <div key={check.key} className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">{check.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{check.message}</p>
              </div>
              <span className={statusClass(check.status)}>{statusLabel(check.status, t)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
