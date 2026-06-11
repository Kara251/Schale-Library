import type { Core } from '@strapi/strapi';

const PLACEHOLDER_VALUES = new Set(['', 'change-me', 'change-me-too', 'tobemodified']);

function splitList(value?: string) {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizePath(value?: string) {
  const path = String(value || '').trim();
  return path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
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
    'CRON_ENABLED',
    'ADMIN_PATH',
    'STRAPI_CORS_ORIGINS',
    'STRAPI_ADMIN_WAF_CONFIRMED',
  ];
  const missing = required.filter((key) => isPlaceholder(process.env[key]));

  if (missing.length > 0) {
    throw new Error(`Missing production secrets: ${missing.join(', ')}`);
  }

  if (process.env.DATABASE_CLIENT === 'postgres' && isPlaceholder(process.env.DATABASE_URL)) {
    throw new Error('DATABASE_URL is required for production PostgreSQL deployments.');
  }

  const adminPath = normalizePath(process.env.ADMIN_PATH);
  if (!adminPath.startsWith('/') || adminPath === '/admin') {
    throw new Error('ADMIN_PATH must be a non-default absolute path in production, for example /strapi-console-<random>.');
  }

  if (process.env.STRAPI_ADMIN_WAF_CONFIRMED !== 'true') {
    throw new Error('STRAPI_ADMIN_WAF_CONFIRMED=true is required before exposing Strapi Admin publicly.');
  }

  const cloudinaryValues = [process.env.CLOUDINARY_NAME, process.env.CLOUDINARY_KEY, process.env.CLOUDINARY_SECRET];
  if (cloudinaryValues.some((value) => isPlaceholder(value))) {
    throw new Error('CLOUDINARY_NAME, CLOUDINARY_KEY, and CLOUDINARY_SECRET are required for formal production deployments.');
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

async function ensurePublicResearchPermissions(strapi: Core.Strapi) {
  const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: 'public' },
  }) as { id: number } | null;

  if (!publicRole) return;

  const actions = [
    'api::research-entry.research-entry.find',
    'api::research-entry.research-entry.findOne',
    'api::research-theme.research-theme.find',
    'api::research-theme.research-theme.findOne',
    'api::research-citation.research-citation.find',
    'api::research-citation.research-citation.findOne',
    'api::research-curator.research-curator.find',
    'api::research-subject.research-subject.find',
    'api::research-subject.research-subject.findOne',
    'api::research-path.research-path.find',
    'api::research-path.research-path.findOne',
    'api::school.school.find',
    'api::school.school.findOne',
  ];

  for (const action of actions) {
    try {
      const existing = await strapi.db.query('plugin::users-permissions.permission').findOne({
        where: { action, role: publicRole.id },
      }) as { id: number; enabled: boolean } | null;

      if (existing && !existing.enabled) {
        await strapi.db.query('plugin::users-permissions.permission').update({
          where: { id: existing.id },
          data: { enabled: true },
        });
        strapi.log.info(`[bootstrap] Enabled public permission: ${action}`);
      } else if (!existing) {
        await strapi.db.query('plugin::users-permissions.permission').create({
          data: { action, role: publicRole.id, enabled: true },
        });
        strapi.log.info(`[bootstrap] Created public permission: ${action}`);
      }
    } catch (err) {
      strapi.log.warn(`[bootstrap] Could not set permission for ${action}: ${(err as Error).message}`);
    }
  }
}

