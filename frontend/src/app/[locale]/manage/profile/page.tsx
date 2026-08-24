import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminProfileForm } from '@/components/admin/admin-profile-form'
import { requireAdminSession } from '@/lib/server/admin-auth'
import { getOwnProfile } from '@/lib/server/admin-content'
import type { Locale } from '@/lib/i18n'

interface ProfilePageProps {
  params: Promise<{ locale: string }>
}

const labels: Record<Locale, { title: string; description: string }> = {
  'zh-Hans': {
    title: '个人设置',
    description: '维护你自己的账号资料与登录密码。',
  },
  en: {
    title: 'My account',
    description: 'Manage your own account details and sign-in password.',
  },
  ja: {
    title: 'アカウント設定',
    description: '自分のアカウント情報とログインパスワードを管理します。',
  },
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params
  const session = await requireAdminSession(locale, `/${locale}/manage/profile`)
  const t = labels[locale as Locale] || labels['zh-Hans']

  // 会话里的用户快照可能是登录那一刻的；这里实时取一次，保证展示的是最新资料
  const profile = await getOwnProfile(session).catch(() => null)

  return (
    <>
      <AdminPageHeader title={t.title} description={t.description} />
      <AdminProfileForm
        locale={locale as Locale}
        user={{
          username: profile?.username ?? session.user.username,
          email: profile?.email ?? session.user.email ?? null,
          role: profile?.role?.type ?? session.user.role?.type ?? '',
        }}
      />
    </>
  )
}
