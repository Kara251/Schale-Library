'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Locale, defaultLocale, locales } from '@/lib/i18n'

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

/**
 * 从路径中提取语言
 */
function getLocaleFromPath(pathname: string): Locale {
  const segments = pathname.split('/')
  const firstSegment = segments[1]
  if (locales.includes(firstSegment as Locale)) {
    return firstSegment as Locale
  }
  return defaultLocale
}

/**
 * 替换路径中的语言前缀
 */
function replaceLocaleInPath(pathname: string, newLocale: Locale): string {
  const segments = pathname.split('/')
  const currentLocale = segments[1]

  if (locales.includes(currentLocale as Locale)) {
    // 替换现有语言前缀
    segments[1] = newLocale
    return segments.join('/')
  }

  // 添加语言前缀（不应该发生，因为 middleware 会重定向）
  return `/${newLocale}${pathname}`
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 从 URL 路径读取语言
  useEffect(() => {
    if (pathname) {
      const pathLocale = getLocaleFromPath(pathname)
      setLocaleState(pathLocale)
    }
  }, [pathname])

  const setLocale = (newLocale: Locale) => {
    if (newLocale === locale) return

    // 更新 cookie
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`

    // 导航到新语言路径（使用 router.push 保留浏览器缓存，router.refresh 更新服务端组件）
    const newPath = replaceLocaleInPath(pathname, newLocale)
    router.push(newPath)
    router.refresh()
  }

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (context === undefined) {
    // 返回默认值而不是抛出错误，以支持错误页面等特殊场景
    return {
      locale: defaultLocale,
      setLocale: () => { },
    }
  }
  return context
}
