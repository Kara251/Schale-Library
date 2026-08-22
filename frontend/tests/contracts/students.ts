/**
 * 公共内容 API 契约快照（students 域）
 *
 * 纯数据常量：记录每个取数函数的 HTTP 方法、端点、代表性查询参数与消费字段。
 * 来源：frontend/src/lib/api/students.ts。不引入任何测试框架。
 */

export const STUDENTS_CONTRACT = {
  getStudents: {
    method: 'GET',
    endpoint: '/students',
    query: {
      locale: 'zh-Hans',
      sort: 'name:asc',
      populate: 'avatar,school_ref',
      'pagination[page]': 1,
      'pagination[pageSize]': 50,
      '$and 过滤': ['name/organization containsi (query)', 'school_ref.slug | school eq (school)'],
      'filters[id][$in][0]': '<studentId> (studentIds)',
    },
    consume: [
      'id',
      'documentId',
      'name',
      'school',
      'school_ref.id',
      'school_ref.documentId',
      'school_ref.name',
      'school_ref.slug',
      'organization',
      'avatar.url',
      'bio',
    ],
  },
  getAllStudents: {
    method: 'GET',
    endpoint: '/students（getAllCollectionItems 自动翻页）',
    query: {
      locale: 'zh-Hans',
      sort: 'name:asc',
      populate: 'avatar,school_ref',
      'pagination[pageSize]': 100,
    },
    consume: ['data[]', 'meta: {}'],
  },
  getStudentById: {
    method: 'GET',
    endpoint: '/students',
    query: {
      locale: 'zh-Hans',
      'filters[documentId][$eq]': '<id | filters[id][$eq] if numeric>',
      populate: 'avatar,school_ref',
    },
    consume: ['data[0]', 'avatar.url', 'bio'],
  },
  searchStudents: {
    method: 'GET',
    endpoint: '/students',
    query: {
      locale: 'zh-Hans',
      '$or 字段': ['name', 'organization', 'school', 'bio'],
      sort: 'updatedAt:desc',
      'pagination[limit]': 50,
      populate: 'avatar,school_ref',
    },
    consume: ['id', 'documentId', 'name', 'avatar.url'],
  },
} as const;
