/**
 * Strapi API 工具函数
 * 后端地址：http://localhost:8083
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083';

/**
 * 通用 API 请求函数
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
 * @param locale 语言代码，如 'zh-Hans', 'en', 'ja'
 */
export async function getAnnouncements(locale: string = 'zh-Hans') {
  return fetchAPI<StrapiResponse<Announcement[]>>(
    `/announcements?locale=${locale}&filters[isActive][$eq]=true&sort=priority:desc&populate=*`
  );
}

/**
 * 获取最新线上活动
 * @param limit 返回数量限制
 * @param locale 语言代码
 */
export async function getOnlineEvents(
  limit: number = 10,
  locale: string = 'zh-Hans'
) {
  return fetchAPI<StrapiResponse<OnlineEvent[]>>(
    `/online-events?locale=${locale}&sort=startTime:desc&pagination[limit]=${limit}&populate=*`
  );
}

/**
 * 获取最新线下活动
 * @param limit 返回数量限制
 * @param locale 语言代码
 */
export async function getOfflineEvents(
  limit: number = 10,
  locale: string = 'zh-Hans'
) {
  return fetchAPI<StrapiResponse<OfflineEvent[]>>(
    `/offline-events?locale=${locale}&sort=startTime:desc&pagination[limit]=${limit}&populate=*`
  );
}

/**
 * 获取单个线上活动详情
 */
export async function getOnlineEventById(
  id: number,
  locale: string = 'zh-Hans'
) {
  return fetchAPI<StrapiSingleResponse<OnlineEvent>>(
    `/online-events/${id}?locale=${locale}&populate=*`
  );
}

/**
 * 获取单个线下活动详情
 */
export async function getOfflineEventById(
  id: number,
  locale: string = 'zh-Hans'
) {
  return fetchAPI<StrapiSingleResponse<OfflineEvent>>(
    `/offline-events/${id}?locale=${locale}&populate=*`
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
