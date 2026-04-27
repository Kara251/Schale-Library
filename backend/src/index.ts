import type { Core } from '@strapi/strapi';

const PLACEHOLDER_VALUES = new Set(['', 'change-me', 'change-me-too', 'tobemodified']);

function splitList(value?: string) {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isPlaceholder(value?: string) {
  const normalized = String(value || '').trim().toLowerCase();
  if (PLACEHOLDER_VALUES.has(normalized)) {
    return true;
  }

  return normalized
    .split(',')
    .map((item) => item.trim())
    .some((item) => PLACEHOLDER_VALUES.has(item) || item.includes('tobemodified'));
}

function assertProductionEnv(strapi: Core.Strapi) {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const required = [
    'APP_KEYS',
    'API_TOKEN_SALT',
    'ADMIN_JWT_SECRET',
    'TRANSFER_TOKEN_SALT',
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'ADMIN_PANEL_ALLOWED_ROLES',
    'PANEL_INTERNAL_TOKEN',
    'RATE_LIMIT_HASH_SECRET',
  ];
  const missing = required.filter((key) => isPlaceholder(process.env[key]));

  if (missing.length > 0) {
    throw new Error(`Missing production secrets: ${missing.join(', ')}`);
  }

  if (process.env.DATABASE_CLIENT === 'postgres' && isPlaceholder(process.env.DATABASE_URL)) {
    throw new Error('DATABASE_URL is required for production PostgreSQL deployments.');
  }

  if (process.env.DATABASE_CLIENT !== 'postgres') {
    strapi.log.warn('Production DATABASE_CLIENT is not postgres. Use this only for disposable demo deployments.');
  }
}

async function ensureUsersPermissionsRole(strapi: Core.Strapi, roleType: string) {
  const normalizedType = roleType.trim().toLowerCase();
  if (!normalizedType) {
    return null;
  }

  const existing = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: normalizedType },
  });

  if (existing) {
    return existing;
  }

  const displayName = normalizedType
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ') || normalizedType;

  strapi.log.info(`Creating users-permissions role for custom panel: ${normalizedType}`);
  return strapi.db.query('plugin::users-permissions.role').create({
    data: {
      name: displayName,
      type: normalizedType,
      description: 'Custom panel maintainer role managed by Schale Library bootstrap.',
    },
  });
}

async function ensurePanelRoles(strapi: Core.Strapi) {
  const roles = splitList(process.env.ADMIN_PANEL_ALLOWED_ROLES || (process.env.NODE_ENV === 'production' ? '' : 'authenticated'));
  const uniqueRoles = Array.from(new Set(roles.map((role) => role.toLowerCase())));

  for (const role of uniqueRoles) {
    await ensureUsersPermissionsRole(strapi, role);
  }
}

async function ensureBootstrapPanelUser(strapi: Core.Strapi) {
  const email = process.env.ADMIN_PANEL_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PANEL_BOOTSTRAP_PASSWORD;

  if (!email && !password) {
    return;
  }

  if (!email || !password) {
    throw new Error('ADMIN_PANEL_BOOTSTRAP_EMAIL and ADMIN_PANEL_BOOTSTRAP_PASSWORD must be configured together.');
  }

  if (process.env.NODE_ENV === 'production' && password.length < 16) {
    throw new Error('ADMIN_PANEL_BOOTSTRAP_PASSWORD must be at least 16 characters in production.');
  }

  const allowedRoles = splitList(process.env.ADMIN_PANEL_ALLOWED_ROLES);
  const roleType = (allowedRoles[0] || 'maintainer').toLowerCase();
  const role = await ensureUsersPermissionsRole(strapi, roleType);
  const username = process.env.ADMIN_PANEL_BOOTSTRAP_USERNAME?.trim() || email.split('@')[0];
  const userService = strapi.plugin('users-permissions').service('user');
  const existing = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { email },
    populate: ['role'],
  });

  if (existing) {
    await userService.edit(existing.id, {
      username,
      email,
      password,
      confirmed: true,
      blocked: false,
      role: role?.id,
    });
    strapi.log.info(`Updated custom panel bootstrap user: ${email}`);
    return;
  }

  await userService.add({
    username,
    email,
    password,
    provider: 'local',
    confirmed: true,
    blocked: false,
    role: role?.id,
  });
  strapi.log.info(`Created custom panel bootstrap user: ${email}`);
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    assertProductionEnv(strapi);
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensurePanelRoles(strapi);
    await ensureBootstrapPanelUser(strapi);
  },
};
