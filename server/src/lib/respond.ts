/**
 * Strapi 风格响应包装：公开 API 输出 { data, meta }，与 frontend/tests/contracts 对齐。
 */
export interface StrapiPagination {
  page: number
  pageSize: number
  pageCount: number
  total: number
}

export function ok<T>(data: T, meta?: Record<string, unknown>): Response {
  return Response.json({ data, meta: meta ?? {} })
}

export function okPaginated<T>(data: T[], pagination: StrapiPagination): Response {
  return Response.json({ data, meta: { pagination } })
}

export function fail(status: number, code: string): Response {
  return Response.json({ error: code }, { status })
}

export function paginationOf(page: number, pageSize: number, total: number): StrapiPagination {
  const safePage = Math.max(1, page)
  const safeSize = Math.max(1, pageSize)
  return {
    page: safePage,
    pageSize: safeSize,
    pageCount: Math.max(1, Math.ceil(total / safeSize)),
    total,
  }
}
