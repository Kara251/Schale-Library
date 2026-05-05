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
  'ADMIN_PATH',
  'STRAPI_CORS_ORIGINS',
  'STRAPI_ADMIN_WAF_CONFIRMED',
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

function normalizePath(value) {
  const path = String(value || '').trim()
  return path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path
}

function splitList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function hasOnlyHttpsOrigins(value) {
  const origins = splitList(value)
  if (origins.length === 0 || origins.includes('*')) {
    return false
  }

  return origins.every((origin) => {
    try {
      return new URL(origin).protocol === 'https:'
    } catch {
      return false
    }
  })
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

  const adminPath = normalizePath(process.env.ADMIN_PATH)
  if (!adminPath.startsWith('/') || adminPath === '/admin') {
    fail('Production ADMIN_PATH must be a non-default absolute path, for example /strapi-console-<random>.')
  }

  if (process.env.STRAPI_ADMIN_WAF_CONFIRMED !== 'true') {
    fail('Production Strapi Admin requires STRAPI_ADMIN_WAF_CONFIRMED=true after configuring deployment-layer WAF/rate limits.')
  }

  if (!hasOnlyHttpsOrigins(process.env.STRAPI_CORS_ORIGINS)) {
    fail('Production STRAPI_CORS_ORIGINS must contain HTTPS origins only and must not include *.')
  }
}

const cloudinaryValues = [process.env.CLOUDINARY_NAME, process.env.CLOUDINARY_KEY, process.env.CLOUDINARY_SECRET]
if (cloudinaryValues.some(Boolean) && !cloudinaryValues.every(Boolean)) {
  fail('CLOUDINARY_NAME, CLOUDINARY_KEY, and CLOUDINARY_SECRET must be configured together.')
}
if (process.env.NODE_ENV === 'production' && !cloudinaryValues.every((value) => !isPlaceholder(value))) {
  fail('Formal production deployments require CLOUDINARY_NAME, CLOUDINARY_KEY, and CLOUDINARY_SECRET.')
}

if (process.env.PANEL_INTERNAL_TOKEN && process.env.FRONTEND_PANEL_INTERNAL_TOKEN && process.env.PANEL_INTERNAL_TOKEN !== process.env.FRONTEND_PANEL_INTERNAL_TOKEN) {
  fail('PANEL_INTERNAL_TOKEN and FRONTEND_PANEL_INTERNAL_TOKEN do not match.')
}

if (!process.exitCode) {
  console.log('[verify:deploy] Deployment environment looks usable.')
}
