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
assertExists('docs/en/README.md')
assertExists('docs/en/deployment.md')
assertExists('docs/ja/README.md')
assertExists('docs/ja/deployment.md')
assertMissing('README_en.md')
assertMissing('docs/deployment.md')

assertContains('backend/.env.example', 'ADMIN_PANEL_ALLOWED_ROLES=')
assertContains('backend/.env.example', 'PANEL_INTERNAL_TOKEN=')
assertContains('frontend/.env.example', 'API_TIMEOUT_MS=')
assertContains('backend/src/api/panel/controllers/panel.ts', "readOnly: true")
assertContains('backend/src/api/panel/controllers/panel.ts', 'PANEL_INTERNAL_TOKEN')
assertContains('frontend/src/app/api/image-proxy/route.ts', "urlObj.protocol !== 'https:'")
assertContains('frontend/src/app/api/image-proxy/route.ts', "startsWith('image/')")
assertContains('frontend/src/lib/sanitize.ts', "FORBID_ATTR: ['style']")
assertContains('backend/src/api/sync-log/content-types/sync-log/schema.json', '"retry"')
assertContains('frontend/src/app/sitemap.ts', 'sitemapEntry')

console.log('Regression checks passed')
