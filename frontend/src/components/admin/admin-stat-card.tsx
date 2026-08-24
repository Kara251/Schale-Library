import Link from 'next/link'

interface AdminStatCardProps {
  title: string
  value: number
  href: string
  viewLabel: string
}

/**
 * 仪表盘的单项统计。
 *
 * 不套卡片：十几个集合并排时，十几个边框只是把网格变成栅栏。
 * 靠「小标题 + 大数字 + 链接」三级字重自成一组，间距负责分隔。
 */
export function AdminStatCard({ title, value, href, viewLabel }: AdminStatCardProps) {
  return (
    <Link href={href} className="group block py-2">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
      <span className="mt-1 inline-block text-sm text-primary group-hover:underline">{viewLabel}</span>
    </Link>
  )
}
