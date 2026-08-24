import Link from 'next/link'
import { Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AdminSearchFormProps {
  action: string
  search?: string
  placeholder: string
  status?: string
  showStatus?: boolean
  labels: {
    search: string
    statusAll: string
    statusPublished: string
    statusScheduled?: string
    statusDraft: string
    reset: string
  }
}

export function AdminSearchForm({
  action,
  search,
  placeholder,
  status = 'all',
  showStatus = true,
  labels,
}: AdminSearchFormProps) {
  // 不套卡片：靠间距与控件本身分区，与站点其余页面一致
  return (
    <form action={action} className="mb-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto_auto]">
      <div className="relative">
        {/* 放大镜是装饰性图标，不是可点击的提交按钮 —— 提交按钮在输入框外 */}
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="search" defaultValue={search} placeholder={placeholder} className="pl-10" />
      </div>

      {showStatus ? (
        <select
          name="status"
          defaultValue={status}
          className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        >
          <option value="all">{labels.statusAll}</option>
          <option value="published">{labels.statusPublished}</option>
          {labels.statusScheduled ? (
            <option value="scheduled">{labels.statusScheduled}</option>
          ) : null}
          <option value="draft">{labels.statusDraft}</option>
        </select>
      ) : (
        <input type="hidden" name="status" value="all" />
      )}

      <Button type="submit">{labels.search}</Button>
      <Button asChild variant="outline">
        <Link href={action}>{labels.reset}</Link>
      </Button>
    </form>
  )
}
