import Link from 'next/link'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AdminStatCardProps {
  title: string
  value: number
  href: string
  viewLabel: string
}

export function AdminStatCard({ title, value, href, viewLabel }: AdminStatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <Link href={href} className="mt-3 inline-block text-sm text-primary hover:underline">
          {viewLabel}
        </Link>
      </CardContent>
    </Card>
  )
}
