/**
 * 媒体地址与种子脚本契约快照
 *
 * 纯数据常量：记录 getMediaUrl 的 URL 归一化规则与 seed 脚本的端点契约。
 * 来源：frontend/src/lib/media.ts、scripts/seed-basics.mjs。不引入任何测试框架。
 */

export const MEDIA_CONTRACT = {
  getMediaUrl: {
    method: 'LOCAL',
    endpoint: '纯函数：Strapi 相对媒体路径 → 绝对 URL',
    rules: [
      '空值 → 空字符串',
      'http://、https://、data:、blob:、/api/ 开头 → 原样返回',
      '/ 开头 → STRAPI_API_URL（去尾斜杠）拼接',
      '其余相对形式 → 原样返回',
    ],
    consume: ['url', "process.env.NEXT_PUBLIC_API_URL (默认 http://localhost:8083)"],
  },
} as const;

export const SEED_BASICS_CONTRACT = {
  ensureStudent: {
    lookup: {
      method: 'GET',
      endpoint: '/api/students',
      query: {
        'filters[name][$eq]': '<student.name>',
        'pagination[pageSize]': 1,
      },
      consume: ['data[]（存在即跳过创建）'],
    },
    create: {
      method: 'POST',
      endpoint: '/api/students',
      body: { data: { name: '<string>', school: '<SchoolType 枚举>', organization: '<string>', publishedAt: '<now ISO>' } },
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer <SEED_API_TOKEN，存在时携带>',
      },
    },
    env: {
      SEED_STRAPI_URL: '种子目标 Strapi 地址',
      NEXT_PUBLIC_API_URL: 'SEED_STRAPI_URL 未设置时的回退（默认 http://localhost:8083）',
      SEED_API_TOKEN: '可选 Bearer token',
    },
    seededStudents: ['Shiroko (abydos)', 'Hoshino (abydos)', 'Aris (millennium)', 'Mika (trinity)', 'Hina (gehenna)'],
  },
} as const;
