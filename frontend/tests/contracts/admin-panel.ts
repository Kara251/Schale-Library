/**
 * 管理面板 API 契约快照
 *
 * 纯数据常量：记录每个后台取数/写入函数的 HTTP 方法、端点、请求体与消费字段。
 * 来源：frontend/src/lib/admin-panel/client.ts、frontend/src/lib/server/admin-auth.ts、
 *       frontend/src/lib/server/rate-limit.ts。不引入任何测试框架。
 */

export const ADMIN_PANEL_CONTRACT = {
  listAdminCollection: {
    method: 'GET',
    endpoint: '/api/panel/<config.endpoint>',
    query: {
      page: 1,
      pageSize: 12,
      locale: '<locale>（仅 localized 集合）',
      search: '<query.search>',
      status: 'published | draft（非 all 时下发）',
    },
    headers: { Authorization: 'Bearer <session.token>' },
    consume: ['data[]', 'meta.pagination.page', 'meta.pagination.pageSize', 'meta.pagination.pageCount', 'meta.pagination.total'],
  },
  getSystemHealth: {
    method: 'GET',
    endpoint: '/api/panel/system/health',
    query: {},
    consume: ['status (ok|warning|error)', 'generatedAt', 'checks[].key/label/status/message'],
  },
  listContentQualityIssues: {
    method: 'GET',
    endpoint: '/api/panel/quality/issues',
    query: {
      page: 1,
      pageSize: 20,
      status: '<可选>',
      severity: '<可选>',
      collection: '<可选>',
      issueType: '<可选>',
    },
    consume: ['data[].issueType', 'data[].severity', 'data[].status', 'data[].collection', 'data[].message', 'meta.pagination'],
  },
  scanContentQuality: {
    method: 'POST',
    endpoint: '/api/panel/quality/scan',
    body: {},
    consume: ['success', 'count'],
  },
  runBulkAction: {
    method: 'POST',
    endpoint: '/api/panel/bulk-action',
    body: { collection: '<AdminCollectionKey>', action: '<string>', ids: ['<number>'], locale: '<可选>' },
    consume: ['success', 'updated', 'failed', 'errors[]'],
  },
  getAdminCollectionItem: {
    method: 'GET',
    endpoint: '/api/panel/<config.endpoint>/<id>',
    query: { locale: '<locale>（仅 localized 且传入）' },
    consume: ['data（单条 entry）'],
  },
  createAdminCollectionItem: {
    method: 'POST',
    endpoint: '/api/panel/<config.endpoint>',
    body: { data: '<payload>', locale: '<可选>' },
    consume: ['data（新建 entry）'],
  },
  updateAdminCollectionItem: {
    method: 'PUT',
    endpoint: '/api/panel/<config.endpoint>/<id>',
    body: { data: '<payload>', locale: '<可选>' },
    consume: ['data（更新后 entry）'],
  },
  deleteAdminCollectionItem: {
    method: 'DELETE',
    endpoint: '/api/panel/<config.endpoint>/<id>',
    query: { locale: '<locale>（仅 localized 且传入）' },
    consume: ['success'],
  },
  uploadAdminMedia: {
    method: 'POST',
    endpoint: '/api/panel/upload',
    body: 'multipart/form-data: files, fieldName?, collection?',
    consume: ['data[] (AdminMediaAsset)'],
  },
  syncBilibiliSubscription: {
    method: 'POST',
    endpoint: '/api/bilibili-subscriptions/<id>/sync',
    body: {},
    consume: ['success', 'message', 'total', 'created', 'skipped', 'failed', 'errors[]'],
  },
  syncAllBilibiliSubscriptions: {
    method: 'POST',
    endpoint: '/api/bilibili-subscriptions/sync-all',
    body: {},
    consume: ['success', 'total', 'created', 'skipped', 'failed'],
  },
  getCuratorAdmin: {
    method: 'GET',
    endpoint: '/api/panel/research-curator',
    query: { locale: '<可选>' },
    consume: ['data.featured_entry (id/title/slug)', 'data.pick_note', 'data.path_description'],
  },
  updateCuratorAdmin: {
    method: 'PUT',
    endpoint: '/api/panel/research-curator',
    body: { data: '<Record<string, unknown>>', locale: '<可选>' },
    consume: ['data (CuratorAdminData)'],
  },
  getAdminDashboardItems: {
    method: 'GET',
    endpoint: '/api/panel/<config.endpoint>（对每个集合 pageSize=1 取 total）',
    query: { page: 1, pageSize: 1, status: 'all', locale: '<locale>' },
    consume: ['key', 'title[locale]', 'total (meta.pagination.total)', 'href /<locale>/manage/<key>'],
  },
} as const;

export const ADMIN_AUTH_CONTRACT = {
  fetchStrapiCurrentUser: {
    method: 'GET',
    endpoint: '/api/users/me?populate=role',
    headers: { Authorization: 'Bearer <token>', 'Content-Type': 'application/json' },
    cache: 'no-store',
    consume: [
      'user.id',
      'user.username',
      'user.email',
      'user.blocked',
      'user.role.type',
      'user.role.name',
    ],
  },
  login: {
    method: 'POST',
    endpoint: '/api/auth/local',
    body: { identifier: '<用户名或邮箱>', password: '<明文>' },
    cache: 'no-store',
    consume: ['jwt', 'error.message'],
  },
  sessionCookie: {
    name: 'schale_admin_session',
    options: { httpOnly: true, sameSite: 'strict', secure: 'production only', path: '/', maxAgeSeconds: 28800 },
  },
  allowedRolesEnv: 'ADMIN_PANEL_ALLOWED_ROLES（逗号分隔；开发环境默认 authenticated；生产缺省拒绝全部）',
} as const;

export const RATE_LIMIT_CONTRACT = {
  checkServerRateLimit: {
    method: 'POST',
    endpoint: '/api/panel/internal/rate-limit',
    headers: {
      'Content-Type': 'application/json',
      'x-panel-internal-token': '<PANEL_INTERNAL_TOKEN，存在时携带>',
    },
    body: { scope: '<string>', identifier: '<string>', limit: '<number>', windowMs: '<number>' },
    timeoutMs: 3000,
    failClosedDefault: true,
    consume: ['allowed (boolean)'],
    productionNoTokenBehavior: '直接按 !failClosed 返回，不发请求',
  },
  getClientIpSource: "x-forwarded-for 最后一跳优先，回退 x-real-ip，再回退 'unknown'",
  loginRateLimits: {
    perIp: { limit: 30, windowMs: 600000 },
    perAccount: { limit: 10, windowMs: 600000 },
  },
} as const;
