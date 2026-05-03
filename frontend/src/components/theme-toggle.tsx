'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/contexts/locale-context'
import type { Locale } from '@/lib/i18n'

const labels: Record<Locale, {
  toggle: string
  toDark: string
  toLight: string
}> = {
  'zh-Hans': {
    toggle: '切换主题',
    toDark: '切换到暗色模式',
    toLight: '切换到亮色模式',
  },
  en: {
    toggle: 'Toggle theme',
    toDark: 'Switch to dark mode',
    toLight: 'Switch to light mode',
  },
  ja: {
    toggle: 'テーマを切り替え',
    toDark: 'ダークモードに切り替え',
    toLight: 'ライトモードに切り替え',
  },
}

function subscribeToClientRender() {
  return () => undefined
}

function getClientTheme(): 'light' | 'dark' {
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
  if (savedTheme) {
    return savedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * 主题切换组件 - 暗色/亮色模式切换
 */
export function ThemeToggle() {
  const [, setRenderVersion] = useState(0)
  const { locale } = useLocale()
  const isClient = useSyncExternalStore(subscribeToClientRender, () => true, () => false)
  const theme = isClient ? getClientTheme() : 'light'
  const t = labels[locale] || labels['zh-Hans']

  // 避免 hydration 不匹配
  useEffect(() => {
    if (!isClient) {
      return
    }

    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [isClient, theme])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
    setRenderVersion((currentVersion) => currentVersion + 1)
  }

  if (!isClient) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Sun className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={t.toggle}
      title={theme === 'light' ? t.toDark : t.toLight}
      className="cursor-pointer"
    >
      {theme === 'light' ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </Button>
  )
}
