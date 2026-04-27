# Deployment Notes

[简体中文](../zh-Hans/deployment.md) | [日本語](../ja/deployment.md)

## Backend Runtime

- Run the Strapi backend on a Node.js runtime with PostgreSQL.
- Deploy the Next.js frontend separately to any compatible platform.
- Do not deploy the Strapi backend to Cloudflare Workers or D1. Strapi needs a Node.js server runtime and a supported SQL client; D1 is not a Strapi database target for this project.
- SQLite is intended only for local development and temporary environments. The backend blocks production SQLite unless `ALLOW_PRODUCTION_SQLITE=true` is set explicitly.

## PostgreSQL

Use PostgreSQL for the Strapi backend:

```env
DATABASE_CLIENT=postgres
DATABASE_URL=postgres://...
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false
DATABASE_POOL_MIN=0
DATABASE_POOL_MAX=5
```

Small serverless instances should keep the pool small. If the database provider offers a pooled connection URL, use it and keep `DATABASE_POOL_MIN=0`.

## Required Production Secrets

Production startup fails if any of these variables are missing or still set to placeholders:

```env
APP_KEYS=
API_TOKEN_SALT=
ADMIN_JWT_SECRET=
TRANSFER_TOKEN_SALT=
JWT_SECRET=
ENCRYPTION_KEY=
ADMIN_PANEL_ALLOWED_ROLES=maintainer,admin
PANEL_INTERNAL_TOKEN=
RATE_LIMIT_HASH_SECRET=
```

`PANEL_INTERNAL_TOKEN` must be identical in the backend and frontend environments.

## Custom Panel Maintainer Recovery

The custom panel at `/{locale}/manage` uses the Strapi users-permissions user table, not the built-in Strapi admin user table.

To create or restore a maintainer account, temporarily set these variables for one deployment:

```env
ADMIN_PANEL_BOOTSTRAP_EMAIL=you@example.com
ADMIN_PANEL_BOOTSTRAP_USERNAME=maintainer
ADMIN_PANEL_BOOTSTRAP_PASSWORD=use-a-long-random-password
```

On startup, Strapi will:

- ensure the roles from `ADMIN_PANEL_ALLOWED_ROLES` exist;
- create or update the matching users-permissions user;
- assign the first allowed role to that user;
- unblock and confirm the user.

Remove `ADMIN_PANEL_BOOTSTRAP_PASSWORD` after login is confirmed.

## Built-In Strapi Admin Panel

The built-in Strapi admin panel uses a separate admin user table. Keep `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, and `ENCRYPTION_KEY` stable across deployments. If an empty database is rebuilt, create the first Strapi admin user from the Strapi admin UI again.

## Cloudflare

Cloudflare is suitable for:

- DNS and CDN;
- static assets;
- the Next.js frontend when it does not depend on incompatible Node APIs;
- lightweight edge route handlers.

Cloudflare Workers and D1 are not supported targets for the Strapi backend in this project. Keep the Strapi backend on Node.js with PostgreSQL, and use Cloudflare only for the parts that fit its runtime model.
