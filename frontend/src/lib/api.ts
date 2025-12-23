/**
 * Strapi API 工具函数
 * 后端地址：http://localhost:8083
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083';

/**
 * 通用 API 请求函数
 * 支持 Next.js 服务端缓存和重验证
 */
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}/api${endpoint}`;

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
    // Next.js 缓存配置：10秒后重新验证（快速刷新新发布的内容）
    next: { revalidate: 10 },
  };

  const response = await fetch(url, {
    ...defaultOptions,
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * 获取所有公告（用于轮播图）
 * 注：不按语言过滤，显示所有内容
 */
export async function getAnnouncements(locale?: string) {
  return fetchAPI<StrapiResponse<Announcement[]>>(
    `/announcements?filters[isActive][$eq]=true&sort=priority:desc&populate=*`
  );
}

/**
 * 获取最新线上活动
 * @param limit 返回数量限制
 */
export async function getOnlineEvents(
  limit: number = 10,
  locale?: string
) {
  return fetchAPI<StrapiResponse<OnlineEvent[]>>(
    `/online-events?sort=startTime:desc&pagination[limit]=${limit}&populate=*`
  );
}

/**
 * 获取最新线下活动
 * @param limit 返回数量限制
 */
export async function getOfflineEvents(
  limit: number = 10,
  locale?: string
) {
  return fetchAPI<StrapiResponse<OfflineEvent[]>>(
    `/offline-events?sort=startTime:desc&pagination[limit]=${limit}&populate=*`
  );
}

/**
 * 获取单个线上活动详情（通过数字ID）
 */
export async function getOnlineEventById(
  id: number,
  locale: string = 'zh-Hans'
) {
  const strapiLocale = locale === 'zh-Hans' ? 'zh-CN' : locale
  // 使用filter查询代替documentId路径，支持Strapi v5
  const response = await fetchAPI<StrapiResponse<OnlineEvent[]>>(
    `/online-events?locale=${strapiLocale}&filters[id][$eq]=${id}&populate=*`
  );
  // 转换为单个响应格式
  return {
    data: response.data?.[0] || null,
    meta: {}
  } as StrapiSingleResponse<OnlineEvent>;
}

/**
 * 获取单个线下活动详情（通过数字ID）
 */
export async function getOfflineEventById(
  id: number,
  locale: string = 'zh-Hans'
) {
  const strapiLocale = locale === 'zh-Hans' ? 'zh-CN' : locale
  // 使用filter查询代替documentId路径，支持Strapi v5
  const response = await fetchAPI<StrapiResponse<OfflineEvent[]>>(
    `/offline-events?locale=${strapiLocale}&filters[id][$eq]=${id}&populate=*`
  );
  // 转换为单个响应格式
  return {
    data: response.data?.[0] || null,
    meta: {}
  } as StrapiSingleResponse<OfflineEvent>;
}

/**
 * 获取单个公告详情（通过数字ID）
 */
export async function getAnnouncementById(
  id: number,
  locale: string = 'zh-Hans'
) {
  const strapiLocale = locale === 'zh-Hans' ? 'zh-CN' : locale
  // 使用filter查询代替documentId路径，支持友好的数字ID URL
  const response = await fetchAPI<StrapiResponse<Announcement[]>>(
    `/announcements?locale=${strapiLocale}&filters[id][$eq]=${id}&populate=*`
  );
  // 转换为单个响应格式
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
  const strapiLocale = locale === 'zh-Hans' ? 'zh-CN' : locale
  return fetchAPI<StrapiResponse<Announcement[]>>(
    `/announcements?locale=${strapiLocale}&filters[title][$containsi]=${encodeURIComponent(query)}&populate=*`
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
  const strapiLocale = locale === 'zh-Hans' ? 'zh-CN' : locale
  return fetchAPI<StrapiResponse<OnlineEvent[]>>(
    `/online-events?locale=${strapiLocale}&filters[title][$containsi]=${encodeURIComponent(query)}&populate=*`
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
  const strapiLocale = locale === 'zh-Hans' ? 'zh-CN' : locale
  return fetchAPI<StrapiResponse<OfflineEvent[]>>(
    `/offline-events?locale=${strapiLocale}&filters[title][$containsi]=${encodeURIComponent(query)}&populate=*`
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
  meta: {};
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

/**
 * 获取推荐作品列表
 * @param limit 返回数量限制
 */
export async function getWorks(limit: number = 20) {
  return fetchAPI<StrapiResponse<Work[]>>(
    `/works?filters[isActive][$eq]=true&sort=publishedAt:desc&pagination[limit]=${limit}&populate=*`
  );
}

/**
 * 获取单个推荐作品详情（通过数字ID）
 */
export async function getWorkById(
  id: number,
  locale: string = 'zh-Hans'
) {
  const strapiLocale = locale === 'zh-Hans' ? 'zh-CN' : locale
  // 使用filter查询代替documentId路径，支持Strapi v5
  const response = await fetchAPI<StrapiResponse<Work[]>>(
    `/works?locale=${strapiLocale}&filters[id][$eq]=${id}&populate=*`
  );
  // 转换为单个响应格式
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
  const strapiLocale = locale === 'zh-Hans' ? 'zh-CN' : locale
  return fetchAPI<StrapiResponse<Work[]>>(
    `/works?locale=${strapiLocale}&filters[title][$containsi]=${encodeURIComponent(query)}&populate=*`
  );
}

/**
 * 获取所有学生列表
 * @param locale 语言代码
 */
export async function getStudents(locale: string = 'zh-Hans') {
  const strapiLocale = locale === 'zh-Hans' ? 'zh-CN' : locale
  return fetchAPI<StrapiResponse<Student[]>>(
    `/students?locale=${strapiLocale}&sort=name:asc&populate=avatar&pagination[limit]=500`
  );
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