const SCHOOL_SEEDS: Array<{
  slug: string;
  order: number;
  color?: string;
  names: { 'zh-Hans': string; en: string; ja: string };
}> = [
  { slug: 'abydos', order: 1, color: '#2d77c9', names: { 'zh-Hans': '阿拜多斯高等学校', en: 'Abydos High School', ja: 'アビドス高等学校' } },
  { slug: 'gehenna', order: 2, color: '#c43131', names: { 'zh-Hans': '格黑娜学园', en: 'Gehenna Academy', ja: 'ゲヘナ学園' } },
  { slug: 'millennium', order: 3, color: '#3ec1cf', names: { 'zh-Hans': '千年科技学院', en: 'Millennium Science School', ja: 'ミレニアムサイエンススクール' } },
  { slug: 'trinity', order: 4, color: '#e8e3d3', names: { 'zh-Hans': '圣三一综合学园', en: 'Trinity General School', ja: 'トリニティ総合学園' } },
  { slug: 'hyakkiyako', order: 5, color: '#e0719b', names: { 'zh-Hans': '百鬼夜行联合学院', en: 'Hyakkiyako Alliance Academy', ja: '百鬼夜行連合学院' } },
  { slug: 'shanhaijing', order: 6, color: '#3eb370', names: { 'zh-Hans': '山海经高级中学', en: 'Shanhaijing Senior Secondary School', ja: '山海経高級中学校' } },
  { slug: 'redwinter', order: 7, color: '#a31f34', names: { 'zh-Hans': '红冬联邦学园', en: 'Red Winter Federal Academy', ja: 'レッドウィンター連邦学園' } },
  { slug: 'valkyrie', order: 8, color: '#274a78', names: { 'zh-Hans': '瓦尔基里警察学校', en: 'Valkyrie Police Academy', ja: 'ヴァルキューレ警察学校' } },
  { slug: 'arius', order: 9, color: '#4a4a5a', names: { 'zh-Hans': '阿里乌斯分校', en: 'Arius Satellite School', ja: 'アリウス分校' } },
  { slug: 'srt', order: 10, color: '#5b6770', names: { 'zh-Hans': 'SRT特殊学园', en: 'SRT Special Academy', ja: 'SRT特殊学園' } },
  { slug: 'tokiwadai', order: 11, color: '#8a8a8a', names: { 'zh-Hans': '常盘台', en: 'Tokiwadai', ja: '常盤台' } },
  { slug: 'kronos', order: 12, color: '#8a8a8a', names: { 'zh-Hans': '克洛诺斯学园', en: 'Kronos School', ja: 'クロノス学園' } },
  { slug: 'other', order: 99, names: { 'zh-Hans': '其他', en: 'Other', ja: 'その他' } },
];

/**
 * 幂等的学院种子：仅在对应 slug 不存在时创建（zh-Hans 为基准语言，附带 en/ja 本地化）。
 * 已存在的学院不会被覆盖，编辑者随时可以在后台修改。
 */
async function ensureSchoolSeeds(strapi: Core.Strapi) {
  const documents = strapi.documents('api::school.school' as any);

  for (const seed of SCHOOL_SEEDS) {
    try {
      const existing = await strapi.db.query('api::school.school').findOne({
        where: { slug: seed.slug },
      }) as { documentId?: string } | null;

      if (existing) {
        continue;
      }

      const created = await documents.create({
        data: {
          name: seed.names['zh-Hans'],
          slug: seed.slug,
          color: seed.color,
          order: seed.order,
        },
        locale: 'zh-Hans',
      } as any) as { documentId?: string };

      if (created?.documentId) {
        for (const locale of ['en', 'ja'] as const) {
          // 创建新语言版本时必填字段不会自动继承，需要重新提供
          await documents.update({
            documentId: created.documentId,
            locale,
            data: {
              name: seed.names[locale],
              slug: seed.slug,
              color: seed.color,
              order: seed.order,
            },
          } as any);
        }
      }

      strapi.log.info(`[bootstrap] Seeded school: ${seed.slug}`);
    } catch (error) {
      strapi.log.warn(`[bootstrap] Could not seed school ${seed.slug}: ${(error as Error).message}`);
    }
  }
}

/**
 * 把学生的旧 school 枚举值回填为 school_ref 关联（仅补缺，不覆盖已有关联）。
 */
async function backfillStudentSchoolRelations(strapi: Core.Strapi) {
  try {
    const schools = await strapi.db.query('api::school.school').findMany({}) as Array<{
      id: number; slug: string; locale?: string;
    }>;
    const schoolByKey = new Map<string, number>();
    for (const school of schools) {
      schoolByKey.set(`${school.slug}:${school.locale || ''}`, school.id);
      if (!schoolByKey.has(`${school.slug}:`)) {
        schoolByKey.set(`${school.slug}:`, school.id);
      }
    }

    const students = await strapi.db.query('api::student.student').findMany({
      populate: ['school_ref'],
    }) as Array<{ id: number; school?: string; locale?: string; school_ref?: { id: number } | null }>;

    let linked = 0;
    for (const student of students) {
      if (!student.school || student.school_ref) {
        continue;
      }

      const schoolId = schoolByKey.get(`${student.school}:${student.locale || ''}`)
        || schoolByKey.get(`${student.school}:`);
      if (!schoolId) {
        continue;
      }

      await strapi.db.query('api::student.student').update({
        where: { id: student.id },
        data: { school_ref: schoolId },
      });
      linked++;
    }

    if (linked > 0) {
      strapi.log.info(`[bootstrap] Backfilled school_ref for ${linked} student rows`);
    }
  } catch (error) {
    strapi.log.warn(`[bootstrap] Student school backfill failed: ${(error as Error).message}`);
  }
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
    await ensurePublicResearchPermissions(strapi);
    await ensureSchoolSeeds(strapi);
    await backfillStudentSchoolRelations(strapi);
  },
};
