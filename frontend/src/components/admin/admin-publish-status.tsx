/**
 * 列表里的发布状态。
 *
 * 必须读后端的 status 三态，不能用 publishedAt 的真假判断 ——
 * 已排期的内容 publishedAt 非空，会被误标成「已发布」，
 * 而它此刻并不在站点上。
 *
 * 呈现上只用文字与颜色：三个字外面套一个描边框，除了制造噪点没有别的作用。
 */
export type AdminPublishStatus = 'draft' | 'scheduled' | 'published'

interface AdminPublishStatusProps {
  status: string | undefined
  labels: { published: string; scheduled: string; draft: string }
}

export function AdminPublishStatusText({ status, labels }: AdminPublishStatusProps) {
  if (status === 'published') {
    return <span className="text-sm font-medium text-primary">{labels.published}</span>
  }
  if (status === 'scheduled') {
    return <span className="text-sm font-medium text-foreground">{labels.scheduled}</span>
  }
  return <span className="text-sm text-muted-foreground">{labels.draft}</span>
}
