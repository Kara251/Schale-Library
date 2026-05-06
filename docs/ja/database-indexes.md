# PostgreSQL インデックス推奨

[简体中文](../zh-Hans/database-indexes.md) | [English](../en/database-indexes.md)

これらのインデックスは、staging または本番のコンテンツ量が増えた後の PostgreSQL/Supabase 向けです。まず一時 DB で実行し、クエリプランを確認してから、本番の低負荷時間帯に適用してください。Strapi の migration やアップグレード後は、実際のカラム名が SQL と一致していることを確認してください。

```sql
-- 作品一覧、注目推薦、RSS 重複排除
CREATE INDEX CONCURRENTLY IF NOT EXISTS works_locale_published_idx
  ON works (locale, published_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS works_featured_idx
  ON works (is_featured, featured_until, featured_priority DESC, published_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS works_filters_idx
  ON works (nature, work_type, source_platform, is_active, published_at DESC);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS works_source_unique_idx
  ON works (source_platform, source_id)
  WHERE source_id IS NOT NULL;

-- イベント発見
CREATE INDEX CONCURRENTLY IF NOT EXISTS online_events_discovery_idx
  ON online_events (locale, nature, end_time DESC, start_time ASC, published_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS offline_events_discovery_idx
  ON offline_events (locale, nature, end_time DESC, start_time ASC, published_at DESC);

-- 管理監査、同期ログ、品質スキャン
CREATE INDEX CONCURRENTLY IF NOT EXISTS admin_audit_logs_filters_idx
  ON admin_audit_logs (created_at DESC, action, status, target_collection, actor_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS sync_logs_retry_idx
  ON sync_logs (stage, status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS content_quality_open_idx
  ON content_quality_issues (status, severity, collection, detected_at DESC);

-- 内部 rate limit と cron lock
CREATE INDEX CONCURRENTLY IF NOT EXISTS rate_limit_records_scope_reset_idx
  ON rate_limit_records (scope, reset_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS job_locks_until_idx
  ON job_locks (locked_until);
```

Supabase が transaction 内の `CONCURRENTLY` を許可しない場合は、SQL editor で 1 文ずつ実行してください。
