import { Badge } from '@/components/ui/badge'

/**
 * 列表里的发布状态标记。
 *
 * 必须读后端的 status 三态，不能用 publishedAt 的真假判断 ——
 * 已排期的内容 publishedAt 非空，会被误标成「已发布」，
 * 而它此刻并不在站点上。
 */
export type AdminPublishStatus = 'draft' | 'scheduled' | 'published'

interface AdminPublishStatusBadgeProps {
  status: string | undefined
  labels: { published: string; scheduled: string; draft: string }
}

export function AdminPublishStatusBadge({ status, labels }: AdminPublishStatusBadgeProps) {
  if (status === 'published') {
    return <Badge variant="default">{labels.published}</Badge>
  }
  if (status === 'scheduled') {
    return <Badge variant="secondary">{labels.scheduled}</Badge>
  }
  return <Badge variant="outline">{labels.draft}</Badge>
}
