"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Search, LogIn, Menu } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { LocaleToggle } from "@/components/locale-toggle"
import { LocaleLink, useLocalePath } from "@/components/locale-link"
import { UserMenu } from "@/components/user-menu"
import { useAuth } from "@/contexts/auth-context"
import { useLocale } from "@/contexts/locale-context"
import { type Locale } from "@/lib/i18n"

// 导航项 - 按语言
const getNavItems = (locale: Locale) => {
  const labels: Record<Locale, Record<string, string>> = {
    'zh-Hans': {
      announcements: '公告',
      works: '推荐作品',
      resources: '资源整理',
      online: '线上活动',
      offline: '线下活动',
      search: '搜索图书馆',
      login: '登录',
    },
    'en': {
      announcements: 'Announcements',
      works: 'Works',
      resources: 'Resources',
      online: 'Online Events',
      offline: 'Offline Events',
      search: 'Search library',
      login: 'Login',
    },
    'ja': {
      announcements: 'お知らせ',
      works: '作品',
      resources: 'リソース',
      online: 'オンライン',
      offline: 'オフライン',
      search: '図書館を検索',
      login: 'ログイン',
    },
  }
  const t = labels[locale] || labels['zh-Hans']
  return [
    { label: t.announcements, href: '/announcements' },
    { label: t.works, href: '/works' },
    { label: t.resources, href: '/resources' },
    { label: t.online, href: '/online-events' },
    { label: t.offline, href: '/offline-events' },
  ]
}

/**
 * 响应式断点说明：
 * - xl (1280px+): 显示所有按钮（搜索、导航、登录、语言、主题）
 * - lg (1024px-1280px): 隐藏导航按钮，显示搜索、登录、语言、主题
 * - md (768px-1024px): 只显示登录 + 汉堡菜单
 * - sm (<768px): 隐藏搜索，只有登录 + 汉堡菜单，侧边栏显示搜索
 */
export function Header() {
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const { locale } = useLocale()
  const getLocalePath = useLocalePath()

  const navItems = getNavItems(locale)
  const labels = {
    'zh-Hans': { search: '搜索图书馆', login: '登录', themeLocale: '主题 & 语言' },
    'en': { search: 'Search library', login: 'Login', themeLocale: 'Theme & Language' },
    'ja': { search: '図書館を検索', login: 'ログイン', themeLocale: 'テーマ & 言語' },
  }[locale] || { search: '搜索图书馆', login: '登录', themeLocale: '主题 & 语言' }

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      router.push(getLocalePath(`/global-search?q=${encodeURIComponent(searchQuery.trim())}`))
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <LocaleLink href="/" className="flex items-center shrink-0">
            <Image
              src="/img/ShcaleLibraryLogo.png"
              alt="Schale Library"
              width={128}
              height={128}
              className="rounded"
              style={{ width: 'auto', height: 'auto' }}
              priority
            />
          </LocaleLink>

          {/* 搜索框 - lg以上显示 */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8">
            <div className={`relative w-full transition-all duration-200 ${isSearchFocused ? "scale-105" : ""}`}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={labels.search}
                className="pl-10 bg-secondary border-border focus:border-primary transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
            </div>
          </div>

          {/* 导航链接 - xl以上显示 */}
          <nav className="hidden xl:flex items-center gap-1">
            {navItems.map((item) => (
              <LocaleLink
                key={item.href}
                href={item.href}
                className="px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              >
                {item.label}
              </LocaleLink>
            ))}
          </nav>

          {/* 右侧控件区 */}
          <div className="flex items-center gap-2">
            {/* 语言和主题切换 - xl以上显示 */}
            <div className="hidden xl:flex items-center gap-1">
              <ThemeToggle />
              <LocaleToggle />
            </div>

            {/* 登录按钮 - 始终显示 */}
            {!isLoading && (
              isAuthenticated ? (
                <UserMenu />
              ) : (
                <Button variant="ghost" size="sm" asChild>
                  <LocaleLink href="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">{labels.login}</span>
                  </LocaleLink>
                </Button>
              )
            )}

            {/* 汉堡菜单 - xl以下显示 */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="xl:hidden cursor-pointer">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0" title="导航菜单">

                {/* 搜索框 - 只在lg以下显示（当顶部搜索框隐藏时） */}
                <div className="p-4 pt-12 border-b lg:hidden">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={labels.search}
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearch}
                    />
                  </div>
                </div>

                {/* 导航链接 */}
                <nav className="flex-1 p-4">
                  <div className="space-y-1">
                    {navItems.map((item) => (
                      <LocaleLink
                        key={item.href}
                        href={item.href}
                        className="flex items-center px-4 py-3 text-foreground hover:bg-primary/10 hover:text-primary rounded-lg transition-all duration-200"
                      >
                        <span className="font-medium">{item.label}</span>
                      </LocaleLink>
                    ))}                  </div>
                </nav>

                {/* 底部操作 - 主题和语言切换 */}
                <div className="p-4 border-t bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{labels.themeLocale}</span>
                    <div className="flex gap-2">
                      <ThemeToggle />
                      <LocaleToggle />
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
