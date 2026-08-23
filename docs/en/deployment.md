# Deployment

## Architecture (after the 2026-08 migration)

```
bakivo.com (Cloudflare zone)
├── Frontend      Next.js 16 (OpenNext on Workers; migration prep is ready, see below)
├── Content API   server/ Hono Worker + D1 (public REST + /panel panel API)
├── Uploads       R2 bucket schale-uploads
├── Resource page drive.bakivo.com (OpenList, embedded via iframe)
└── DNS/CDN       Cloudflare
```

Strapi / PostgreSQL(Neon) / Cloudinary / Render / Vercel / RSSHub are all retired.

## First deployment steps

### 1. Create D1 and R2

```bash
cd server
wrangler d1 create schale_db          # note the database_id and write it into wrangler.toml
wrangler r2 bucket create schale-uploads
wrangler d1 migrations apply schale_db --remote
```

### 2. Set secrets

```bash
cd server
wrangler secret put SESSION_SECRET        # random 32+ bytes
wrangler secret put PANEL_INTERNAL_TOKEN  # token shared between frontend and backend (if internal rate limiting is enabled)
```

### 3. Deploy the Worker

```bash
cd server && wrangler deploy
# Note the workers.dev domain, bind it to the bakivo.com/api subpath or a dedicated subdomain (route configured in the CF Dashboard)
```

### 4. The first maintainer account

After setting the environment variables once, trigger any request (bootstrap is idempotent):

```bash
wrangler secret put BOOTSTRAP_ADMIN_USERNAME
wrangler secret put BOOTSTRAP_ADMIN_PASSWORD   # ≥16 chars
# After triggering a single /panel request, delete both secrets
```

### 5. Data migration (old Strapi → D1)

```bash
# a. Export from the old Neon PG (do this while the old stack is still running)
# b. Transform + generate the 301/external-redirect mapping table
cd server && node --experimental-strip-types scripts/transform.ts <export dir> /tmp/out
# c. Load into D1
node --experimental-strip-types scripts/load-d1.ts /tmp/out --remote
```

### 6. Frontend

```bash
cd frontend
# The OpenNext migration has one confirmed blocker: proxy.ts is a Node runtime middleware,
# which OpenNext v1.20 does not yet support. After switching to the Edge runtime:
pnpm deploy
```

Transition period before the migration completes: the frontend can stay on Vercel, with `NEXT_PUBLIC_API_URL` pointing at the new Worker.

## Backups

- D1 time travel: 30-day point-in-time recovery (CF Dashboard → D1 → Time Travel)
- Cold backups: `wrangler d1 export schale_db --remote --output backup-$(date +%F).sql`, weekly via cron recommended

## Environment variables and secrets inventory

| Variable | Location | Purpose |
|------|------|------|
| SESSION_SECRET | Worker secret | Session signing |
| PANEL_INTERNAL_TOKEN | Worker secret | Internal rate-limiting token (optional) |
| BOOTSTRAP_ADMIN_USERNAME/PASSWORD | Temporary secrets | First maintainer |
| NEXT_PUBLIC_API_URL | Frontend env | Content API base URL |
| NEXT_PUBLIC_SITE_URL | Frontend env | Site URL (sitemap/OG) |

## Security baseline (inherited from audit remediation)

- Session cookies: httpOnly + Secure + SameSite=Strict, 8h TTL, immediate revocation via table lookup
- Passwords: PBKDF2-SHA256 with 100k iterations (100000 is the Workers WebCrypto ceiling; higher throws NotSupportedError)
- Sessions: the sessions table stores the SHA-256 digest of the token, never the token itself
- Login rate limiting: CF-Connecting-IP, 30 attempts per 10 minutes
- Uploads: magic-number sniffing (jpeg/png/webp/gif), SVG disabled, tiered 4/8/12MB limits
- CSV export: formula injection neutralized
