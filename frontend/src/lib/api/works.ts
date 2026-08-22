/**
 * 作品域：作品列表、详情、搜索与按作者/学生维度的取数。
 */

import {
  createCollectionQuery,
  fetchAPI,
  isNumericIdentifier,
  toStrapiLocale,
} from './core';
import { eventPageMeta } from './events';
import type {
  ContentIdentifier,
  SchoolType,
  StrapiMedia,
  StrapiResponse,
  StrapiSingleResponse,
  Student,
} from './types';

export const WORK_CARD_POPULATE_PARAMS = {
  'populate[coverImage]': true,
  'populate[students][populate][avatar]': true,
} as const;

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
  isFeatured?: boolean;
  featuredPriority?: number;
  featuredReason?: string;
  featuredUntil?: string;
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

export interface WorkListOptions {
  query?: string;
  nature?: Work['nature'] | 'all';
  workType?: Work['workType'] | 'all';
  sourcePlatform?: NonNullable<Work['sourcePlatform']> | 'all';
  school?: SchoolType | 'all';
  studentIds?: number[];
  featured?: boolean;
  excludeFeatured?: boolean;
  featuredActiveOnly?: boolean;
  sort?: 'latest' | 'recommended';
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

  if (options.featured) {
    params['filters[isFeatured][$eq]'] = true;
  }

  if (options.excludeFeatured) {
    params['filters[isFeatured][$ne]'] = true;
  }

  if (options.featuredActiveOnly) {
    params['filters[$and][0][$or][0][featuredUntil][$null]'] = true;
    params['filters[$and][0][$or][1][featuredUntil][$gte]'] = new Date().toISOString();
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
    'pagination[pageSize]': options.pageSize || limit,
    ...WORK_CARD_POPULATE_PARAMS,
  }
  if (options.sort === 'recommended') {
    params['sort[0]'] = 'isFeatured:desc'
    params['sort[1]'] = 'featuredPriority:desc'
    params['sort[2]'] = 'publishedAt:desc'
  } else {
    params.sort = 'publishedAt:desc'
  }
  appendWorkFilters(params, options)

  return fetchAPI<StrapiResponse<Work[]>>(
    `/works?${createCollectionQuery(params)}`
  );
}

export async function getFeaturedWorks(limit: number = 6, locale: string = 'zh-Hans') {
  const featured = await getWorks(limit, locale, {
    featured: true,
    featuredActiveOnly: true,
    sort: 'recommended',
    pageSize: limit,
  });
  const featuredItems = featured.data || [];

  if (featuredItems.length >= limit) {
    return featured;
  }

  const latest = await getWorks(limit, locale, {
    excludeFeatured: true,
    sort: 'latest',
    pageSize: limit - featuredItems.length,
  });

  return {
    data: [...featuredItems, ...(latest.data || [])].slice(0, limit),
    meta: eventPageMeta(1, limit, (featured.meta.pagination?.total || 0) + (latest.meta.pagination?.total || 0)),
  } as StrapiResponse<Work[]>;
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
      ...WORK_CARD_POPULATE_PARAMS,
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
      ...WORK_CARD_POPULATE_PARAMS,
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
    ...WORK_CARD_POPULATE_PARAMS,
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
      ...WORK_CARD_POPULATE_PARAMS,
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
      ...WORK_CARD_POPULATE_PARAMS,
    })}`
  );
}
