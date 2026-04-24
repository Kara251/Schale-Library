import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AdminPageHeaderProps {
  title: string
  description: string
  actions?: React.ReactNode
}

export function AdminPageHeader({ title, description, actions }: AdminPageHeaderProps) {
  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardContent className="p-0 pt-2 text-sm text-muted-foreground">
            {description}
          </CardContent>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </CardHeader>
    </Card>
  )
}
