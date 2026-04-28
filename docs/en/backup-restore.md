# Backup And Restore

[简体中文](../zh-Hans/backup-restore.md) | [日本語](../ja/backup-restore.md)

## PostgreSQL/Supabase Backup

Prefer Supabase automatic backups in production. For manual backups, export schema and data together:

```bash
pg_dump "$DATABASE_URL" --format=custom --file=schale-library.dump
```

Restore into a temporary database before replacing production:

```bash
pg_restore --clean --if-exists --no-owner --dbname "$RESTORE_DATABASE_URL" schale-library.dump
```

## Post-Restore Checks

- Confirm Strapi starts and `pnpm verify:deploy` passes.
- Sign in to `/{locale}/manage` and confirm the maintainer user still has a role from `ADMIN_PANEL_ALLOWED_ROLES`.
- Check work, student, announcement, online event, and offline event counts.
- Check Cloudinary or upload media URLs still resolve.

## Basic Seed Data

For an empty demo database, seed a small student baseline:

```bash
SEED_STRAPI_URL=https://api.example.com SEED_API_TOKEN=... pnpm seed:basics
```

The script is idempotent by student name and does not overwrite existing content.
