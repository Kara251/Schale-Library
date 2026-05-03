'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/contexts/locale-context'
import type { Locale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const labels: Record<Locale, string> = {
  'zh-Hans': '返回顶部',
  en: 'Back to top',
  ja: 'トップへ戻る',
}

/**
 * 返回顶部按钮组件
 */
export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false)
  const { locale } = useLocale()
  const label = labels[locale] || labels['zh-Hans']

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', toggleVisibility)
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className={cn(
        'fixed bottom-8 right-8 z-50 shadow-lg transition-all duration-300',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16 pointer-events-none'
      )}
      aria-label={label}
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  )
}
