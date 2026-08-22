/**
 * 学生域：学生列表、全量翻页、详情与搜索。
 */

import {
  createCollectionQuery,
  fetchAPI,
  isNumericIdentifier,
  toStrapiLocale,
} from './core';
import { getAllCollectionItems } from './misc';
import type {
  ContentIdentifier,
  SchoolType,
  StrapiResponse,
  StrapiSingleResponse,
  Student,
} from './types';

export interface StudentListOptions {
  query?: string;
  school?: SchoolType | 'all';
  page?: number;
  pageSize?: number;
  studentIds?: number[];
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
      populate: 'avatar,school_ref',
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
    populate: 'avatar,school_ref',
    'pagination[page]': options.page || 1,
    'pagination[pageSize]': Math.min(100, Math.max(1, options.pageSize || 50)),
  }

  const query = options.query?.trim()
  if (query) {
    params['filters[$and][0][$or][0][name][$containsi]'] = query
    params['filters[$and][0][$or][1][organization][$containsi]'] = query
  }

  if (options.school && options.school !== 'all') {
    // 同时匹配后台维护的学院关联与旧枚举字段（两者的 slug/值一致）
    params['filters[$and][1][$or][0][school_ref][slug][$eq]'] = options.school
    params['filters[$and][1][$or][1][school][$eq]'] = options.school
  }

  options.studentIds?.forEach((studentId, index) => {
    params[`filters[id][$in][${index}]`] = studentId
  })

  return fetchAPI<StrapiResponse<Student[]>>(
    `/students?${createCollectionQuery(params)}`
  );
}

/**
 * 获取全部学生（自动翻页），用于筛选器等需要完整名单的场景
 */
export async function getAllStudents(locale: string = 'zh-Hans') {
  const items = await getAllCollectionItems<Student>('students', locale, {
    populate: 'avatar,school_ref',
    filters: { sort: 'name:asc' },
  });
  return { data: items, meta: {} } as { data: Student[]; meta: Record<string, never> };
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
      populate: 'avatar,school_ref',
    })}`
  );
  return {
    data: response.data?.[0] || null,
    meta: {}
  } as StrapiSingleResponse<Student | null>;
}
