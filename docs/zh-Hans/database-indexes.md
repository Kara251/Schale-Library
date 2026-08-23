# 数据库索引说明

## D1（SQLite）索引现状

索引随迁移定义在 `server/migrations/0001_baseline.sql`：

| 表 | 索引 | 用途 |
|----|------|------|
| creators | idx_creators_featured(is_featured, featured_priority) | 首页精选/列表排序 |
| events | idx_events_start(kind, start_time DESC) | 活动列表排序 |
| events | idx_events_published_start(published_at, start_time DESC) | 发布过滤+排序 |
| announcements | idx_announcements_created(created_at DESC) | 公告列表 |
| research_entries | idx_research_entries_slug(slug) | slug 详情查询 |
| admin_audit_logs | idx_audit_created(created_at) | cron/手动清理 |
| rate_limit_records | idx_rate_limit_reset(reset_at)、idx_rate_limit_scope_key(scope, identifier, key) | 限流窗口查询+清理 |
| sessions | idx_sessions_expires(expires_at) | 过期会话清理 |
| works | idx_works_published / idx_works_featured / idx_works_author | works 服役期查询（W5 后随表退役） |

每张表的 `document_id` / `slug` 都有 UNIQUE 约束带来的自动索引（`sqlite_autoindex_*`），
详情查询已覆盖，不必再手工建。

## 尚未建立的索引（有意为之）

students / schools / friend_links / spoiler_tiers / research_* 的**列表查询**
（`published_at` 过滤 + 排序列）没有覆盖索引。当前数据量下全表扫描成本可忽略，
而索引有写放大与存储成本。

**触发点**：单表超过约 1 万行，或 D1 用量面板的 `rows_read` 明显上升时再补。

## 设计原则（继承性能审计结论）

- 清理类查询（created_at / reset_at / expires_at）必须有单列索引支撑
- 列表查询浅加载、详情深加载分离（populate 由路由显式控制）
- 无 FTS：搜索用 LIKE containsi（内容量级下足够，CJK 分词无收益）

## 备份与恢复

- time travel：30 天时点恢复（CF Dashboard）
- 冷备：`wrangler d1 export schale_db --remote --output backup.sql`
