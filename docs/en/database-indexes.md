# Database Indexes

## D1 (SQLite) index inventory

Indexes are defined with the migrations in `server/migrations/0001_baseline.sql`:

| Table | Index | Purpose |
|----|------|------|
| creators | idx_creators_featured(is_featured, featured_priority) | Homepage featured/list sorting |
| events | idx_events_start(kind, start_time DESC) | Event list sorting |
| events | idx_events_published_start(published_at, start_time DESC) | Published filter + sort |
| announcements | idx_announcements_created(created_at DESC) | Announcement list |
| research_entries | idx_research_entries_slug(slug) | slug detail lookups |
| admin_audit_logs | idx_audit_created(created_at) | cron/manual cleanup |
| rate_limit_records | idx_rate_limit_reset(reset_at), idx_rate_limit_scope_key(scope, identifier, key) | Rate-limit window queries + cleanup |
| sessions | idx_sessions_expires(expires_at) | Expired session cleanup |
| works | idx_works_published / idx_works_featured / idx_works_author | works lifetime queries (table retired after W5) |

## Design principles (inherited from the performance audit conclusions)

- Cleanup-style queries (created_at / reset_at / expires_at) must be backed by single-column indexes
- List queries use shallow loading, detail pages use deep loading — the two are kept separate (populate is explicitly controlled by routes)
- No FTS: search uses LIKE containsi (sufficient at this content volume; CJK tokenization would bring no benefit)

## Backup and restore

- Time travel: 30-day point-in-time recovery (CF Dashboard)
- Cold backups: `wrangler d1 export schale_db --remote --output backup.sql`
