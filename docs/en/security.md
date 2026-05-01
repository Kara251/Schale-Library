# Security Notes

[简体中文](../zh-Hans/security.md) | [日本語](../ja/security.md)

## Dependency Audit Status

`pnpm audit --prod --audit-level moderate` currently reports transitive advisories through Strapi packages:

- `lodash` via `@strapi/plugin-users-permissions > @strapi/design-system`
- `vite` via `@strapi/strapi`
- `uuid` via `@strapi/plugin-users-permissions > grant > request-oauth`

The patched versions reported by the audit database are not currently resolvable from npm for this dependency tree: `lodash >=4.18.0`, `vite 6.4.2`, and `uuid >=14.0.0`. Do not force these overrides unless Strapi supports them and both frontend/backend builds pass.

## Compensating Controls

- The custom admin panel fails closed in production unless `ADMIN_PANEL_ALLOWED_ROLES` is configured.
- Internal rate-limit endpoints require `PANEL_INTERNAL_TOKEN` in production.
- The public image proxy is restricted to HTTPS Bilibili image CDN hosts, image content types, size limits, and request timeouts.
- Sync logs and audit logs are read-only through the custom panel API.
- RSSHub sync uses bounded concurrency and parser-based RSS handling.

Review these advisories again after each Strapi upgrade.
