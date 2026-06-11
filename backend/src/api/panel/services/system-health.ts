function getEnvFlag(name: string) {
  const value = process.env[name]
  if (value === undefined) {
    return undefined
  }

  return value === 'true' || value === '1'
}

function getPlaceholderStatus(value?: string) {
  const normalized = String(value || '').trim().toLowerCase()
  return !normalized || normalized === 'change-me' || normalized === 'change-me-too' || normalized.includes('tobemodified')
}

function createHealthCheck(key: string, label: string, ok: boolean, message: string, warning = false) {
  return {
    key,
    label,
    status: ok ? 'ok' : warning ? 'warning' : 'error',
    message,
  }
}

async function checkUsersPermissionsRole(type: string) {
  return strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type },
    populate: ['permissions'],
  })
}

async function getUnsafeRolePermissions(type: string) {
  const role = await checkUsersPermissionsRole(type)
  const permissions = Array.isArray(role?.permissions) ? role.permissions : []

  return permissions
    .filter((permission: any) => permission?.enabled)
    .map((permission: any) => String(permission.action || ''))
    .filter((action: string) => {
      const isCoreRead = /\.(find|findOne)$/.test(action)
      const isUserSelfRead = action.includes('plugin::users-permissions.user.me')
      const isAuthAction = action.includes('plugin::users-permissions.auth.')
      return !isCoreRead && !isUserSelfRead && !isAuthAction
    })
}

async function checkRssHubHealth() {
  const service = strapi.service('api::bilibili-subscription.bilibili-subscription')
  const instance = (service.getRssHubInstances?.() || [process.env.RSSHUB_URL || 'http://localhost:1200'])[0]
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3000)

  try {
    const response = await fetch(instance, { signal: controller.signal })
    return {
      instance,
      ok: response.ok || response.status === 404,
      message: `RSSHub ${instance} responded with ${response.status}`,
    }
  } catch (error) {
    return {
      instance,
      ok: false,
      message: `RSSHub ${instance} unavailable: ${(error as Error).message}`,
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function getSystemHealth() {
  const requiredEnv = [
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
  const missingEnv = requiredEnv.filter((name) => getPlaceholderStatus(process.env[name]))
  const checks: Array<Record<string, unknown>> = []

  checks.push(createHealthCheck(
    'production-env',
    'Production secrets',
    missingEnv.length === 0 || process.env.NODE_ENV !== 'production',
    missingEnv.length === 0 ? 'Required production secrets are configured.' : `Missing or placeholder values: ${missingEnv.join(', ')}`,
    process.env.NODE_ENV !== 'production'
  ))

  const databaseClient = process.env.DATABASE_CLIENT || 'sqlite'
  checks.push(createHealthCheck(
    'database',
    'Database',
    process.env.NODE_ENV !== 'production' || databaseClient === 'postgres' || getEnvFlag('ALLOW_PRODUCTION_SQLITE') === true,
    `DATABASE_CLIENT=${databaseClient}`,
    process.env.NODE_ENV !== 'production'
  ))

  const cloudinaryValues = [process.env.CLOUDINARY_NAME, process.env.CLOUDINARY_KEY, process.env.CLOUDINARY_SECRET]
  const cloudinaryConfigured = cloudinaryValues.every(Boolean)
  const cloudinaryPartial = cloudinaryValues.some(Boolean) && !cloudinaryConfigured
  checks.push(createHealthCheck(
    'cloudinary',
    'Upload provider',
    !cloudinaryPartial,
    cloudinaryConfigured ? 'Cloudinary is configured.' : cloudinaryPartial ? 'Cloudinary variables must be configured together.' : 'Using local upload provider.',
    !cloudinaryConfigured && !cloudinaryPartial
  ))

  const allowedRoles = (process.env.ADMIN_PANEL_ALLOWED_ROLES || '')
    .split(',')
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean)
  const missingRoles: string[] = []
  for (const role of allowedRoles) {
    if (!await checkUsersPermissionsRole(role)) {
      missingRoles.push(role)
    }
  }
  checks.push(createHealthCheck(
    'panel-roles',
    'Panel roles',
    allowedRoles.length > 0 && missingRoles.length === 0,
    allowedRoles.length === 0 ? 'ADMIN_PANEL_ALLOWED_ROLES is empty.' : missingRoles.length > 0 ? `Missing roles: ${missingRoles.join(', ')}` : `Allowed roles exist: ${allowedRoles.join(', ')}`
  ))

  const [publicUnsafe, authenticatedUnsafe] = await Promise.all([
    getUnsafeRolePermissions('public').catch(() => []),
    getUnsafeRolePermissions('authenticated').catch(() => []),
  ])
  checks.push(createHealthCheck(
    'public-permissions',
    'Public permissions',
    publicUnsafe.length === 0,
    publicUnsafe.length > 0 ? `Unsafe public actions: ${publicUnsafe.join(', ')}` : 'No unsafe public write actions detected.'
  ))
  checks.push(createHealthCheck(
    'authenticated-permissions',
    'Authenticated permissions',
    authenticatedUnsafe.length === 0,
    authenticatedUnsafe.length > 0 ? `Unsafe authenticated actions: ${authenticatedUnsafe.join(', ')}` : 'No unsafe authenticated write actions detected.'
  ))

  const rss = await checkRssHubHealth()
  checks.push(createHealthCheck('rsshub', 'RSSHub', rss.ok, rss.message, true))

  return {
    status: checks.some((check) => check.status === 'error') ? 'error' : checks.some((check) => check.status === 'warning') ? 'warning' : 'ok',
    generatedAt: new Date().toISOString(),
    checks,
  }
}
