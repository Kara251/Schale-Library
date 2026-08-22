/**
 * Strapi API 核心工具：通用请求、查询串构建、多语言回退取数。
 * 本文件不 import 任何域模块（events/works/students/research/misc），防止循环依赖。
 */

import { STRAPI_API_URL as API_URL } from '@/lib/config';
import type {
  ContentIdentifier,
  StrapiResponse,
  StrapiSingleResponse,
} from './types';

export type { ContentIdentifier };

const API_TIMEOUT_MS = Math.max(1000, Number(process.env.API_TIMEOUT_MS || '10000'));

/**
 * 通用 API 请求函数
 * 支持 Next.js 服务端缓存和重验证
 */
export async function fetchAPI<T>(
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

export function toStrapiLocale(locale: string = 'zh-Hans') {
  if (locale === 'zh-CN') {
    return 'zh-Hans';
  }

  return locale || 'zh-Hans';
}

export function isNumericIdentifier(identifier: ContentIdentifier) {
  return /^\d+$/.test(String(identifier).trim());
}

export function createCollectionQuery(params: Record<string, string | number | boolean | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }

    searchParams.set(key, String(value));
  }

  return searchParams.toString();
}

function getFallbackLocales(locale: string = 'zh-Hans') {
  const primaryLocale = toStrapiLocale(locale);
  return primaryLocale === 'zh-Hans' ? [primaryLocale] : [primaryLocale, 'zh-Hans'];
}

export async function fetchLocalizedSingleBySlug<T>(
  collection: string,
  slug: string,
  locale: string,
  params: Record<string, string | number | boolean | undefined> = {}
) {
  // 性能：候选 locale 并发请求后按优先级择优（原串行最坏 2 次往返）。
  // 语义保持：任一请求抛错则整体抛错（与原串行行为一致）；全部为空返回 null。
  const results = await Promise.allSettled(
    getFallbackLocales(locale).map((candidateLocale) =>
      fetchAPI<StrapiResponse<T[]>>(
        `/${collection}?${createCollectionQuery({
          locale: candidateLocale,
          'filters[slug][$eq]': slug,
          ...params,
        })}`
      )
    )
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.data?.[0]) {
      return { data: result.value.data[0], meta: {} } as StrapiSingleResponse<T | null>;
    }
  }
  const firstRejected = results.find((result) => result.status === 'rejected');
  if (firstRejected && firstRejected.status === 'rejected') {
    throw firstRejected.reason;
  }
  return { data: null, meta: {} } as StrapiSingleResponse<T | null>;
}

export async function fetchLocalizedCollectionWithFallback<T>(
  collection: string,
  locale: string,
  params: Record<string, string | number | boolean | undefined> = {}
) {
  // 性能：同上，候选 locale 并发；全部为空时回退最后一个成功响应（zh-Hans）。
  const results = await Promise.allSettled(
    getFallbackLocales(locale).map((candidateLocale) =>
      fetchAPI<StrapiResponse<T[]>>(
        `/${collection}?${createCollectionQuery({
          locale: candidateLocale,
          ...params,
        })}`
      )
    )
  );

  let lastResponse: StrapiResponse<T[]> | null = null;
  for (const result of results) {
    if (result.status === 'fulfilled') {
      lastResponse = result.value;
      if ((result.value.data?.length || 0) > 0) {
        return result.value;
      }
    }
  }
  const firstRejected = results.find((result) => result.status === 'rejected');
  if (firstRejected && firstRejected.status === 'rejected') {
    throw firstRejected.reason;
  }
  return lastResponse || { data: [], meta: { pagination: { page: 1, pageSize: 0, pageCount: 0, total: 0 } } };
}

export function getContentEntryPathId(entry: { documentId?: string; id: number }) {
  return entry.documentId || String(entry.id);
}
