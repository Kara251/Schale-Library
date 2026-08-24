import type { ReactNode } from 'react'

interface AdminTableColumn<T> {
  header: string
  key: string
  className?: string
  render: (item: T) => ReactNode
}

interface AdminTableProps<T extends { id: string | number }> {
  columns: AdminTableColumn<T>[]
  items: T[]
  emptyText: string
}

export function AdminTable<T extends { id: string | number }>({ columns, items, emptyText }: AdminTableProps<T>) {
  if (items.length === 0) {
    // 空态不套框：一句话就是一句话，围一圈边框只是把空旷感放大
    return <p className="py-8 text-sm text-muted-foreground">{emptyText}</p>
  }

  return (
    // 表格靠表头下的分隔线与行间线构成结构，不再额外套一层边框容器
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead className="text-left text-muted-foreground">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={`border-b px-3 py-2 text-xs font-bold uppercase tracking-wide ${column.className ?? ''}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b last:border-b-0 hover:bg-secondary/30">
              {columns.map((column) => (
                <td key={column.key} className={`px-3 py-3 align-top ${column.className ?? ''}`}>
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
