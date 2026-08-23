/**
 * 创作者域：创作者列表（最新收录优先）、详情（关联学生 + 代表作）、外链安全校验。
 *
 * 端点（server/src/content 暂无 creators 路由，按同风格定义待对拍）：
 * - GET /creators?locale=&sort[0]=createdAt:desc&pagination[page|pageSize]
 * - GET /creators/:slug?locale=&populate=students,representativeWorks
 */
import { createCollectionQuery, fetchAPI, toStrapiLocale } from './core';
import type { StrapiResponse, StrapiSingleResponse, Student } from './types';

/** 代表作（组件语义，随创作者详情一并返回） */
export interface RepresentativeWork {
  id: number;
  title: string;
  url: string;
  coverUrl?: string;
  note?: string;
  sortOrder?: number;
}

/** 创作者（bio 为服务端按 locale 解析后的单字符串） */
export interface Creator {
  id: number;
  documentId: string;
  slug: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  platform: string;
  platformUid?: string;
  homepageUrl?: string;
  isFeatured: boolean;
  featuredPriority: number;
  students: Student[];
  representativeWorks: RepresentativeWork[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatorListOptions {
  page?: number;
  pageSize?: number;
  /** 覆盖默认排序（默认 createdAt:desc = 最新收录优先） */
  sort?: string;
}

/**
 * 获取创作者列表（中立收录站：默认最新收录优先，无推荐/精选语义）
 */
export async function getCreators(locale: string = 'zh-Hans', options: CreatorListOptions = {}) {
  const strapiLocale = toStrapiLocale(locale);
  const params: Record<string, string | number | boolean | undefined> = {
    locale: strapiLocale,
    'sort[0]': options.sort || 'createdAt:desc',
    'pagination[page]': Math.max(1, options.page || 1),
    'pagination[pageSize]': Math.min(100, Math.max(1, options.pageSize || 50)),
  };

  return fetchAPI<StrapiResponse<Creator[]>>(
    `/creators?${createCollectionQuery(params)}`
  );
}

/**
 * 获取单个创作者详情（含关联学生 populate 与代表作）
 */
export async function getCreatorBySlug(slug: string, locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  const response = await fetchAPI<StrapiSingleResponse<Creator | null>>(
    `/creators/${encodeURIComponent(slug)}?${createCollectionQuery({
      locale: strapiLocale,
      populate: 'students,representativeWorks',
    })}`
  );
  return response;
}

/**
 * S1 外链渲染校验：仅放行 http(s) 绝对地址，其余（javascript: 等协议相对、非法输入）一律返回 null。
 */
export function safeExternalUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}
