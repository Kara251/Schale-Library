import { readFileSync } from 'node:fs'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

function assertContains(path, expected) {
  const content = read(path)
  if (!content.includes(expected)) {
    throw new Error(`${path} is missing expected content: ${expected}`)
  }
}

function assertNotContains(path, unexpected) {
  const content = read(path)
  if (content.includes(unexpected)) {
    throw new Error(`${path} still contains unexpected content: ${unexpected}`)
  }
}

function assertExists(path) {
  if (!existsSync(join(root, path))) {
    throw new Error(`${path} does not exist`)
  }
}

function assertMissing(path) {
  if (existsSync(join(root, path))) {
    throw new Error(`${path} should not exist`)
  }
}

assertExists('docs/zh-Hans/README.md')
assertExists('docs/zh-Hans/deployment.md')
assertExists('docs/zh-Hans/backup-restore.md')
assertExists('docs/zh-Hans/security.md')
assertExists('docs/en/README.md')
assertExists('docs/en/deployment.md')
assertExists('docs/en/backup-restore.md')
assertExists('docs/en/security.md')
assertExists('docs/ja/README.md')
assertExists('docs/ja/deployment.md')
assertExists('docs/ja/backup-restore.md')
assertExists('docs/ja/security.md')
assertExists('.github/SECURITY.md')
assertExists('.github/workflows/ci.yml')
assertExists('playwright.config.ts')
assertExists('tests/e2e/public-smoke.spec.ts')
assertExists('scripts/verify-deploy.mjs')
assertExists('scripts/seed-basics.mjs')
assertMissing('README_en.md')
assertMissing('docs/deployment.md')
assertMissing('SECURITY.md')
assertMissing('backend/README.md')
assertMissing('frontend/README.md')

