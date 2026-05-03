'use client'

import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLocale } from '@/contexts/locale-context'
import { locales, localeNames, type Locale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const labels: Record<Locale, string> = {
  'zh-Hans': '切换语言',
  en: 'Change language',
  ja: '言語を切り替え',
}

/**
 * 语言切换组件
 */
export function LocaleToggle() {
  const { locale, setLocale } = useLocale()
  const label = labels[locale] || labels['zh-Hans']

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} className="cursor-pointer">
          <Languages className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => setLocale(loc)}
            className={cn(
              'cursor-pointer',
              locale === loc && 'bg-primary/20 text-primary font-medium'
            )}
          >
            {localeNames[loc]}
            {locale === loc && ' ✓'}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
