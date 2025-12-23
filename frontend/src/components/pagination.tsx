'use client'

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLocale } from '@/contexts/locale-context'
import type { Locale } from '@/lib/i18n'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

const labels: Record<Locale, {
  first: string
  prev: string
  next: string
  last: string
  pageInfo: string
}> = {
  'zh-Hans': { first: '首页', prev: '上一页', next: '下一页', last: '末页', pageInfo: '第 {current} / {total} 页' },
  'en': { first: 'First', prev: 'Previous', next: 'Next', last: 'Last', pageInfo: 'Page {current} / {total}' },
  'ja': { first: '最初', prev: '前へ', next: '次へ', last: '最後', pageInfo: 'ページ {current} / {total}' },
}
export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  const { locale } = useLocale()
  const t = labels[locale] || labels['zh-Hans']

  // 生成页码数组
  const generatePageNumbers = () => {
    const pages: (number | string)[] = []
    const showPages = 5 // 显示的页码数量

    if (totalPages <= showPages + 2) {
      // 页数较少，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // 页数较多，显示部分页码
      if (currentPage <= 3) {
        // 当前页在前面
        for (let i = 1; i <= showPages; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        // 当前页在后面
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - showPages + 1; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        // 当前页在中间
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }

  const pages = generatePageNumbers()

  if (totalPages <= 1) {
    return null
  }

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      {/* 首页按钮 */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        aria-label={t.first}
        className="hidden sm:inline-flex"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>

      {/* 上一页按钮 */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label={t.prev}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* 页码按钮 */}
      <div className="flex items-center gap-1">
        {pages.map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                ...
              </span>
            )
          }

          return (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              size="icon"
              onClick={() => onPageChange(page as number)}
              className={cn(
                'w-10 h-10',
                currentPage === page && 'pointer-events-none'
              )}
            >
              {page}
            </Button>
          )
        })}
      </div>

      {/* 下一页按钮 */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label={t.next}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* 末页按钮 */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        aria-label={t.last}
        className="hidden sm:inline-flex"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>

      {/* 页码信息 */}
      <div className="ml-4 text-sm text-muted-foreground hidden md:block">
        {t.pageInfo.replace('{current}', String(currentPage)).replace('{total}', String(totalPages))}
      </div>
    </div>
  )
}
