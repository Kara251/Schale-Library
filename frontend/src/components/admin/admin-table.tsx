import type { ReactNode } from 'react'

interface AdminTableColumn<T> {
  header: string
  key: string
  className?: string
  render: (item: T) => ReactNode
}

interface AdminTableProps<T extends { id: number }> {
  columns: AdminTableColumn<T>[]
  items: T[]
  emptyText: string
}

export function AdminTable<T extends { id: number }>({ columns, items, emptyText }: AdminTableProps<T>) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        {emptyText}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-secondary/40 text-left text-muted-foreground">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={`border-b px-4 py-3 font-medium ${column.className ?? ''}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b last:border-b-0">
              {columns.map((column) => (
                <td key={column.key} className={`px-4 py-3 align-top ${column.className ?? ''}`}>
                  {column.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
