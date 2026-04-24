'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'

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
  const isClient = useSyncExternalStore(subscribeToClientRender, () => true, () => false)
  const theme = isClient ? getClientTheme() : 'light'

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
      aria-label="切换主题"
      title={theme === 'light' ? '切换到暗色模式' : '切换到亮色模式'}
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
