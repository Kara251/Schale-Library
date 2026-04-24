import type { Locale } from '@/lib/i18n'
import { requireAdminSession } from '@/lib/server/admin-auth'
import { AdminShell } from '@/components/admin/admin-shell'

interface ManageLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function ManageLayout({ children, params }: ManageLayoutProps) {
  const { locale } = await params
  const session = await requireAdminSession(locale, `/${locale}/manage`)

  return (
    <AdminShell locale={locale as Locale} user={session.user}>
      {children}
    </AdminShell>
  )
}
