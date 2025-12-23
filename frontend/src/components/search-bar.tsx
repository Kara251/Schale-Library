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
}

const labels: Record<Locale, { search: string; defaultPlaceholder: string }> = {
  'zh-Hans': { search: '搜索', defaultPlaceholder: '搜索活动...' },
  'en': { search: 'Search', defaultPlaceholder: 'Search events...' },
  'ja': { search: '検索', defaultPlaceholder: 'イベントを検索...' },
}

/**
 * 搜索栏组件
 */
export function SearchBar({ onSearch, placeholder, className }: SearchBarProps) {
  const { locale } = useLocale()
  const t = labels[locale] || labels['zh-Hans']
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query)
  }

  const handleClear = () => {
    setQuery('')
    onSearch('')
  }

  return (
    <form onSubmit={handleSubmit} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder || t.defaultPlaceholder}
          className="pl-10 pr-24"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-16 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-destructive/10"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 cursor-pointer"
        >
          {t.search}
        </Button>
      </div>
    </form>
  )
}
