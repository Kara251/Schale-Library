/**
 * 公共内容 API 契约快照（research 考据域）
 *
 * 纯数据常量：记录每个取数函数的 HTTP 方法、端点、代表性查询参数与消费字段。
 * 来源：frontend/src/lib/api/research.ts。不引入任何测试框架。
 */

export const RESEARCH_CONTRACT = {
  getResearchEntries: {
    method: 'GET',
    endpoint: '/research-entries',
    query: {
      locale: 'zh-Hans',
      sort: 'updatedAt:desc',
      'pagination[pageSize]': 100,
      'populate[themes]': true,
      'populate[subjects]': true,
      'populate[spoiler_tier]': true,
    },
    consume: [
      'id',
      'documentId',
      'title',
      'slug',
      'stance',
      'media_type',
      'summary',
      'spoiler_tier.key',
      'themes[].slug',
      'subjects[].slug',
      'updatedAt',
    ],
  },
  getResearchEntryBySlug: {
    method: 'GET',
    endpoint: '/research-entries',
    query: {
      locale: 'zh-Hans',
      'filters[slug][$eq]': '<slug>',
      'populate[citations][populate][source_image]': true,
      'populate[related_links][populate][target_entry]': true,
      'populate[revisions]': true,
    },
    consume: [
      'data[0]',
      'body',
      'citations[].claim_short',
      'citations[].source_type',
      'related_links[].target_entry.slug',
      'revisions[].date',
    ],
  },
  getResearchThemes: {
    method: 'GET',
    endpoint: '/research-themes',
    query: { locale: 'zh-Hans', sort: 'name:asc', 'pagination[pageSize]': 100 },
    consume: ['id', 'documentId', 'name', 'slug', 'curated_intro'],
  },
  getResearchThemeBySlug: {
    method: 'GET',
    endpoint: '/research-themes（fetchLocalizedSingleBySlug：候选 locale 并发，zh 回退）',
    query: { locale: '<locale> + zh-Hans', 'filters[slug][$eq]': '<slug>' },
    consume: ['data[0]'],
  },
  getResearchCurator: {
    method: 'GET',
    endpoint: '/research-curator',
    query: {
      locale: 'zh-Hans',
      'populate[featured_entry][populate][themes]': true,
      'populate[path_steps][populate][entry]': true,
    },
    consume: ['data.featured_entry', 'data.pick_note', 'data.path_description', 'data.path_steps[].entry.slug'],
  },
  getResearchEntriesByThemeSlug: {
    method: 'GET',
    endpoint: '/research-entries（fetchLocalizedCollectionWithFallback）',
    query: {
      locale: '<locale> + zh-Hans',
      'filters[themes][slug][$eq]': '<themeSlug>',
      sort: 'updatedAt:desc',
      'pagination[pageSize]': 100,
    },
    consume: ['data[]'],
  },
  getRecentResearchEntries: {
    method: 'GET',
    endpoint: '/research-entries',
    query: { locale: 'zh-Hans', sort: 'updatedAt:desc', 'pagination[pageSize]': 3 },
    consume: ['id', 'title', 'slug', 'summary', 'media_type'],
  },
  getResearchSubjects: {
    method: 'GET',
    endpoint: '/research-subjects',
    query: { locale: 'zh-Hans', sort: 'name:asc', 'pagination[pageSize]': 100, 'populate[cover]': true },
    consume: ['id', 'name', 'slug', 'subject_type', 'description', 'cover.url'],
  },
  getResearchSubjectBySlug: {
    method: 'GET',
    endpoint: '/research-subjects（fetchLocalizedSingleBySlug）',
    query: {
      locale: '<locale> + zh-Hans',
      'filters[slug][$eq]': '<slug>',
      'populate[cover]': true,
      'populate[students][populate][avatar]': true,
    },
    consume: ['data[0]', 'students[]'],
  },
  getResearchEntriesBySubjectSlug: {
    method: 'GET',
    endpoint: '/research-entries（fetchLocalizedCollectionWithFallback）',
    query: {
      locale: '<locale> + zh-Hans',
      'filters[subjects][slug][$eq]': '<subjectSlug>',
      sort: 'updatedAt:desc',
      'pagination[pageSize]': 100,
    },
    consume: ['data[]'],
  },
  getResearchSubjectsByStudent: {
    method: 'GET',
    endpoint: '/research-subjects',
    query: {
      locale: 'zh-Hans',
      '$or 字段': ['students.id eq', 'students.documentId eq'],
      sort: 'name:asc',
      'pagination[pageSize]': 50,
      'populate[entries][fields][0]': 'title',
      'populate[entries][fields][1]': 'slug',
    },
    consume: ['id', 'name', 'slug', 'entries[].title'],
  },
  getResearchPaths: {
    method: 'GET',
    endpoint: '/research-paths',
    query: {
      locale: 'zh-Hans',
      sort: 'order:asc, updatedAt:desc',
      'pagination[pageSize]': 50,
      'populate[steps][populate][entry][fields]': 'title, slug, summary',
    },
    consume: ['id', 'title', 'slug', 'difficulty', 'order', 'steps[].entry.slug'],
  },
  getResearchPathBySlug: {
    method: 'GET',
    endpoint: '/research-paths（fetchLocalizedSingleBySlug）',
    query: { locale: '<locale> + zh-Hans', 'filters[slug][$eq]': '<slug>', populate: 'steps.entry 最小字段' },
    consume: ['data[0]'],
  },
  getResearchPathsContainingEntry: {
    method: 'GET',
    endpoint: '/research-paths',
    query: {
      locale: 'zh-Hans',
      'filters[steps][entry][slug][$eq]': '<entrySlug>',
      'sort[0]': 'order:asc',
      'pagination[pageSize]': 20,
    },
    consume: ['id', 'title', 'slug', 'steps[].entry.slug'],
  },
  getResearchGraphEntries: {
    method: 'GET',
    endpoint: '/research-entries',
    query: {
      locale: 'zh-Hans',
      sort: 'updatedAt:desc',
      'pagination[pageSize]': 200,
      fields: ['title', 'slug', 'media_type', 'body'],
      populate: ['themes.name/slug', 'subjects.name/slug', 'related_links.target_entry.slug'],
    },
    consume: ['title', 'slug', 'media_type', 'body (wiki 链接解析)', 'related_links'],
  },
  getResearchBacklinks: {
    method: 'GET',
    endpoint: '/research-entries',
    query: {
      locale: 'zh-Hans',
      '$or 字段': ['related_links.target_entry.slug eq', "body contains [[<entrySlug>"],
      'filters[slug][$ne]': '<entrySlug>',
      sort: 'updatedAt:desc',
      'pagination[pageSize]': 50,
    },
    consume: ['id', 'title', 'slug'],
  },
  getEntriesSharingCitations: {
    method: 'GET',
    endpoint: '/research-entries（citationIds 为空时不发请求）',
    query: {
      locale: 'zh-Hans',
      'filters[slug][$ne]': '<excludeEntrySlug>',
      sort: 'updatedAt:desc',
      'pagination[pageSize]': 50,
      'populate[citations][fields][0]': 'id',
      'filters[citations][id][$in][0]': '<citationId>',
    },
    consume: ['data[]', 'citations[].id'],
  },
} as const;
