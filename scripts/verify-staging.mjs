import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

const requiredConfirmations = [
  'STAGING_STRAPI_ADMIN_LOGIN_VERIFIED',
  'STAGING_CUSTOM_PANEL_LOGIN_VERIFIED',
  'STAGING_CONTENT_CREATE_VERIFIED',
  'STAGING_MEDIA_UPLOAD_VERIFIED',
  'STAGING_RSS_SYNC_VERIFIED',
  'STAGING_BACKUP_EXPORT_VERIFIED',
  'STAGING_BACKUP_RESTORE_VERIFIED',
  'STAGING_ADMIN_RECOVERY_VERIFIED',
  'STAGING_CRON_SINGLE_INSTANCE_VERIFIED',
]

function fail(message) {
  console.error(`[verify:staging] ${message}`)
  process.exitCode = 1
}

function isTrue(value) {
  return String(value || '').trim() === 'true'
}

function isLocalUrl(value) {
  try {
    const url = new URL(String(value || ''))
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
  } catch {
    return false
  }
}

const deployCheck = spawnSync(process.execPath, ['scripts/verify-deploy.mjs'], {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
})

if (deployCheck.status !== 0) {
  fail('Deployment environment contract failed.')
}

if (process.env.NODE_ENV !== 'production') {
  fail('Run staging verification with NODE_ENV=production to match production startup rules.')
}

if (process.env.DATABASE_CLIENT !== 'postgres') {
  fail('Staging verification requires DATABASE_CLIENT=postgres.')
}

if (isTrue(process.env.ALLOW_PRODUCTION_SQLITE)) {
  fail('ALLOW_PRODUCTION_SQLITE must not be enabled for staging verification.')
}

if (!isTrue(process.env.STAGING_ALLOW_LOCAL_URLS)) {
  if (isLocalUrl(process.env.NEXT_PUBLIC_API_URL) || isLocalUrl(process.env.NEXT_PUBLIC_SITE_URL)) {
    fail('Staging verification should use deployed HTTPS URLs, not localhost. Set STAGING_ALLOW_LOCAL_URLS=true only for local dry runs.')
  }
}

for (const key of requiredConfirmations) {
  if (!isTrue(process.env[key])) {
    fail(`Missing staging acceptance confirmation: ${key}=true`)
  }
}

if (!process.exitCode) {
  console.log('[verify:staging] Staging acceptance checklist is complete.')
}
