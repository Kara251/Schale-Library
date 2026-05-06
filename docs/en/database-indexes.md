# PostgreSQL Index Recommendations

[简体中文](../zh-Hans/database-indexes.md) | [日本語](../ja/database-indexes.md)

These indexes are intended for PostgreSQL/Supabase after staging or production content grows. Run them first on a temporary database and inspect query plans before applying them during a quiet production window. After Strapi migrations or upgrades, confirm that actual column names still match the SQL.

```sql
-- Works listing, featured recommendations, RSS deduplication
CREATE INDEX CONCURRENTLY IF NOT EXISTS works_locale_published_idx
  ON works (locale, published_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS works_featured_idx
  ON works (is_featured, featured_until, featured_priority DESC, published_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS works_filters_idx
  ON works (nature, work_type, source_platform, is_active, published_at DESC);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS works_source_unique_idx
  ON works (source_platform, source_id)
  WHERE source_id IS NOT NULL;

-- Event discovery
CREATE INDEX CONCURRENTLY IF NOT EXISTS online_events_discovery_idx
  ON online_events (locale, nature, end_time DESC, start_time ASC, published_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS offline_events_discovery_idx
  ON offline_events (locale, nature, end_time DESC, start_time ASC, published_at DESC);

-- Admin audit, sync logs, quality scans
CREATE INDEX CONCURRENTLY IF NOT EXISTS admin_audit_logs_filters_idx
  ON admin_audit_logs (created_at DESC, action, status, target_collection, actor_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS sync_logs_retry_idx
  ON sync_logs (stage, status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS content_quality_open_idx
  ON content_quality_issues (status, severity, collection, detected_at DESC);

-- Internal rate limits and cron locks
CREATE INDEX CONCURRENTLY IF NOT EXISTS rate_limit_records_scope_reset_idx
  ON rate_limit_records (scope, reset_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS job_locks_until_idx
  ON job_locks (locked_until);
```

If Supabase does not allow `CONCURRENTLY` inside a transaction, run each statement separately in the SQL editor.
