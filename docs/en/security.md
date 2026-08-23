# Security

## Current architecture (after the 2026-08 migration)

The security surface has been consolidated from "the Strapi platform plus a custom layer" into a fully custom Worker. Strapi-chain dependencies (axios/ajv patches, the admin panel's exposure surface, the poweredBy fingerprint) disappeared along with its retirement.

## Controls in place

| Control | Implementation |
|--------|------|
| Authentication | users table + PBKDF2-SHA256 (210k iterations, WebCrypto); sessions revoked immediately via D1 table lookup |
| Session cookie | httpOnly + Secure (production) + SameSite=Strict, 8h TTL |
| Panel authorization | All /panel write routes fail-closed session validation + role allowlist |
| Login rate limiting | CF-Connecting-IP (edge-trusted header), counted in D1, 30 attempts per 10 minutes |
| Input validation | Dual enforcement of collection allowlist + field allowlist; unregistered fields rejected with 400 |
| Uploads | Magic-number sniffing (jpeg/png/webp/gif), SVG disabled, tiered 4/8/12MB limits |
| CSV export | Cells starting with `= + - @` neutralized with a `'` prefix |
| Rich text | Frontend DOMPurify allowlist sanitization (retained from before) |
| External links | http(s) scheme allowlist (at both storage and render layers) |
| Audit | All write operations recorded in admin_audit_logs; export supports pagination and filtering |
| Startup assertions | Missing/placeholder secrets throw immediately (fail-fast spirit retained) |

## Known residual issues (low risk, accepted)

- The frontend CSP still contains unsafe-inline/unsafe-eval (after the OpenNext migration, nonce-based tightening will be done by our own middleware, see plan S3)
- image-proxy allowlisted domains do not restrict ports (Bilibili CDN uses fixed domains; the attack surface is very narrow)

## Dependency auditing

Strapi-chain advisories disappeared with its retirement; just run `pnpm audit` as usual — no allowlist script needed.
