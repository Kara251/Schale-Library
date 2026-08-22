/**
 * 审计日志导出 API 契约快照
 *
 * 纯数据常量：记录导出端点的代理行为与消费字段。
 * 来源：frontend/src/app/api/admin/audit-logs/export/route.ts。不引入任何测试框架。
 */

export const AUDIT_LOGS_EXPORT_CONTRACT = {
  exportAuditLogs: {
    method: 'GET',
    endpoint: '/api/panel/admin-audit-logs/export（Next.js 路由代理透传 query string）',
    auth: 'Cookie schale_admin_session → getAdminSession → Bearer <session.token>',
    upstreamQuery: 'request.nextUrl.searchParams 原样转发（action/actor/collection/from/to/stage 等）',
    cache: 'no-store',
    consume: [
      'response.body (CSV 流式透传)',
      'content-type (默认 text/csv; charset=utf-8)',
      "content-disposition (默认 attachment; filename=\"admin-audit-logs.csv\")",
    ],
    errors: {
      401: '{ error: "Unauthorized" }（无有效会话）',
      upstream: "{ error: 'Failed to export audit logs' }（上游非 2xx，状态码透传）",
    },
  },
} as const;
