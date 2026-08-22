/**
 * 公共内容 API 契约快照（misc 域：公告/友链/学院/全局搜索）
 *
 * 纯数据常量：记录每个取数函数的 HTTP 方法、端点、代表性查询参数与消费字段。
 * 来源：frontend/src/lib/api/misc.ts。不引入任何测试框架。
 */

export const MISC_CONTRACT = {
  getAnnouncements: {
    method: 'GET',
    endpoint: '/announcements',
    query: {
      locale: 'zh-Hans',
      'filters[isActive][$eq]': true,
      sort: 'isPinned:desc, priority:desc, publishedAt:desc',
      'pagination[page]': 1,
      'pagination[pageSize]': 24,
      'populate[coverImage]': true,
    },
    consume: [
      'id',
      'documentId',
      'title',
      'content',
      'coverImage.url',
      'link',
      'priority',
      'isPinned',
      'publishedAt',
    ],
  },
  getHomeAnnouncements: {
    method: 'GET',
    endpoint: '/announcements',
    query: {
      locale: 'zh-Hans',
      'filters[isActive][$eq]': true,
      sort: 'isPinned:desc, priority:desc, publishedAt:desc',
      'pagination[pageSize]': 3,
    },
    consume: ['data[]'],
  },
  getAnnouncementById: {
    method: 'GET',
    endpoint: '/announcements',
    query: {
      locale: 'zh-Hans',
      'filters[documentId][$eq]': '<id | filters[id][$eq] if numeric>',
      'populate[coverImage]': true,
    },
    consume: ['data[0]', 'content (经 sanitizeHtml)'],
  },
  searchAnnouncements: {
    method: 'GET',
    endpoint: '/announcements',
    query: {
      locale: 'zh-Hans',
      '$or 字段': ['title', 'content'],
      'filters[isActive][$eq]': true,
      sort: 'priority:desc',
      'pagination[limit]': 50,
    },
    consume: ['id', 'documentId', 'title'],
  },
  getFriendLinks: {
    method: 'GET',
    endpoint: '/friend-links',
    query: {
      locale: 'zh-Hans',
      'pagination[pageSize]': 12,
      'populate[icon]': true,
      revalidate: 3600,
    },
    consume: ['id', 'documentId', 'title', 'description', 'url', 'icon.url', 'priority'],
  },
  getSchools: {
    method: 'GET',
    endpoint: '/schools',
    query: {
      locale: 'zh-Hans',
      sort: 'order:asc, name:asc',
      'pagination[pageSize]': 100,
      'populate[logo]': true,
    },
    consume: ['id', 'documentId', 'name', 'slug', 'color', 'order', 'logo.url'],
  },
  getAllCollectionItems: {
    method: 'GET',
    endpoint: '/<endpoint>（通用自动翻页，sitemap 与筛选器复用）',
    query: {
      locale: 'zh-Hans',
      populate: '* | <options.populate>',
      'pagination[page]': '<递增>',
      'pagination[pageSize]': 100,
    },
    consume: ['data[]（拼接全部页）'],
  },
  searchAllContent: {
    method: 'GET',
    endpoint: '/announcements + /works + /online-events + /offline-events + /students（Promise.all 并发，safeSearch 容错）',
    query: {
      各自搜索契约: 'searchAnnouncements/searchWorks/searchOnlineEvents/searchOfflineEvents/searchStudents',
    },
    consume: [
      'announcements: SearchSectionResult<Announcement>',
      'works: SearchSectionResult<Work>',
      'onlineEvents: SearchSectionResult<OnlineEvent>',
      'offlineEvents: SearchSectionResult<OfflineEvent>',
      'students: SearchSectionResult<Student>',
    ],
  },
  resolveStudentSchoolName: {
    method: 'LOCAL',
    endpoint: '纯函数：school_ref.name 优先，回退 schoolNamesLocalized/schoolNames 枚举映射',
    query: {},
    consume: ['student.school_ref.name', 'student.school', 'schoolNamesLocalized[locale]'],
  },
} as const;
