# PostgreSQL 索引建议

[English](../en/database-indexes.md) | [日本語](../ja/database-indexes.md)

这些索引用于正式生产或 staging 数据量增长后的 PostgreSQL/Supabase。先在临时库执行并观察查询计划，再在生产低峰期执行。Strapi 迁移或升级后，应确认实际列名仍与 SQL 一致。

```sql
-- 作品列表、精选推荐、RSS 去重
CREATE INDEX CONCURRENTLY IF NOT EXISTS works_locale_published_idx
  ON works (locale, published_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS works_featured_idx
  ON works (is_featured, featured_until, featured_priority DESC, published_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS works_filters_idx
  ON works (nature, work_type, source_platform, is_active, published_at DESC);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS works_source_unique_idx
  ON works (source_platform, source_id)
  WHERE source_id IS NOT NULL;

-- 活动发现
CREATE INDEX CONCURRENTLY IF NOT EXISTS online_events_discovery_idx
  ON online_events (locale, nature, end_time DESC, start_time ASC, published_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS offline_events_discovery_idx
  ON offline_events (locale, nature, end_time DESC, start_time ASC, published_at DESC);

-- 后台审计、同步日志、质量扫描
CREATE INDEX CONCURRENTLY IF NOT EXISTS admin_audit_logs_filters_idx
  ON admin_audit_logs (created_at DESC, action, status, target_collection, actor_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS sync_logs_retry_idx
  ON sync_logs (stage, status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS content_quality_open_idx
  ON content_quality_issues (status, severity, collection, detected_at DESC);

-- 内部限流与 cron 锁
CREATE INDEX CONCURRENTLY IF NOT EXISTS rate_limit_records_scope_reset_idx
  ON rate_limit_records (scope, reset_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS job_locks_until_idx
  ON job_locks (locked_until);
```

如果 Supabase 不允许在事务内使用 `CONCURRENTLY`，请在 SQL editor 中逐条执行。
