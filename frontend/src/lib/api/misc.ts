/**
 * 杂项域：公告、友链、学院基础数据、全集合翻页工具与全局搜索聚合。
 */

import {
  createCollectionQuery,
  fetchAPI,
  isNumericIdentifier,
  toStrapiLocale,
} from './core';
import {
  searchOfflineEvents,
  searchOnlineEvents,
  COVER_IMAGE_POPULATE_PARAMS,
} from './events';
import type {
  OfflineEvent,
  OnlineEvent,
} from './events';
import type { Announcement, FriendLink, SchoolType, StrapiMedia, StrapiResponse, Student } from './types';
import type { Creator } from './creators';
import type { ResearchSubject } from './research';

export async function getAnnouncements(
  locale: string = 'zh-Hans',
  options: { page?: number; pageSize?: number } = {}
) {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<Announcement[]>>(
    `/announcements?${createCollectionQuery({
      locale: strapiLocale,
      'filters[isActive][$eq]': true,
      'sort[0]': 'isPinned:desc',
      'sort[1]': 'priority:desc',
      'sort[2]': 'publishedAt:desc',
      'pagination[page]': Math.max(1, options.page || 1),
      'pagination[pageSize]': Math.min(100, Math.max(1, options.pageSize || 24)),
      ...COVER_IMAGE_POPULATE_PARAMS,
    })}`
  );
}

export async function getHomeAnnouncements(locale: string = 'zh-Hans', limit: number = 3) {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<Announcement[]>>(
    `/announcements?${createCollectionQuery({
      locale: strapiLocale,
      'filters[isActive][$eq]': true,
      'sort[0]': 'isPinned:desc',
      'sort[1]': 'priority:desc',
      'sort[2]': 'publishedAt:desc',
      'pagination[pageSize]': limit,
      ...COVER_IMAGE_POPULATE_PARAMS,
    })}`
  );
}

export async function getFriendLinks(locale: string = 'zh-Hans', limit: number = 12) {
  const strapiLocale = toStrapiLocale(locale);
  // 性能：友链为全站页脚静态内容，缓存分层至 1 小时（其余集合维持 60s）。
  return fetchAPI<StrapiResponse<FriendLink[]>>(
    `/friend-links?${createCollectionQuery({
      locale: strapiLocale,
      'pagination[pageSize]': limit,
      'populate[icon]': true,
    })}`
  );
}

/**
 * 获取单个公告详情（通过 documentId 或数字 ID）
 */
export async function getAnnouncementById(
  id: string | number,
  locale: string = 'zh-Hans'
) {
  const strapiLocale = toStrapiLocale(locale)
  const identifier = String(id).trim()
  const response = await fetchAPI<StrapiResponse<Announcement[]>>(
    `/announcements?${createCollectionQuery({
      locale: strapiLocale,
      [isNumericIdentifier(identifier) ? 'filters[id][$eq]' : 'filters[documentId][$eq]']: identifier,
      ...COVER_IMAGE_POPULATE_PARAMS,
    })}`
  );
  return {
    data: response.data?.[0] || null,
    meta: {}
  };
}

/**
 * 搜索公告
 * @param query 搜索关键词
 * @param locale 语言代码
 */
export async function searchAnnouncements(
  query: string,
  locale: string = 'zh-Hans'
) {
  const strapiLocale = toStrapiLocale(locale)
  return fetchAPI<StrapiResponse<Announcement[]>>(
    `/announcements?${createCollectionQuery({
      locale: strapiLocale,
      'filters[$or][0][title][$containsi]': query,
      'filters[$or][1][content][$containsi]': query,
      'filters[isActive][$eq]': true,
      sort: 'priority:desc',
      'pagination[limit]': 50,
      ...COVER_IMAGE_POPULATE_PARAMS,
    })}`
  );
}

export async function getAllCollectionItems<T>(
  endpoint: string,
  locale: string = 'zh-Hans',
  options: {
    pageSize?: number;
    populate?: string;
    filters?: Record<string, string | number | boolean | undefined>;
  } = {}
) {
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 100))
  const items: T[] = []
  let page = 1
  let pageCount = 1

  do {
    const response = await fetchAPI<StrapiResponse<T[]>>(
      `/${endpoint}?${createCollectionQuery({
        locale: toStrapiLocale(locale),
        populate: options.populate || '*',
        'pagination[page]': page,
        'pagination[pageSize]': pageSize,
        ...options.filters,
      })}`
    )
    items.push(...(response.data || []))
    pageCount = response.meta?.pagination?.pageCount || 1
    page++
  } while (page <= pageCount)

  return items
}

export interface SearchSectionResult<T> {
  data: T[];
  total: number;
  error?: string;
}

async function safeSearch<T>(label: string, request: Promise<StrapiResponse<T[]>>): Promise<SearchSectionResult<T>> {
  try {
    const response = await request
    return {
      data: response.data || [],
      total: response.meta?.pagination?.total ?? response.data?.length ?? 0,
    }
  } catch (error) {
    console.error(`Failed to search ${label}:`, error)
    return {
      data: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Search failed',
    }
  }
}

/**
 * 搜索创作者（按名称 / 简介）
 */
