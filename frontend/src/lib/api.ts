/**
 * Strapi API 工具函数
 * 后端地址：http://localhost:8083
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083';
const API_TIMEOUT_MS = Math.max(1000, Number(process.env.API_TIMEOUT_MS || '10000'));

type ContentIdentifier = string | number;

function toStrapiLocale(locale: string = 'zh-Hans') {
  if (locale === 'zh-CN') {
    return 'zh-Hans';
  }

  return locale || 'zh-Hans';
}

function isNumericIdentifier(identifier: ContentIdentifier) {
  return /^\d+$/.test(String(identifier).trim());
}

function createCollectionQuery(params: Record<string, string | number | boolean | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }

    searchParams.set(key, String(value));
  }

  return searchParams.toString();
}

export function getContentEntryPathId(entry: { documentId?: string; id: number }) {
  return entry.documentId || String(entry.id);
}

/**
 * 通用 API 请求函数
 * 支持 Next.js 服务端缓存和重验证
 */
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}/api${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
    // Next.js 缓存配置：60秒后重新验证，减少不必要的重复请求
    next: { revalidate: 60 },
  };

  try {
    const response = await fetch(url, {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
      signal: options.signal || controller.signal,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 获取所有公告（按当前语言过滤）
 */
export async function getAnnouncements(locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<Announcement[]>>(
    `/announcements?${createCollectionQuery({
      locale: strapiLocale,
      'filters[isActive][$eq]': true,
      sort: 'priority:desc',
      populate: '*',
    })}`
  );
}

/**
 * 获取最新线上活动
 * @param limit 返回数量限制
 */
export async function getOnlineEvents(
  limit: number = 10,
  locale: string = 'zh-Hans'
) {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<OnlineEvent[]>>(
    `/online-events?${createCollectionQuery({
      locale: strapiLocale,
      sort: 'startTime:desc',
      'pagination[limit]': limit,
      populate: '*',
    })}`
  );
}

/**
 * 获取最新线下活动
 * @param limit 返回数量限制
 */
export async function getOfflineEvents(
  limit: number = 10,
  locale: string = 'zh-Hans'
) {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<OfflineEvent[]>>(
    `/offline-events?${createCollectionQuery({
      locale: strapiLocale,
      sort: 'startTime:desc',
      'pagination[limit]': limit,
      populate: '*',
    })}`
  );
}

/**
 * 获取单个线上活动详情（通过 documentId 或数字 ID）
 */
export async function getOnlineEventById(
  id: ContentIdentifier,
  locale: string = 'zh-Hans'
) {
  const strapiLocale = toStrapiLocale(locale)
  const identifier = String(id).trim()
  const response = await fetchAPI<StrapiResponse<OnlineEvent[]>>(
    `/online-events?${createCollectionQuery({
      locale: strapiLocale,
      [isNumericIdentifier(identifier) ? 'filters[id][$eq]' : 'filters[documentId][$eq]']: identifier,
      populate: '*',
    })}`
  );
  return {
    data: response.data?.[0] || null,
    meta: {}
  } as StrapiSingleResponse<OnlineEvent>;
}

/**
 * 获取单个线下活动详情（通过 documentId 或数字 ID）
 */
export async function getOfflineEventById(
  id: ContentIdentifier,
  locale: string = 'zh-Hans'
) {
  const strapiLocale = toStrapiLocale(locale)
  const identifier = String(id).trim()
  const response = await fetchAPI<StrapiResponse<OfflineEvent[]>>(
    `/offline-events?${createCollectionQuery({
      locale: strapiLocale,
      [isNumericIdentifier(identifier) ? 'filters[id][$eq]' : 'filters[documentId][$eq]']: identifier,
      populate: '*',
    })}`
  );
  return {
    data: response.data?.[0] || null,
    meta: {}
  } as StrapiSingleResponse<OfflineEvent>;
}

/**
 * 获取单个公告详情（通过 documentId 或数字 ID）
 */
export async function getAnnouncementById(
  id: ContentIdentifier,
  locale: string = 'zh-Hans'
) {
  const strapiLocale = toStrapiLocale(locale)
  const identifier = String(id).trim()
  const response = await fetchAPI<StrapiResponse<Announcement[]>>(
    `/announcements?${createCollectionQuery({
      locale: strapiLocale,
      [isNumericIdentifier(identifier) ? 'filters[id][$eq]' : 'filters[documentId][$eq]']: identifier,
      populate: '*',
    })}`
  );
  return {
    data: response.data?.[0] || null,
    meta: {}
  } as StrapiSingleResponse<Announcement>;
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
      sort: 'priority:desc',
      'pagination[limit]': 50,
      populate: '*',
    })}`
  );
}

/**
 * 搜索线上活动
 * @param query 搜索关键词
 * @param locale 语言代码
 */
export async function searchOnlineEvents(
  query: string,
  locale: string = 'zh-Hans'
) {
  const strapiLocale = toStrapiLocale(locale)
  return fetchAPI<StrapiResponse<OnlineEvent[]>>(
    `/online-events?${createCollectionQuery({
      locale: strapiLocale,
      'filters[$or][0][title][$containsi]': query,
      'filters[$or][1][organizer][$containsi]': query,
      'filters[$or][2][description][$containsi]': query,
      sort: 'startTime:desc',
      'pagination[limit]': 50,
      populate: '*',
    })}`
  );
}

/**
 * 搜索线下活动
 * @param query 搜索关键词
 * @param locale 语言代码
 */
export async function searchOfflineEvents(
  query: string,
  locale: string = 'zh-Hans'
) {
  const strapiLocale = toStrapiLocale(locale)
  return fetchAPI<StrapiResponse<OfflineEvent[]>>(
    `/offline-events?${createCollectionQuery({
      locale: strapiLocale,
      'filters[$or][0][title][$containsi]': query,
      'filters[$or][1][organizer][$containsi]': query,
      'filters[$or][2][location][$containsi]': query,
      'filters[$or][3][guests][$containsi]': query,
      'filters[$or][4][description][$containsi]': query,
      sort: 'startTime:desc',
      'pagination[limit]': 50,
      populate: '*',
    })}`
  );
}

/**
 * Strapi 响应类型定义
 */
export interface StrapiResponse<T> {
  data: T;
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiSingleResponse<T> {
  data: T;
  meta: Record<string, never>;
}

/**
 * 公告类型
 */
export interface Announcement {
  id: number;
  documentId: string;
  title: string;
  content: string;
  coverImage?: StrapiMedia;
  link?: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: string;
}

/**
 * 线上活动类型
 */
export interface OnlineEvent {
  id: number;
  documentId: string;
  title: string;
  nature: 'official' | 'fanmade';
  startTime: string;
  endTime: string;
  link?: string;
  coverImage?: StrapiMedia;
  organizer?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: string;
}

/**
 * 线下活动类型
 */
export interface OfflineEvent {
  id: number;
  documentId: string;
  title: string;
  nature: 'official' | 'fanmade';
  location: string;
  guests?: string;
  startTime: string;
  endTime: string;
  link?: string;
  coverImage?: StrapiMedia;
  organizer?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: string;
}

/**
 * Strapi 媒体文件类型
 */
export interface StrapiMedia {
  id: number;
  documentId: string;
  name: string;
  alternativeText?: string;
  caption?: string;
  width: number;
  height: number;
  formats?: {
    thumbnail?: MediaFormat;
    small?: MediaFormat;
    medium?: MediaFormat;
    large?: MediaFormat;
  };
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl?: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaFormat {
  name: string;
  hash: string;
  ext: string;
  mime: string;
  width: number;
  height: number;
  size: number;
  url: string;
}

/**
 * 推荐作品类型
 */
export interface Work {
  id: number;
  documentId: string;
  title: string;
  author?: string;
  description?: string;
  coverImage?: StrapiMedia;
  coverImageUrl?: string;
  originalPublishDate?: string;
  nature: 'official' | 'fanmade';
  workType: 'video' | 'image' | 'text' | 'other';
  link?: string;
  isActive: boolean;
  // RSS 导入相关字段
  sourceUrl?: string;
  sourcePlatform?: 'bilibili' | 'twitter' | 'pixiv' | 'youtube' | 'other' | 'manual';
  sourceId?: string;
  isAutoImported?: boolean;
  importedAt?: string;
  // 出场学生
  students?: Student[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: string;
}

/**
 * 学生类型
 */
export type SchoolType = 'abydos' | 'gehenna' | 'millennium' | 'trinity' | 'hyakkiyako' | 'shanhaijing' | 'redwinter' | 'valkyrie' | 'arius' | 'srt' | 'tokiwadai' | 'kronos' | 'other';

export interface Student {
  id: number;
  documentId: string;
  name: string;
  school?: SchoolType;
  organization?: string;
  avatar?: StrapiMedia;
  bio?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface WorkListOptions {
  query?: string;
  nature?: Work['nature'] | 'all';
  workType?: Work['workType'] | 'all';
  sourcePlatform?: NonNullable<Work['sourcePlatform']> | 'all';
  school?: SchoolType | 'all';
  studentIds?: number[];
  page?: number;
  pageSize?: number;
}

function appendWorkFilters(
  params: Record<string, string | number | boolean | undefined>,
  options: WorkListOptions = {}
) {
  const query = options.query?.trim();

  if (query) {
    params['filters[$or][0][title][$containsi]'] = query;
    params['filters[$or][1][author][$containsi]'] = query;
    params['filters[$or][2][description][$containsi]'] = query;
    params['filters[$or][3][students][name][$containsi]'] = query;
  }

  if (options.nature && options.nature !== 'all') {
    params['filters[nature][$eq]'] = options.nature;
  }

  if (options.workType && options.workType !== 'all') {
    params['filters[workType][$eq]'] = options.workType;
  }

  if (options.sourcePlatform && options.sourcePlatform !== 'all') {
    params['filters[sourcePlatform][$eq]'] = options.sourcePlatform;
  }

  if (options.school && options.school !== 'all') {
    params['filters[students][school][$eq]'] = options.school;
  }

  options.studentIds?.forEach((studentId, index) => {
    params[`filters[students][id][$in][${index}]`] = studentId;
  });

  if (options.page) {
    params['pagination[page]'] = options.page;
  }
}

/**
 * 获取推荐作品列表
 * @param limit 返回数量限制
 */
export async function getWorks(limit: number = 20, locale: string = 'zh-Hans', options: WorkListOptions = {}) {
  const strapiLocale = toStrapiLocale(locale)
  const params: Record<string, string | number | boolean | undefined> = {
    locale: strapiLocale,
    'filters[isActive][$eq]': true,
    sort: 'publishedAt:desc',
    'pagination[pageSize]': options.pageSize || limit,
    populate: '*',
  }
  appendWorkFilters(params, options)

  return fetchAPI<StrapiResponse<Work[]>>(
    `/works?${createCollectionQuery(params)}`
  );
}

export interface StudentListOptions {
  query?: string;
  school?: SchoolType | 'all';
  page?: number;
  pageSize?: number;
  studentIds?: number[];
}

export async function getWorksByStudent(
  student: Pick<Student, 'id' | 'documentId'>,
  limit: number = 24,
  locale: string = 'zh-Hans'
) {
  const strapiLocale = toStrapiLocale(locale)
  return fetchAPI<StrapiResponse<Work[]>>(
    `/works?${createCollectionQuery({
      locale: strapiLocale,
      'filters[isActive][$eq]': true,
      'filters[$or][0][students][id][$eq]': student.id,
      'filters[$or][1][students][documentId][$eq]': student.documentId,
      sort: 'publishedAt:desc',
      'pagination[limit]': limit,
      populate: '*',
    })}`
  );
}

export async function getWorksByAuthor(
  author: string,
  currentWorkId: number,
  limit: number = 4,
  locale: string = 'zh-Hans'
) {
  const strapiLocale = toStrapiLocale(locale)
  return fetchAPI<StrapiResponse<Work[]>>(
    `/works?${createCollectionQuery({
      locale: strapiLocale,
      'filters[isActive][$eq]': true,
      'filters[id][$ne]': currentWorkId,
      'filters[author][$eq]': author,
      sort: 'publishedAt:desc',
      'pagination[limit]': limit,
      populate: '*',
    })}`
  );
}

export async function getWorksByStudentIds(
  studentIds: number[],
  currentWorkId: number,
  limit: number = 4,
  locale: string = 'zh-Hans'
) {
  const strapiLocale = toStrapiLocale(locale)
  const params: Record<string, string | number | boolean | undefined> = {
    locale: strapiLocale,
    'filters[isActive][$eq]': true,
    'filters[id][$ne]': currentWorkId,
    sort: 'publishedAt:desc',
    'pagination[limit]': limit,
    populate: '*',
  }

  studentIds.forEach((studentId, index) => {
    params[`filters[students][id][$in][${index}]`] = studentId
  })

  return fetchAPI<StrapiResponse<Work[]>>(
    `/works?${createCollectionQuery(params)}`
  );
}

/**
 * 获取单个推荐作品详情（通过 documentId 或数字 ID）
 */
export async function getWorkById(
  id: ContentIdentifier,
  locale: string = 'zh-Hans'
) {
  const strapiLocale = toStrapiLocale(locale)
  const identifier = String(id).trim()
  const response = await fetchAPI<StrapiResponse<Work[]>>(
    `/works?${createCollectionQuery({
      locale: strapiLocale,
      [isNumericIdentifier(identifier) ? 'filters[id][$eq]' : 'filters[documentId][$eq]']: identifier,
      populate: '*',
    })}`
  );
  return {
    data: response.data?.[0] || null,
    meta: {}
  } as StrapiSingleResponse<Work>;
}

/**
 * 搜索推荐作品
 * @param query 搜索关键词
 * @param locale 语言代码
 */
export async function searchWorks(
  query: string,
  locale: string = 'zh-Hans'
) {
  const strapiLocale = toStrapiLocale(locale)
  return fetchAPI<StrapiResponse<Work[]>>(
    `/works?${createCollectionQuery({
      locale: strapiLocale,
      'filters[$or][0][title][$containsi]': query,
      'filters[$or][1][author][$containsi]': query,
      'filters[$or][2][description][$containsi]': query,
      'filters[$or][3][students][name][$containsi]': query,
      'filters[isActive][$eq]': true,
      sort: 'publishedAt:desc',
      'pagination[limit]': 50,
      populate: '*',
    })}`
  );
}

export async function searchStudents(
  query: string,
  locale: string = 'zh-Hans'
) {
  const strapiLocale = toStrapiLocale(locale)
  return fetchAPI<StrapiResponse<Student[]>>(
    `/students?${createCollectionQuery({
      locale: strapiLocale,
      'filters[$or][0][name][$containsi]': query,
      'filters[$or][1][organization][$containsi]': query,
      'filters[$or][2][school][$containsi]': query,
      'filters[$or][3][bio][$containsi]': query,
      sort: 'updatedAt:desc',
      'pagination[limit]': 50,
      populate: 'avatar',
    })}`
  );
}

/**
 * 获取所有学生列表
 * @param locale 语言代码
 */
export async function getStudents(locale: string = 'zh-Hans', options: StudentListOptions = {}) {
  const strapiLocale = toStrapiLocale(locale)
  const params: Record<string, string | number | boolean | undefined> = {
    locale: strapiLocale,
    sort: 'name:asc',
    populate: 'avatar',
    'pagination[page]': options.page || 1,
    'pagination[pageSize]': Math.min(100, Math.max(1, options.pageSize || 50)),
  }

  const query = options.query?.trim()
  if (query) {
    params['filters[$or][0][name][$containsi]'] = query
    params['filters[$or][1][organization][$containsi]'] = query
  }

  if (options.school && options.school !== 'all') {
    params['filters[school][$eq]'] = options.school
  }

  options.studentIds?.forEach((studentId, index) => {
    params[`filters[id][$in][${index}]`] = studentId
  })

  return fetchAPI<StrapiResponse<Student[]>>(
    `/students?${createCollectionQuery(params)}`
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

export async function searchAllContent(query: string, locale: string = 'zh-Hans') {
  if (!query.trim()) {
    return {
      announcements: { data: [], total: 0 } as SearchSectionResult<Announcement>,
      works: { data: [], total: 0 } as SearchSectionResult<Work>,
      onlineEvents: { data: [], total: 0 } as SearchSectionResult<OnlineEvent>,
      offlineEvents: { data: [], total: 0 } as SearchSectionResult<OfflineEvent>,
      students: { data: [], total: 0 } as SearchSectionResult<Student>,
    }
  }

  const [announcements, works, onlineEvents, offlineEvents, students] = await Promise.all([
    safeSearch('announcements', searchAnnouncements(query, locale)),
    safeSearch('works', searchWorks(query, locale)),
    safeSearch('online events', searchOnlineEvents(query, locale)),
    safeSearch('offline events', searchOfflineEvents(query, locale)),
    safeSearch('students', searchStudents(query, locale)),
  ])

  return { announcements, works, onlineEvents, offlineEvents, students }
}

/**
 * 获取单个学生详情（通过 documentId 或数字 ID）
 */
export async function getStudentById(
  id: ContentIdentifier,
  locale: string = 'zh-Hans'
) {
  const strapiLocale = toStrapiLocale(locale)
  const identifier = String(id).trim()
  const response = await fetchAPI<StrapiResponse<Student[]>>(
    `/students?${createCollectionQuery({
      locale: strapiLocale,
      [isNumericIdentifier(identifier) ? 'filters[id][$eq]' : 'filters[documentId][$eq]']: identifier,
      populate: '*',
    })}`
  );
  return {
    data: response.data?.[0] || null,
    meta: {}
  } as StrapiSingleResponse<Student | null>;
}

/**
 * 学校名称映射（中文默认）
 */
export const schoolNames: Record<SchoolType, string> = {
  abydos: '阿拜多斯',
  gehenna: '格赫娜',
  millennium: '千年',
  trinity: '三一',
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
    gehenna: '格赫娜',
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
