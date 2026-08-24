'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  BookMarked,
  Bell,
  CalendarDays,
  EyeOff,
  FileSearch,
  GitFork,
  GraduationCap,
  UserCog,
  UserCircle,
  UserSquare,
  Activity,
  ScrollText,
  HeartPulse,
  LayoutDashboard,
  Quote,
  LinkIcon,
  LogOut,
  Radio,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  Users,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import type { AdminUser } from '@/lib/server/admin-auth'
import type { Locale } from '@/lib/i18n'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

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
    creators: '创作者',
    friendLinks: '友情链接',
    onlineEvents: '线上活动',
    offlineEvents: '线下活动',
    students: '学生',
    schools: '学院',
    researchEntries: '考据条目',
    researchThemes: '考据主题',
    researchCitations: '考据引证',
    researchSubjects: '考据对象',
    researchPaths: '阅读路径',
    spoilerTiers: '剧透档位',
    researchCurator: '策展配置',
    auditLogs: '审计日志',
    groupOverview: '概览',
    groupContent: '站点内容',
    groupCodex: '档案资料',
    groupResearch: '考据',
    groupOps: '运维',
    groupAccount: '账号',
    users: '用户管理',
    profile: '个人设置',
    quality: '内容质量',
    system: '系统自检',
    bulk: '批量操作',
  },
  en: {
    dashboard: 'Dashboard',
    announcements: 'Announcements',
    creators: 'Creators',
    friendLinks: 'Friend Links',
    onlineEvents: 'Online Events',
    offlineEvents: 'Offline Events',
    students: 'Students',
    schools: 'Schools',
    researchEntries: 'Research Entries',
    researchThemes: 'Research Themes',
    researchCitations: 'Research Citations',
    researchSubjects: 'Research Subjects',
    researchPaths: 'Reading Paths',
    spoilerTiers: 'Spoiler Tiers',
    researchCurator: 'Curation Settings',
    auditLogs: 'Audit Logs',
    groupOverview: 'Overview',
    groupContent: 'Site content',
    groupCodex: 'Codex',
    groupResearch: 'Research',
    groupOps: 'Operations',
    groupAccount: 'Account',
    users: 'Users',
    profile: 'My account',
    quality: 'Content Quality',
    system: 'System Health',
    bulk: 'Bulk Actions',
  },
  ja: {
    dashboard: 'ダッシュボード',
    announcements: 'お知らせ',
    creators: 'クリエイター',
    friendLinks: '相互リンク',
    onlineEvents: 'オンラインイベント',
    offlineEvents: 'オフラインイベント',
    students: '生徒',
    schools: '学園',
    subscriptions: 'B站購読',
    researchEntries: '考察記事',
    researchThemes: '考察テーマ',
    researchCitations: '考察引証',
    researchSubjects: '考察対象',
    researchPaths: '読書パス',
    spoilerTiers: 'ネタバレ段階',
    researchCurator: 'キュレーション設定',
    auditLogs: '監査ログ',
    groupOverview: '概要',
    groupContent: 'サイト コンテンツ',
    groupCodex: '資料',
    groupResearch: '考証',
    groupOps: '運用',
    groupAccount: 'アカウント',
    users: 'ユーザー管理',
    profile: 'アカウント設定',
    quality: '品質チェック',
    system: 'システム確認',
    bulk: '一括操作',
  },
}

export function AdminShell({ children, locale, user }: AdminShellProps) {
  const pathname = usePathname()
  const isAdmin = (user.role?.type || '').toLowerCase() === 'admin'
  const dashboardHref = `/${locale}/manage`
  const { logout } = useAuth()
  const t = labels[locale] || labels['zh-Hans']
  const nav = navLabels[locale] || navLabels['zh-Hans']

  // 21 个条目平铺时无从扫读；按职能分组，每组内保持原有顺序。
  // 分组只是视觉编排，权限仍由服务端强制。
  const groups: Array<{ label: string; items: Array<{ href: string; label: string; icon: LucideIcon }> }> = [
    {
      label: nav.groupOverview,
      items: [{ href: dashboardHref, label: nav.dashboard, icon: LayoutDashboard }],
    },
    {
      label: nav.groupContent,
      items: [
        { href: `/${locale}/manage/announcements`, label: nav.announcements, icon: Bell },
        { href: `/${locale}/manage/creators`, label: nav.creators, icon: Users },
        { href: `/${locale}/manage/friend-links`, label: nav.friendLinks, icon: LinkIcon },
        { href: `/${locale}/manage/online-events`, label: nav.onlineEvents, icon: Radio },
        { href: `/${locale}/manage/offline-events`, label: nav.offlineEvents, icon: CalendarDays },
      ],
    },
    {
      label: nav.groupCodex,
      items: [
        { href: `/${locale}/manage/students`, label: nav.students, icon: UserSquare },
        { href: `/${locale}/manage/schools`, label: nav.schools, icon: GraduationCap },
      ],
    },
    {
      label: nav.groupResearch,
      items: [
        { href: `/${locale}/manage/research-entries`, label: nav.researchEntries, icon: FileSearch },
        { href: `/${locale}/manage/research-themes`, label: nav.researchThemes, icon: Tags },
        { href: `/${locale}/manage/research-citations`, label: nav.researchCitations, icon: Quote },
        { href: `/${locale}/manage/research-subjects`, label: nav.researchSubjects, icon: GitFork },
        { href: `/${locale}/manage/research-paths`, label: nav.researchPaths, icon: Route },
        { href: `/${locale}/manage/spoiler-tiers`, label: nav.spoilerTiers, icon: EyeOff },
        { href: `/${locale}/manage/research-curator`, label: nav.researchCurator, icon: BookMarked },
      ],
    },
    {
      label: nav.groupOps,
      items: [
        { href: `/${locale}/manage/content-quality`, label: nav.quality, icon: HeartPulse },
        { href: `/${locale}/manage/bulk-actions`, label: nav.bulk, icon: SlidersHorizontal },
        { href: `/${locale}/manage/system-health`, label: nav.system, icon: Activity },
        { href: `/${locale}/manage/admin-audit-logs`, label: nav.auditLogs, icon: ScrollText },
      ],
    },
    {
      label: nav.groupAccount,
      items: [
        // 用户管理仅 admin 可见；真正的拦截在 Worker 端，这里只是不给出无效入口
        ...(isAdmin ? [{ href: `/${locale}/manage/users`, label: nav.users, icon: UserCog }] : []),
        { href: `/${locale}/manage/profile`, label: nav.profile, icon: UserCircle },
      ],
    },
  ]

  return (
    // 与站点其余页面同构：Header → main → Footer。
    // 此前后台只有自己的侧栏，没有站点头尾，维护者进来后既无处返回站点，
    // 也拿不到语言与主题切换。
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
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

                <nav className="space-y-5">
                  {groups.map((group) => (
                    <div key={group.label} className="space-y-1">
                      <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {group.label}
                      </p>
                      {group.items.map((item) => {
                        const Icon = item.icon
                        // 仪表盘的 href 是 /manage 本身，而所有后台页面都以它开头 ——
                        // 用 startsWith 会让它永远处于选中态。仪表盘只在路径完全相等时高亮。
                        const isActive =
                          item.href === dashboardHref
                            ? pathname === item.href
                            : pathname === item.href || pathname.startsWith(`${item.href}/`)

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isActive ? 'page' : undefined}
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
                    </div>
                  ))}
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

      <Footer />
    </div>
  )
}