assertContains('backend/.env.example', 'ADMIN_PANEL_ALLOWED_ROLES=')
assertContains('backend/.env.example', 'PANEL_INTERNAL_TOKEN=')
assertContains('backend/.env.example', 'ADMIN_PATH=')
assertContains('backend/.env.example', 'STRAPI_CORS_ORIGINS=')
assertContains('backend/.env.example', 'STRAPI_ADMIN_WAF_CONFIRMED=')
assertContains('backend/.env.example', 'CLOUDINARY_NAME=')
assertContains('frontend/.env.example', 'API_TIMEOUT_MS=')
assertContains('package.json', '"@strapi/admin>axios"')
assertContains('package.json', '"@strapi/cloud-cli>axios"')
assertContains('backend/config/admin.ts', 'ADMIN_PATH')
assertContains('backend/config/middlewares.ts', 'STRAPI_CORS_ORIGINS')
assertContains('backend/config/middlewares.ts', 'assertProductionCorsOrigins')
assertContains('backend/src/index.ts', 'STRAPI_ADMIN_WAF_CONFIRMED')
assertContains('scripts/verify-deploy.mjs', 'ADMIN_PATH')
assertContains('scripts/verify-deploy.mjs', 'Formal production deployments require CLOUDINARY')
assertContains('scripts/verify-deploy.mjs', 'HTTPS origins only')
assertContains('.github/workflows/ci.yml', 'ADMIN_PATH: /strapi-console-ci')
assertContains('.github/workflows/ci.yml', 'STRAPI_ADMIN_WAF_CONFIRMED: true')
assertContains('.github/workflows/ci.yml', 'CLOUDINARY_SECRET: ci-cloudinary-secret')
assertContains('playwright.config.ts', 'workers: 1')
assertContains('playwright.config.ts', 'pnpm --dir frontend start')
assertContains('backend/src/api/panel/controllers/panel.ts', "readOnly: true")
assertContains('backend/src/api/panel/controllers/panel.ts', 'PANEL_INTERNAL_TOKEN')
assertContains('backend/src/api/panel/controllers/panel.ts', 'recordAdminAuditLog')
assertContains('backend/src/api/panel/controllers/panel.ts', 'getSystemHealth')
assertContains('backend/src/api/panel/controllers/panel.ts', 'scanContentQuality')
assertContains('backend/src/api/panel/controllers/panel.ts', 'runBulkAction')
assertContains('backend/src/api/work/content-types/work/schema.json', '"isFeatured"')
assertContains('backend/src/api/work/content-types/work/schema.json', '"featuredPriority"')
assertContains('backend/src/api/panel/controllers/panel.ts', 'featured-missing-image')
assertContains('backend/src/api/panel/controllers/panel.ts', 'set-featured-priority')
assertContains('frontend/src/lib/api.ts', 'getFeaturedWorks')
assertContains('frontend/src/app/[locale]/online-events/page.tsx', 'searchParams')
assertContains('frontend/src/app/[locale]/offline-events/page.tsx', 'searchParams')
assertContains('backend/src/api/admin-audit-log/content-types/admin-audit-log/schema.json', '"admin_audit_logs"')
assertContains('backend/src/api/content-quality-issue/content-types/content-quality-issue/schema.json', '"content_quality_issues"')
assertContains('backend/src/api/job-lock/content-types/job-lock/schema.json', '"job_locks"')
assertContains('frontend/src/app/api/image-proxy/route.ts', "urlObj.protocol !== 'https:'")
assertContains('frontend/src/app/api/image-proxy/route.ts', "startsWith('image/')")
assertContains('frontend/src/app/api/image-proxy/route.ts', 'createLimitedImageStream')
assertContains('frontend/src/lib/sanitize.ts', "FORBID_ATTR: ['style']")
assertContains('backend/src/api/sync-log/content-types/sync-log/schema.json', '"retry"')
assertContains('backend/src/api/sync-log/content-types/sync-log/schema.json', '"stage"')
assertContains('frontend/src/app/[locale]/manage/admin-audit-logs/page.tsx', 'Audit Logs')
assertContains('frontend/src/app/[locale]/manage/system-health/page.tsx', 'System Health')
assertContains('frontend/src/app/[locale]/manage/content-quality/page.tsx', 'Content Quality')
assertContains('frontend/src/app/[locale]/manage/bulk-actions/page.tsx', 'Bulk Actions')
assertContains('frontend/src/app/sitemap.ts', 'sitemapEntry')
assertContains('frontend/src/app/sitemap.ts', 'getAllCollectionItems')
assertContains('frontend/src/proxy.ts', 'x-schale-locale')
assertContains('frontend/src/proxy.ts', 'firstSegment !== pathnameLocale')
assertContains('frontend/src/app/layout.tsx', 'getHtmlLang')
assertContains('frontend/src/app/layout.tsx', 'lang={htmlLang}')
assertContains('backend/config/cron-tasks.ts', 'locked_until')
assertContains('backend/config/cron-tasks.ts', 'where({ id: lock.id, owner: lock.owner })')
assertContains('backend/src/api/panel/controllers/panel.ts', 'RATE_LIMIT_TABLE')
assertContains('backend/src/api/panel/controllers/panel.ts', 'transaction(async')
assertContains('backend/src/api/panel/controllers/panel.ts', 'QUALITY_SCAN_PAGE_SIZE')
assertContains('backend/src/api/panel/controllers/panel.ts', 'replacementDetectedAt')
assertNotContains('backend/src/api/panel/controllers/panel.ts', 'limit: 1000')
assertContains('backend/src/api/panel/controllers/panel.ts', 'AUDIT_EXPORT_MAX_ROWS')
assertContains('backend/src/api/panel/controllers/panel.ts', 'X-Export-Truncated')
assertContains('backend/src/api/bilibili-subscription/services/bilibili-subscription.ts', 'processDueRetries')
assertContains('backend/src/api/bilibili-subscription/services/bilibili-subscription.ts', 'scheduleSubscriptionRetry')
assertNotContains('backend/src/api/bilibili-subscription/services/bilibili-subscription.ts', '5 * 60 * 1000); // 5分钟')

console.log('Regression checks passed')
