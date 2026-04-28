const requiredBackend = [
  'APP_KEYS',
  'API_TOKEN_SALT',
  'ADMIN_JWT_SECRET',
  'TRANSFER_TOKEN_SALT',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'ADMIN_PANEL_ALLOWED_ROLES',
  'PANEL_INTERNAL_TOKEN',
  'RATE_LIMIT_HASH_SECRET',
]

const requiredFrontend = [
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_SITE_URL',
  'PANEL_INTERNAL_TOKEN',
]

function isPlaceholder(value) {
  const normalized = String(value || '').trim().toLowerCase()
  return !normalized || normalized === 'change-me' || normalized === 'change-me-too' || normalized.includes('tobemodified')
}

function fail(message) {
  console.error(`[verify:deploy] ${message}`)
  process.exitCode = 1
}

for (const key of requiredBackend) {
  if (isPlaceholder(process.env[key])) {
    fail(`Missing backend variable: ${key}`)
  }
}

for (const key of requiredFrontend) {
  if (isPlaceholder(process.env[key])) {
    fail(`Missing frontend variable: ${key}`)
  }
}

if (process.env.NODE_ENV === 'production') {
  const databaseClient = process.env.DATABASE_CLIENT || 'sqlite'
  if (databaseClient !== 'postgres' && process.env.ALLOW_PRODUCTION_SQLITE !== 'true') {
    fail('Production deployment must use PostgreSQL unless ALLOW_PRODUCTION_SQLITE=true is explicitly set for disposable demos.')
  }

  if (process.env.CRON_ENABLED !== 'true' && process.env.CRON_ENABLED !== 'false') {
    fail('Production deployment must explicitly set CRON_ENABLED=true or CRON_ENABLED=false.')
  }
}

const cloudinaryValues = [process.env.CLOUDINARY_NAME, process.env.CLOUDINARY_KEY, process.env.CLOUDINARY_SECRET]
if (cloudinaryValues.some(Boolean) && !cloudinaryValues.every(Boolean)) {
  fail('CLOUDINARY_NAME, CLOUDINARY_KEY, and CLOUDINARY_SECRET must be configured together.')
}

if (process.env.PANEL_INTERNAL_TOKEN && process.env.FRONTEND_PANEL_INTERNAL_TOKEN && process.env.PANEL_INTERNAL_TOKEN !== process.env.FRONTEND_PANEL_INTERNAL_TOKEN) {
  fail('PANEL_INTERNAL_TOKEN and FRONTEND_PANEL_INTERNAL_TOKEN do not match.')
}

if (!process.exitCode) {
  console.log('[verify:deploy] Deployment environment looks usable.')
}
