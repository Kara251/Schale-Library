import Link from 'next/link'

import { Button } from '@/components/ui/button'

interface AdminPaginationProps {
  page: number
  pageCount: number
  /** 总条数：不显示的话维护者不知道手上有多少数据，也无从判断筛选是否生效 */
  total?: number
  pageSize?: number
  buildHref: (page: number) => string
  /** 每页条数切换；不传则不渲染该控件 */
  buildPageSizeHref?: (pageSize: number) => string
  pageSizeOptions?: number[]
  labels: {
    previous: string
    next: string
    summary: string
    /** 形如「共 {total} 条」；缺省则不显示总数 */
    totalSummary?: string
    perPage?: string
  }
}

export function AdminPagination({
  page,
  pageCount,
  total,
  pageSize,
  buildHref,
  buildPageSizeHref,
  pageSizeOptions = [12, 24, 50],
  labels,
}: AdminPaginationProps) {
  // 只有一页且无需切换每页条数时，整个控件没有存在意义
  if (pageCount <= 1 && !buildPageSizeHref) {
    return null
  }

  const summary = labels.summary
    .replace('{page}', String(page))
    .replace('{pageCount}', String(Math.max(1, pageCount)))

  const totalText =
    total !== undefined && labels.totalSummary
      ? labels.totalSummary.replace('{total}', String(total))
      : null

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-lg border bg-card p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>{summary}</span>
        {totalText ? <span>{totalText}</span> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {buildPageSizeHref && labels.perPage ? (
          <div className="mr-2 flex items-center gap-2">
            <span className="text-xs">{labels.perPage}</span>
            {pageSizeOptions.map((option) => (
              <Button
                key={option}
                asChild={option !== pageSize}
                variant={option === pageSize ? 'secondary' : 'ghost'}
                size="sm"
                disabled={option === pageSize}
              >
                {option === pageSize ? (
                  <span>{option}</span>
                ) : (
                  <Link href={buildPageSizeHref(option)}>{option}</Link>
                )}
              </Button>
            ))}
          </div>
        ) : null}

        {page <= 1 ? (
          <Button variant="outline" size="sm" disabled>
            {labels.previous}
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href={buildHref(page - 1)}>{labels.previous}</Link>
          </Button>
        )}

        {page >= pageCount ? (
          <Button variant="outline" size="sm" disabled>
            {labels.next}
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href={buildHref(page + 1)}>{labels.next}</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
