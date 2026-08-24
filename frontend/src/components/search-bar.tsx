'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/contexts/locale-context'
import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/i18n'

interface SearchBarProps {
  onSearch: (query: string) => void
  placeholder?: string
  className?: string
  initialValue?: string
}

const labels: Record<Locale, { search: string; defaultPlaceholder: string }> = {
  'zh-Hans': { search: '搜索', defaultPlaceholder: '搜索活动...' },
  'en': { search: 'Search', defaultPlaceholder: 'Search events...' },
  'ja': { search: '検索', defaultPlaceholder: 'イベントを検索...' },
}

/**
 * 搜索栏组件
 */
export function SearchBar({ onSearch, placeholder, className, initialValue }: SearchBarProps) {
  const { locale } = useLocale()
  const t = labels[locale] || labels['zh-Hans']
  const [query, setQuery] = useState(initialValue || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query)
  }

  const handleClear = () => {
    setQuery('')
    onSearch('')
  }

  return (
    // 搜索按钮在输入框外并排，不再用 absolute 压在框内 ——
    // 压在框内会遮住输入内容，也让按钮看起来像输入框的一部分。
    // 只有清除（×）留在框内：它作用于框内内容本身，是输入框的附属控件。
    <form onSubmit={handleSubmit} className={cn('flex items-center gap-2', className)}>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder || t.defaultPlaceholder}
          className={cn('pl-10', query && 'pr-10')}
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            aria-label={t.search}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-destructive/10"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Button type="submit" className="shrink-0 cursor-pointer">
        {t.search}
      </Button>
    </form>
  )
}
