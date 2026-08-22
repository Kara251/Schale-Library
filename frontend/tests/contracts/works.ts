/**
 * 公共内容 API 契约快照（works 域）
 *
 * 纯数据常量：记录每个取数函数的 HTTP 方法、端点、代表性查询参数与消费字段。
 * 来源：frontend/src/lib/api/works.ts。不引入任何测试框架。
 */

export const WORKS_CONTRACT = {
  getWorks: {
    method: 'GET',
    endpoint: '/works',
    query: {
      locale: 'zh-Hans',
      'filters[isActive][$eq]': true,
      'pagination[pageSize]': 20,
      sort: 'publishedAt:desc',
      'populate[coverImage]': true,
      'populate[students][populate][avatar]': true,
    },
    consume: [
      'id',
      'documentId',
      'title',
      'author',
      'description',
      'coverImage.url',
      'coverImageUrl',
      'nature',
      'workType',
      'isActive',
      'isFeatured',
      'featuredPriority',
      'students.id',
      'students.documentId',
      'students.name',
      'students.avatar.url',
      'sourcePlatform',
      'publishedAt',
      'updatedAt',
    ],
  },
  getFeaturedWorks: {
    method: 'GET',
    endpoint: '/works',
    query: {
      locale: 'zh-Hans',
      'filters[isActive][$eq]': true,
      'filters[isFeatured][$eq]': true,
      'filters[$and][0][$or][0][featuredUntil][$null]': true,
      'filters[$and][0][$or][1][featuredUntil][$gte]': '<now ISO>',
      sort: 'publishedAt:desc',
      'pagination[pageSize]': 6,
    },
    consume: ['data[]', 'meta.pagination.total'],
  },
  getWorksByStudent: {
    method: 'GET',
    endpoint: '/works',
    query: {
      locale: 'zh-Hans',
      'filters[isActive][$eq]': true,
      'filters[$or][0][students][id][$eq]': '<student.id>',
      'filters[$or][1][students][documentId][$eq]': '<student.documentId>',
      sort: 'publishedAt:desc',
      'pagination[limit]': 24,
    },
    consume: ['id', 'title', 'coverImage.url', 'nature', 'workType'],
  },
  getWorksByAuthor: {
    method: 'GET',
    endpoint: '/works',
    query: {
      locale: 'zh-Hans',
      'filters[isActive][$eq]': true,
      'filters[id][$ne]': '<currentWorkId>',
      'filters[author][$eq]': '<author>',
      sort: 'publishedAt:desc',
      'pagination[limit]': 4,
    },
    consume: ['id', 'title', 'coverImage.url'],
  },
  getWorksByStudentIds: {
    method: 'GET',
    endpoint: '/works',
    query: {
      locale: 'zh-Hans',
      'filters[isActive][$eq]': true,
      'filters[id][$ne]': '<currentWorkId>',
      'filters[students][id][$in][0]': '<studentId>',
      sort: 'publishedAt:desc',
      'pagination[limit]': 4,
    },
    consume: ['id', 'title', 'coverImage.url'],
  },
  getWorkById: {
    method: 'GET',
    endpoint: '/works',
    query: {
      locale: 'zh-Hans',
      'filters[documentId][$eq]': '<id | filters[id][$eq] if numeric>',
    },
    consume: ['data[0]', 'description', 'body'],
  },
  searchWorks: {
    method: 'GET',
    endpoint: '/works',
    query: {
      locale: 'zh-Hans',
      'filters[$or][0][title][$containsi]': '<query>',
      'filters[$or][1][author][$containsi]': '<query>',
      'filters[$or][2][description][$containsi]': '<query>',
      'filters[$or][3][students][name][$containsi]': '<query>',
      'filters[isActive][$eq]': true,
      sort: 'publishedAt:desc',
      'pagination[limit]': 50,
    },
    consume: ['id', 'title', 'coverImage.url'],
  },
} as const;