export async function searchCreators(query: string, locale: string = 'zh-Hans') {
  return fetchAPI<StrapiResponse<Creator[]>>(
    `/creators?${createCollectionQuery({
      locale: toStrapiLocale(locale),
      'filters[$or][0][name][$containsi]': query,
      'filters[$or][1][bio][$containsi]': query,
      'sort[0]': 'isFeatured:desc',
      'pagination[limit]': 50,
    })}`
  );
}

/**
 * 搜索考据对象：列表接口暂不支持全文过滤，取全量后在内存中按名称匹配。
 */
export async function searchResearchSubjects(query: string, locale: string = 'zh-Hans') {
  const response = await fetchAPI<StrapiResponse<ResearchSubject[]>>(
    `/research-subjects?${createCollectionQuery({
      locale: toStrapiLocale(locale),
      'pagination[pageSize]': 100,
    })}`
  );
  const keyword = query.trim().toLowerCase();
  const data = (response.data || []).filter(
    (subject) =>
      subject.name.toLowerCase().includes(keyword) ||
      (subject.description ? sanitizeText(subject.description).includes(keyword) : false)
  );
  return { ...response, data };
}

/** 去除 HTML 标签后做纯文本包含匹配 */
function sanitizeText(html: string): string {
  return html.replace(/<[^>]*>/g, ' ');
}

export async function searchAllContent(query: string, locale: string = 'zh-Hans') {
  if (!query.trim()) {
    return {
      announcements: { data: [], total: 0 } as SearchSectionResult<Announcement>,
      creators: { data: [], total: 0 } as SearchSectionResult<Creator>,
      subjects: { data: [], total: 0 } as SearchSectionResult<ResearchSubject>,
      onlineEvents: { data: [], total: 0 } as SearchSectionResult<OnlineEvent>,
      offlineEvents: { data: [], total: 0 } as SearchSectionResult<OfflineEvent>,
    }
  }

  const [announcements, creators, subjects, onlineEvents, offlineEvents] = await Promise.all([
    safeSearch('announcements', searchAnnouncements(query, locale)),
    safeSearch('creators', searchCreators(query, locale)),
    safeSearch('research subjects', searchResearchSubjects(query, locale)),
    safeSearch('online events', searchOnlineEvents(query, locale)),
    safeSearch('offline events', searchOfflineEvents(query, locale)),
  ])

  return { announcements, creators, subjects, onlineEvents, offlineEvents }
}

// ── 学院（后台可维护的基础数据）──

export interface School {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  order: number;
  logo?: StrapiMedia;
  locale: string;
}

export async function getSchools(locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<School[]>>(
    `/schools?${createCollectionQuery({
      locale: strapiLocale,
      'sort[0]': 'order:asc',
      'sort[1]': 'name:asc',
      'pagination[pageSize]': 100,
      'populate[logo]': true,
    })}`
  );
}

/**
 * 解析学生的学院显示名：优先后台维护的 school_ref，回退到旧枚举映射。
 */
export function resolveStudentSchoolName(
  student: Pick<Student, 'school' | 'school_ref'>,
  locale: string = 'zh-Hans'
): string | undefined {
  if (student.school_ref?.name) {
    return student.school_ref.name;
  }
  if (student.school) {
    const localized = schoolNamesLocalized[locale] || schoolNamesLocalized['zh-Hans'];
    return localized[student.school] || schoolNames[student.school] || student.school;
  }
  return undefined;
}

/**
 * 学校名称映射（中文默认）
 */
export const schoolNames: Record<SchoolType, string> = {
  abydos: '阿拜多斯',
  gehenna: '格黑娜',
  millennium: '千年',
  trinity: '圣三一',
  hyakkiyako: '百鬼夜行',
  shanhaijing: '山海经',
  redwinter: '红冬',
  valkyrie: '瓦尔基里',
  arius: '阿里乌斯',
  srt: 'SRT',
  tokiwadai: '常盘台',
  kronos: '克洛诺斯',
  other: '其他',
};

/**
 * 多语言学校名称映射
 */
export const schoolNamesLocalized: Record<string, Record<string, string>> = {
  'zh-Hans': {
    abydos: '阿拜多斯',
    gehenna: '格黑娜',
    trinity: '圣三一',
    millennium: '千年',
    hyakkiyako: '百鬼夜行',
    shanhaijing: '山海经',
    redwinter: '红冬',
    valkyrie: '瓦尔基里',
    arius: '阿里乌斯',
    srt: 'SRT',
    tokiwadai: '常盘台',
    kronos: '克洛诺斯',
    other: '其他',
  },
  'en': {
    abydos: 'Abydos',
    gehenna: 'Gehenna',
    trinity: 'Trinity',
    millennium: 'Millennium',
    hyakkiyako: 'Hyakkiyako',
    shanhaijing: 'Shanhaijing',
    redwinter: 'Red Winter',
    valkyrie: 'Valkyrie',
    arius: 'Arius',
    srt: 'SRT',
    tokiwadai: 'Tokiwadai',
    kronos: 'Kronos',
    other: 'Other',
  },
  'ja': {
    abydos: 'アビドス',
    gehenna: 'ゲヘナ',
    trinity: 'トリニティ',
    millennium: 'ミレニアム',
    hyakkiyako: '百鬼夜行',
    shanhaijing: '山海経',
    redwinter: 'レッドウィンター',
    valkyrie: 'ヴァルキューレ',
    arius: 'アリウス',
    srt: 'SRT',
    tokiwadai: '常盤台',
    kronos: 'クロノス',
    other: 'その他',
  },
};
