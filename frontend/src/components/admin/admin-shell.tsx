'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Radio,
  Rss,
  ShieldCheck,
  Users,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import type { AdminUser } from '@/lib/server/admin-auth'
import type { Locale } from '@/lib/i18n'

interface AdminShellProps {
  children: React.ReactNode
  locale: Locale
  user: AdminUser
}

const labels: Record<Locale, { title: string; subtitle: string; signOut: string }> = {
  'zh-Hans': {
    title: '维护者面板',
    subtitle: '内容维护与发布控制台',
    signOut: '退出登录',
  },
  en: {
    title: 'Maintainer Panel',
    subtitle: 'Content maintenance console',
    signOut: 'Sign out',
  },
  ja: {
    title: '管理パネル',
    subtitle: 'コンテンツ管理コンソール',
    signOut: 'ログアウト',
  },
}

const navLabels: Record<Locale, Record<string, string>> = {
  'zh-Hans': {
    dashboard: '仪表盘',
    announcements: '公告',
    works: '推荐作品',
    onlineEvents: '线上活动',
    offlineEvents: '线下活动',
    students: '学生',
    subscriptions: 'B站订阅',
    syncLogs: '同步日志',
    auditLogs: '审计日志',
  },
  en: {
    dashboard: 'Dashboard',
    announcements: 'Announcements',
    works: 'Works',
    onlineEvents: 'Online Events',
    offlineEvents: 'Offline Events',
    students: 'Students',
    subscriptions: 'Bilibili Feeds',
    syncLogs: 'Sync Logs',
    auditLogs: 'Audit Logs',
  },
  ja: {
    dashboard: 'ダッシュボード',
    announcements: 'お知らせ',
    works: '作品',
    onlineEvents: 'オンラインイベント',
    offlineEvents: 'オフラインイベント',
    students: '生徒',
    subscriptions: 'B站購読',
    syncLogs: '同期ログ',
    auditLogs: '監査ログ',
  },
}

export function AdminShell({ children, locale, user }: AdminShellProps) {
  const pathname = usePathname()
  const { logout } = useAuth()
  const t = labels[locale] || labels['zh-Hans']
  const nav = navLabels[locale] || navLabels['zh-Hans']

  const items = [
    { href: `/${locale}/manage`, label: nav.dashboard, icon: LayoutDashboard },
    { href: `/${locale}/manage/announcements`, label: nav.announcements, icon: Bell },
    { href: `/${locale}/manage/works`, label: nav.works, icon: BookOpen },
    { href: `/${locale}/manage/online-events`, label: nav.onlineEvents, icon: Radio },
    { href: `/${locale}/manage/offline-events`, label: nav.offlineEvents, icon: CalendarDays },
    { href: `/${locale}/manage/students`, label: nav.students, icon: Users },
    { href: `/${locale}/manage/bilibili-subscriptions`, label: nav.subscriptions, icon: Rss },
    { href: `/${locale}/manage/sync-logs`, label: nav.syncLogs, icon: ClipboardList },
    { href: `/${locale}/manage/admin-audit-logs`, label: nav.auditLogs, icon: ShieldCheck },
  ]

  return (
    <div className="min-h-screen">
      <main className="relative container mx-auto px-4 pt-6 pb-12">
        <div className="content-panel">
          <div className="flex flex-col gap-6 lg:flex-row">
            <aside className="lg:w-72 xl:w-80">
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="mb-4 border-b pb-4">
                  <p className="text-xl font-bold">{t.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>
                </div>

                <div className="mb-4 rounded-md bg-secondary/40 p-3 text-sm">
                  <p className="font-medium">{user.username}</p>
                  <p className="mt-1 break-all text-muted-foreground">{user.email}</p>
                  {user.role?.name && (
                    <p className="mt-2 text-xs text-muted-foreground">{user.role.name}</p>
                  )}
                </div>

                <nav className="space-y-2">
                  {items.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-secondary text-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </nav>

                <Button
                  variant="outline"
                  className="mt-6 w-full"
                  onClick={() => {
                    void logout()
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  {t.signOut}
                </Button>
              </div>
            </aside>

            <section className="min-w-0 flex-1">{children}</section>
          </div>
        </div>
      </main>
    </div>
  )
}
