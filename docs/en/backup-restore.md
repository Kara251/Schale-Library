# Backup and Restore

## D1 backups

### Point-in-time recovery (preferred)

Cloudflare D1 has built-in time travel: point-in-time recovery to any moment within the last 30 days.

```
CF Dashboard → Storage & Databases → D1 → schale_db → Time Travel
# Or via CLI:
wrangler d1 time-travel restore schale_db --remote --timestamp="2026-08-22T12:00:00Z"
```

### Cold backups (weekly recommended)

```bash
wrangler d1 export schale_db --remote --output backup-$(date +%F).sql
# Restore:
wrangler d1 execute schale_db --remote --file=backup-2026-08-22.sql
```

## R2 media backups

Uploaded objects live in the `schale-uploads` bucket. Enable R2 versioning, or periodically `rclone sync` to a second bucket.

## Restore drill checklist

1. `wrangler d1 execute schale_db --remote --file=<backup>.sql` (rehearse against the staging database first)
2. Spot checks: creators/students/research_entries row counts, redirect_map integrity
3. Frontend smoke test: one page each for homepage/creators/research archive/search
