# Security Notes

[简体中文](../zh-Hans/security.md) | [日本語](../ja/security.md)

## Dependency Audit Status

The axios high advisories from `pnpm audit --prod` are handled by minimal pnpm overrides. The current audit still reports these transitive advisories through Strapi packages:

- `lodash` via `@strapi/plugin-users-permissions > @strapi/design-system`.
- `vite` via `@strapi/strapi`.
- `uuid` via `@strapi/plugin-users-permissions > grant > request-oauth`.
- `elliptic` via `@strapi/plugin-users-permissions > jwk-to-pem`.

Applied overrides:

- `@strapi/admin > axios` is pinned to `1.16.0`.
- `@strapi/cloud-cli > axios` is pinned to `1.16.0`.

Some patched versions reported by the audit database are not currently resolvable from npm for this dependency tree: `lodash >=4.18.0`, `vite 6.4.2`, and `uuid >=14.0.0`; `elliptic` is still constrained by the upstream chain. `vite@7.2.7` builds but introduces new Vite high advisories, and `vite@7.3.2` is not currently resolvable, so no Vite override is kept. Do not force these overrides unless Strapi supports them and the Strapi Admin, frontend, and backend builds all pass.

For formal production, do not expose Strapi Admin publicly while any high advisory remains. Wait for upstream fixes, confirm a safe override, or downgrade Strapi Admin to an internal endpoint protected by network access controls.

## Compensating Controls

- The custom admin panel fails closed in production unless `ADMIN_PANEL_ALLOWED_ROLES` is configured.
- Internal rate-limit endpoints require `PANEL_INTERNAL_TOKEN` in production.
- The public image proxy is restricted to HTTPS Bilibili image CDN hosts, image content types, size limits, and request timeouts.
- Sync logs and audit logs are read-only through the custom panel API.
- RSSHub sync uses bounded concurrency and parser-based RSS handling.
- Public Strapi Admin exposure requires a non-default `ADMIN_PATH`, plus deployment-layer WAF / rate limits before setting `STRAPI_ADMIN_WAF_CONFIRMED=true`.
- Production CORS is explicitly controlled by `STRAPI_CORS_ORIGINS` instead of an open default.

Review these advisories again after each Strapi upgrade.
