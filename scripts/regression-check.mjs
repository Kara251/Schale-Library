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
assertExists('docs/en/README.md')
assertExists('docs/en/deployment.md')
assertExists('docs/en/backup-restore.md')
assertExists('docs/ja/README.md')
assertExists('docs/ja/deployment.md')
assertExists('docs/ja/backup-restore.md')
assertExists('.github/workflows/ci.yml')
assertExists('playwright.config.ts')
assertExists('tests/e2e/public-smoke.spec.ts')
assertExists('scripts/verify-deploy.mjs')
assertExists('scripts/seed-basics.mjs')
assertMissing('README_en.md')
assertMissing('docs/deployment.md')

assertContains('backend/.env.example', 'ADMIN_PANEL_ALLOWED_ROLES=')
assertContains('backend/.env.example', 'PANEL_INTERNAL_TOKEN=')
assertContains('frontend/.env.example', 'API_TIMEOUT_MS=')
assertContains('backend/src/api/panel/controllers/panel.ts', "readOnly: true")
assertContains('backend/src/api/panel/controllers/panel.ts', 'PANEL_INTERNAL_TOKEN')
assertContains('backend/src/api/panel/controllers/panel.ts', 'recordAdminAuditLog')
assertContains('backend/src/api/panel/controllers/panel.ts', 'getSystemHealth')
assertContains('backend/src/api/panel/controllers/panel.ts', 'scanContentQuality')
assertContains('backend/src/api/panel/controllers/panel.ts', 'runBulkAction')
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

console.log('Regression checks passed')
