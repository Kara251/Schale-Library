# Deployment Notes

## Backend runtime

- Run Strapi on a Node.js runtime with PostgreSQL.
- Deploy the Next.js frontend separately to any compatible frontend platform.
- Do not run the Strapi backend on Cloudflare Workers or D1 for production. Strapi needs a Node server runtime and a supported SQL client; D1 is not a supported Strapi database target.
- SQLite is intended for local development and disposable demos only. The backend blocks production SQLite unless `ALLOW_PRODUCTION_SQLITE=true`.

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

Small serverless instances should keep the pool small. If the provider uses transaction pooling, use the provider's pooler URL and keep `DATABASE_POOL_MIN=0`.

## Required production secrets

Production startup fails when any of these are missing or still set to placeholders:

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

## Custom panel maintainer account recovery

The custom panel at `/{locale}/manage` uses the Strapi users-permissions user table, not the Strapi admin user table.

To create or restore a maintainer account, set these temporarily for one deployment:

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

Remove `ADMIN_PANEL_BOOTSTRAP_PASSWORD` after you confirm login works.

## Strapi admin panel

The Strapi built-in admin panel uses Strapi's separate admin user table. Keep `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, and `ENCRYPTION_KEY` stable across deployments. If you rebuild a disposable database, create the first Strapi admin user from the Strapi admin UI again.

## Cloudflare recommendation

Cloudflare is a good fit for:

- DNS and CDN;
- static assets;
- the Next.js frontend when the app does not rely on unsupported Node APIs;
- lightweight edge route handlers.

Cloudflare Workers and D1 are not a supported target for the Strapi backend in this project. Keep Strapi on Node.js with PostgreSQL, and use Cloudflare only for the parts that fit its runtime model.
