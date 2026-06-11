import { COLLECTIONS } from './collection-config'
import { buildCollectionSpecificFilters, buildSearchFilters, mergeFilters } from './query-utils'

const AUDIT_LOG_UID = 'api::admin-audit-log.admin-audit-log' as any
const AUDIT_EXPORT_PAGE_SIZE = 100
const AUDIT_EXPORT_MAX_ROWS = 10000

function escapeCsv(value: unknown) {
  let text = value === null || value === undefined ? '' : String(value)
  // 中和以 = + - @ 或制表符开头的单元格，防止在 Excel 中被当作公式执行
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`
  }
  return `"${text.replace(/"/g, '""')}"`
}

export async function exportAdminAuditLogs(ctx: any) {
  const filters = mergeFilters(
    buildSearchFilters(COLLECTIONS['admin-audit-logs'].searchFields, ctx.query.search),
    buildCollectionSpecificFilters('admin-audit-logs', ctx.query)
  )
  const rows: any[] = []
  let start = 0
  let truncated = false

  while (rows.length < AUDIT_EXPORT_MAX_ROWS) {
    const page = await strapi.entityService.findMany(AUDIT_LOG_UID, {
      filters,
      sort: 'createdAt:desc',
      start,
      limit: Math.min(AUDIT_EXPORT_PAGE_SIZE, AUDIT_EXPORT_MAX_ROWS - rows.length),
    }) as any[]

    rows.push(...page)
    if (page.length < AUDIT_EXPORT_PAGE_SIZE) {
      break
    }

    start += AUDIT_EXPORT_PAGE_SIZE
  }

  const total = await strapi.entityService.count(AUDIT_LOG_UID, { filters } as any)
  truncated = total > rows.length
  const header = ['createdAt', 'action', 'status', 'actorEmail', 'actorUsername', 'targetCollection', 'targetId', 'targetName', 'locale', 'message']
  const csv = [
    ...(truncated ? [`# Export truncated to ${AUDIT_EXPORT_MAX_ROWS} of ${total} matching rows`] : []),
    header.join(','),
    ...rows.map((row) => header.map((key) => escapeCsv(row[key])).join(',')),
  ].join('\n')

  ctx.set('Content-Type', 'text/csv; charset=utf-8')
  ctx.set('Content-Disposition', 'attachment; filename="admin-audit-logs.csv"')
  ctx.set('X-Export-Truncated', truncated ? 'true' : 'false')
  ctx.body = csv
}
