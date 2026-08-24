/**
 * 公共内容 API 契约快照汇总
 *
 * 纯数据常量文件集合；不引入任何测试框架。
 * 各域契约来源：
 * - works/events/students/research/misc → frontend/src/lib/api/<域>.ts
 * - admin-panel（含 auth/rate-limit）   → frontend/src/lib/admin-panel/client.ts、lib/server/*
 * - audit-logs                          → frontend/src/app/api/admin/audit-logs/export/route.ts
 * - media-seed                          → frontend/src/lib/media.ts
 */

export { WORKS_CONTRACT } from './works';
export { EVENTS_CONTRACT } from './events';
export { STUDENTS_CONTRACT } from './students';
export { RESEARCH_CONTRACT } from './research';
export { MISC_CONTRACT } from './misc';
export {
  ADMIN_PANEL_CONTRACT,
  ADMIN_AUTH_CONTRACT,
  RATE_LIMIT_CONTRACT,
} from './admin-panel';
export { AUDIT_LOGS_EXPORT_CONTRACT } from './audit-logs';
export { MEDIA_CONTRACT } from './media-seed';

/**
 * 全部契约快照的聚合视图，便于一次性遍历校验。
 */
import { WORKS_CONTRACT } from './works';
import { EVENTS_CONTRACT } from './events';
import { STUDENTS_CONTRACT } from './students';
import { RESEARCH_CONTRACT } from './research';
import { MISC_CONTRACT } from './misc';
import {
  ADMIN_PANEL_CONTRACT,
  ADMIN_AUTH_CONTRACT,
  RATE_LIMIT_CONTRACT,
} from './admin-panel';
import { AUDIT_LOGS_EXPORT_CONTRACT } from './audit-logs';
import { MEDIA_CONTRACT } from './media-seed';

export const ALL_CONTRACTS = {
  works: WORKS_CONTRACT,
  events: EVENTS_CONTRACT,
  students: STUDENTS_CONTRACT,
  research: RESEARCH_CONTRACT,
  misc: MISC_CONTRACT,
  adminPanel: ADMIN_PANEL_CONTRACT,
  adminAuth: ADMIN_AUTH_CONTRACT,
  rateLimit: RATE_LIMIT_CONTRACT,
  auditLogsExport: AUDIT_LOGS_EXPORT_CONTRACT,
  media: MEDIA_CONTRACT,
} as const;
