interface AdminPageHeaderProps {
  title: string
  /** 只在真的能告诉维护者一些标题以外的信息时才写；复述标题的句子一律不写 */
  description?: string
  actions?: React.ReactNode
}

/**
 * 页面头：标题 + 说明 + 右侧操作。
 *
 * 不套卡片。站点其余页面（如活动页）的分区一律靠字号、字重与间距区分，
 * 后台此前给标题、筛选器、内容、分页各套一个框，一屏四个边框纯属噪音。
 */
export function AdminPageHeader({ title, description, actions }: AdminPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  )
}
