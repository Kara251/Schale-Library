import Link from 'next/link'

import { Button } from '@/components/ui/button'

interface AdminPaginationProps {
  page: number
  pageCount: number
  buildHref: (page: number) => string
  labels: {
    previous: string
    next: string
    summary: string
  }
}

export function AdminPagination({ page, pageCount, buildHref, labels }: AdminPaginationProps) {
  if (pageCount <= 1) {
    return null
  }

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-lg border bg-card p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>{labels.summary.replace('{page}', String(page)).replace('{pageCount}', String(pageCount))}</span>
      <div className="flex items-center gap-2">
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
