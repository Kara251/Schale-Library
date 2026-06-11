'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Pagination } from '@/components/pagination'

interface UrlPaginationProps {
  currentPage: number
  totalPages: number
  className?: string
}

/**
 * 把页码写入 URL 的分页组件，供服务端分页的列表页复用
 */
export function UrlPagination({ currentPage, totalPages, className }: UrlPaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handlePageChange = useCallback((nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (nextPage > 1) {
      params.set('page', String(nextPage))
    } else {
      params.delete('page')
    }
    const nextSearch = params.toString()
    router.replace(`${pathname}${nextSearch ? `?${nextSearch}` : ''}`, { scroll: true })
  }, [pathname, router, searchParams])

  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      className={className}
    />
  )
}
