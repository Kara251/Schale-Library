# Production Readiness

[简体中文](../zh-Hans/production-readiness.md) | [日本語](../ja/production-readiness.md)

## Automated Checks

The project now has two pre-deployment checks:

```bash
pnpm verify:deploy
pnpm audit:prod
```

`verify:deploy` checks production environment variables, PostgreSQL, non-default Strapi Admin path, HTTPS CORS, Cloudinary, and deployment-layer WAF confirmation.

`audit:prod` runs `pnpm audit --prod --json` and allows only the currently documented upstream Strapi transitive advisories. New advisories, path changes, or severity changes fail the gate. If `STRAPI_ADMIN_PUBLIC=true` is set, any high advisory fails the gate, so Strapi Admin should not currently be exposed publicly.

## Staging Acceptance

Before formal production launch, run this against a temporary Supabase database and staging domains:

```bash
NODE_ENV=production pnpm verify:staging
```

In addition to the `verify:deploy` requirements, explicitly confirm:

```env
STAGING_STRAPI_ADMIN_LOGIN_VERIFIED=true
STAGING_CUSTOM_PANEL_LOGIN_VERIFIED=true
STAGING_CONTENT_CREATE_VERIFIED=true
STAGING_MEDIA_UPLOAD_VERIFIED=true
STAGING_RSS_SYNC_VERIFIED=true
STAGING_BACKUP_EXPORT_VERIFIED=true
STAGING_BACKUP_RESTORE_VERIFIED=true
STAGING_ADMIN_RECOVERY_VERIFIED=true
STAGING_CRON_SINGLE_INSTANCE_VERIFIED=true
```

These variables are not security bypasses; they turn manual acceptance into a failing deployment gate. Use `STAGING_ALLOW_LOCAL_URLS=true` only for local dry runs.

## Current Launch Judgment

- The frontend and custom panel are suitable for demo deployment.
- Formal production must use PostgreSQL/Supabase, not SQLite.
- Missing Cloudinary variables should disqualify formal production.
- While `pnpm audit:prod` still contains the upstream lodash high advisory, Strapi Admin should not be exposed publicly.
