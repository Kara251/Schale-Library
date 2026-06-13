/**
 * Strapi API 工具函数
 * 后端地址：http://localhost:8083
 */

import { STRAPI_API_URL as API_URL } from '@/lib/config';
import { eventLocationSearchTerms, normalizeEventLocationName } from '@/lib/utils/event-location';
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

const COVER_IMAGE_POPULATE_PARAMS = {
  'populate[coverImage]': true,
} as const;

const WORK_CARD_POPULATE_PARAMS = {
  'populate[coverImage]': true,
  'populate[students][populate][avatar]': true,
} as const;

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
  return fetchAPI<StrapiResponse<FriendLink[]>>(
    `/friend-links?${createCollectionQuery({
      locale: strapiLocale,
      'filters[isActive][$eq]': true,
      'sort[0]': 'priority:desc',
      'sort[1]': 'publishedAt:desc',
      'pagination[pageSize]': limit,
      'populate[icon]': true,
    })}`
  );
}

export type EventNatureFilter = 'all' | 'official' | 'fanmade';
export type EventStatusFilter = 'all' | 'upcoming' | 'ongoing' | 'ended';
export type EventSortMode = 'relevant' | 'startTime' | 'endTime';
export type EventKindFilter = 'all' | 'online' | 'offline';
export type EventFormat = 'stream' | 'stage' | 'only' | 'exhibition' | 'contest' | 'uncategorized' | 'live_stream' | 'live_show' | 'only_event' | 'collaboration' | 'campaign' | 'meetup' | 'release' | 'other';
export type EventStatusOverride = 'normal' | 'postponed' | 'cancelled' | 'rescheduled' | 'ticketing' | 'sold_out' | 'changed';
export type EventTicketStatus = 'unknown' | 'free' | 'ticketing' | 'lottery' | 'sold_out' | 'closed';
type EventCollection = 'online-events' | 'offline-events';
export type EventKind = 'online' | 'offline';

export interface EventLocationRecord {
  kind: EventKind;
  country: string;
  region: string;
  city: string;
}

export interface EventListOptions {
  query?: string;
  kind?: EventKindFilter;
  nature?: EventNatureFilter;
  status?: EventStatusFilter;
  country?: string;
  region?: string;
  city?: string;
  sort?: EventSortMode;
  page?: number;
  pageSize?: number;
  excludeId?: number;
}

function appendEventFilters(
  params: Record<string, string | number | boolean | undefined>,
  options: EventListOptions,
  kind: EventKind,
  nowIso: string,
  statusOverride?: EventStatusFilter
) {
  const query = options.query?.trim();
  const status = statusOverride || options.status || 'all';
  let andIndex = 0;
  const addLocationFilter = (value: string | undefined, fields: string[]) => {
    const terms = eventLocationSearchTerms(value);
    if (!terms.length) return;

    let optionIndex = 0;
    fields.forEach((field) => {
      terms.forEach((term) => {
        params[`filters[$and][${andIndex}][$or][${optionIndex}][${field}][$containsi]`] = term;
        optionIndex++;
      });
    });
    andIndex++;
  };

  if (query) {
    params['filters[$or][0][title][$containsi]'] = query;
    params['filters[$or][1][organizer][$containsi]'] = query;
    params['filters[$or][2][description][$containsi]'] = query;
    if (kind === 'offline') {
      params['filters[$or][3][location][$containsi]'] = query;
      params['filters[$or][4][guests][$containsi]'] = query;
      params['filters[$or][5][country][$containsi]'] = query;
      params['filters[$or][6][region][$containsi]'] = query;
      params['filters[$or][7][city][$containsi]'] = query;
      params['filters[$or][8][venue][$containsi]'] = query;
      params['filters[$or][9][address][$containsi]'] = query;
      params['filters[$or][10][tags][$containsi]'] = query;
      params['filters[$or][11][ticketPriceText][$containsi]'] = query;
      params['filters[$or][12][sourceName][$containsi]'] = query;
    } else {
      params['filters[$or][3][country][$containsi]'] = query;
      params['filters[$or][4][region][$containsi]'] = query;
      params['filters[$or][5][tags][$containsi]'] = query;
      params['filters[$or][6][ticketPriceText][$containsi]'] = query;
      params['filters[$or][7][sourceName][$containsi]'] = query;
    }
  }

  if (options.nature && options.nature !== 'all') {
    params['filters[nature][$eq]'] = options.nature;
  }

  if (kind === 'online') {
    addLocationFilter(options.country, ['country', 'region']);
    addLocationFilter(options.region, ['region', 'country']);
    if (options.city?.trim()) {
      params['filters[id][$eq]'] = -1;
    }
  } else {
    addLocationFilter(options.country, ['country', 'location']);
    addLocationFilter(options.region, ['region', 'location']);
    addLocationFilter(options.city, ['city', 'location', 'venue']);
  }

  if (options.excludeId) {
    params['filters[id][$ne]'] = options.excludeId;
  }

  if (status === 'upcoming') {
    params['filters[startTime][$gt]'] = nowIso;
  }
  if (status === 'ongoing') {
    params['filters[startTime][$lte]'] = nowIso;
    params['filters[endTime][$gte]'] = nowIso;
  }
  if (status === 'ended') {
    params['filters[endTime][$lt]'] = nowIso;
  }
}

function eventPageMeta(page: number, pageSize: number, total: number) {
  return {
    pagination: {
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      total,
    },
  };
}

async function fetchEventPage<T>(
  collection: EventCollection,
  params: Record<string, string | number | boolean | undefined>,
  populateParams: Record<string, string | number | boolean | undefined> = COVER_IMAGE_POPULATE_PARAMS
) {
  return fetchAPI<StrapiResponse<T[]>>(
    `/${collection}?${createCollectionQuery({
      ...params,
      ...populateParams,
    })}`
  );
}

async function getHomeRelevantEvents<T>(
  collection: EventCollection,
  kind: EventKind,
  limit: number,
  locale: string
): Promise<StrapiResponse<T[]>> {
  const strapiLocale = toStrapiLocale(locale);
  const nowIso = new Date().toISOString();
  const base = {
    locale: strapiLocale,
  };

  const activeParams: Record<string, string | number | boolean | undefined> = {
    ...base,
    sort: 'startTime:asc',
    'filters[endTime][$gte]': nowIso,
    'pagination[limit]': limit,
  };
  appendEventFilters(activeParams, {}, kind, nowIso);

  const activePage = await fetchEventPage<T>(collection, activeParams);
  const data = [...(activePage.data || [])];
  let total = activePage.meta.pagination?.total || data.length;

  if (data.length < limit) {
    const endedParams: Record<string, string | number | boolean | undefined> = {
      ...base,
      sort: 'endTime:desc',
      'pagination[limit]': limit - data.length,
    };
    appendEventFilters(endedParams, {}, kind, nowIso, 'ended');
    const endedPage = await fetchEventPage<T>(collection, endedParams);
    total += endedPage.meta.pagination?.total || endedPage.data?.length || 0;
    data.push(...(endedPage.data || []));
  }

  return {
    data: data.slice(0, limit),
    meta: eventPageMeta(1, limit, total),
  };
}

async function getRelevantEvents<T>(
  collection: EventCollection,
  kind: EventKind,
  limit: number,
  locale: string,
  options: EventListOptions
): Promise<StrapiResponse<T[]>> {
  const strapiLocale = toStrapiLocale(locale);
  const nowIso = new Date().toISOString();
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, options.pageSize || limit);
  const start = (page - 1) * pageSize;
  const base = {
    locale: strapiLocale,
  };

  const activeCountParams: Record<string, string | number | boolean | undefined> = {
    ...base,
    sort: 'startTime:asc',
    'pagination[pageSize]': 1,
    'pagination[page]': 1,
  };
  appendEventFilters(activeCountParams, options, kind, nowIso);
  activeCountParams['filters[endTime][$gte]'] = nowIso;

  const endedCountParams: Record<string, string | number | boolean | undefined> = {
    ...base,
    sort: 'endTime:desc',
    'pagination[pageSize]': 1,
    'pagination[page]': 1,
  };
  appendEventFilters(endedCountParams, options, kind, nowIso, 'ended');

  const [activeCount, endedCount] = await Promise.all([
    fetchEventPage<T>(collection, activeCountParams, {}),
    fetchEventPage<T>(collection, endedCountParams, {}),
  ]);
  const activeTotal = activeCount.meta.pagination?.total || 0;
  const endedTotal = endedCount.meta.pagination?.total || 0;
  const data: T[] = [];

  if (start < activeTotal) {
    const activeLimit = Math.min(pageSize, activeTotal - start);
    const activeParams: Record<string, string | number | boolean | undefined> = {
      ...base,
      sort: 'startTime:asc',
      'pagination[start]': start,
      'pagination[limit]': activeLimit,
    };
    appendEventFilters(activeParams, options, kind, nowIso);
    activeParams['filters[endTime][$gte]'] = nowIso;
    const activePage = await fetchEventPage<T>(collection, activeParams);
    data.push(...(activePage.data || []));
  }

  if (data.length < pageSize) {
    const endedStart = Math.max(0, start - activeTotal);
    const endedParams: Record<string, string | number | boolean | undefined> = {
      ...base,
      sort: 'endTime:desc',
      'pagination[start]': endedStart,
      'pagination[limit]': pageSize - data.length,
    };
    appendEventFilters(endedParams, options, kind, nowIso, 'ended');
    const endedPage = await fetchEventPage<T>(collection, endedParams);
    data.push(...(endedPage.data || []));
  }

  return {
    data,
    meta: eventPageMeta(page, pageSize, activeTotal + endedTotal),
  };
}

async function getEventsForCollection<T>(
  collection: EventCollection,
  kind: EventKind,
  limit: number,
  locale: string,
  options: EventListOptions = {}
) {
  const sortMode = options.sort || 'relevant';
  const status = options.status || 'all';

  if (sortMode === 'relevant' && status === 'all') {
    return getRelevantEvents<T>(collection, kind, limit, locale, options);
  }

  const strapiLocale = toStrapiLocale(locale);
  const nowIso = new Date().toISOString();
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, options.pageSize || limit);
  const params: Record<string, string | number | boolean | undefined> = {
    locale: strapiLocale,
    sort: sortMode === 'endTime' ? 'endTime:desc' : 'startTime:desc',
    'pagination[pageSize]': pageSize,
    'pagination[page]': page,
  };

  appendEventFilters(params, { ...options, status }, kind, nowIso);
  return fetchEventPage<T>(collection, params);
}

/**
 * 获取最新线上活动
 * @param limit 返回数量限制
 */
export async function getOnlineEvents(
  limit: number = 10,
  locale: string = 'zh-Hans',
  options: EventListOptions = {}
) {
  return getEventsForCollection<OnlineEvent>('online-events', 'online', limit, locale, options);
}

/**
 * 获取最新线下活动
 * @param limit 返回数量限制
 */
export async function getOfflineEvents(
  limit: number = 10,
  locale: string = 'zh-Hans',
  options: EventListOptions = {}
) {
  return getEventsForCollection<OfflineEvent>('offline-events', 'offline', limit, locale, options);
}

export async function getHomeOnlineEvents(limit: number = 6, locale: string = 'zh-Hans') {
  return getHomeRelevantEvents<OnlineEvent>('online-events', 'online', limit, locale);
}

export async function getHomeOfflineEvents(limit: number = 6, locale: string = 'zh-Hans') {
  return getHomeRelevantEvents<OfflineEvent>('offline-events', 'offline', limit, locale);
}

export interface EventListItem {
  event: OnlineEvent | OfflineEvent;
  type: EventKind;
}

function compareEventsForDisplay(a: EventListItem, b: EventListItem, sortMode: EventSortMode = 'relevant') {
  const now = Date.now();
  const aEnd = new Date(a.event.endTime).getTime();
  const bEnd = new Date(b.event.endTime).getTime();
  const aStart = new Date(a.event.startTime).getTime();
  const bStart = new Date(b.event.startTime).getTime();
  if (sortMode === 'startTime') return bStart - aStart;
  if (sortMode === 'endTime') return bEnd - aEnd;
  const statusRank = (start: number, end: number) => {
    if (start <= now && end >= now) return 0;
    if (start > now) return 1;
    return 2;
  };
  const aRank = statusRank(aStart, aEnd);
  const bRank = statusRank(bStart, bEnd);
  if (aRank !== bRank) return aRank - bRank;
  if (aRank === 2) return bEnd - aEnd;
  return aStart - bStart;
}

async function fetchAllEventsForCollection<T>(
  collection: EventCollection,
  kind: EventKind,
  locale: string,
  options: EventListOptions,
  nowIso: string
): Promise<T[]> {
  const strapiLocale = toStrapiLocale(locale);
  const items: T[] = [];
  let page = 1;
  let pageCount = 1;

  do {
    const params: Record<string, string | number | boolean | undefined> = {
      locale: strapiLocale,
      sort: 'startTime:desc',
      'pagination[page]': page,
      'pagination[pageSize]': 100,
    };
    appendEventFilters(params, options, kind, nowIso);
    const response = await fetchEventPage<T>(collection, params);
    items.push(...(response.data || []));
    pageCount = response.meta?.pagination?.pageCount || 1;
    page++;
  } while (page <= pageCount);

  return items;
}

async function fetchEventLocationRecordsForCollection(
  collection: EventCollection,
  kind: EventKind,
  locale: string
): Promise<EventLocationRecord[]> {
  const strapiLocale = toStrapiLocale(locale);
  const records: EventLocationRecord[] = [];
  const seen = new Set<string>();
  const fields = kind === 'offline'
    ? ['country', 'region', 'city']
    : ['country', 'region'];
  let page = 1;
  let pageCount = 1;

  do {
    const fieldParams = Object.fromEntries(fields.map((field, index) => [`fields[${index}]`, field]));
    const response = await fetchAPI<StrapiResponse<Array<Partial<EventLocationRecord>>>>(
      `/${collection}?${createCollectionQuery({
        locale: strapiLocale,
        sort: 'startTime:desc',
        'pagination[page]': page,
        'pagination[pageSize]': 100,
        ...fieldParams,
      })}`
    );

    for (const event of response.data || []) {
      const record = {
        kind,
        country: normalizeEventLocationName(event.country),
        region: normalizeEventLocationName(event.region),
        city: kind === 'offline' ? normalizeEventLocationName(event.city) : '',
      };
      if (!record.country && !record.region && !record.city) {
        continue;
      }
      const key = `${record.kind}|${record.country}|${record.region}|${record.city}`;
      if (!seen.has(key)) {
        seen.add(key);
        records.push(record);
      }
    }

    pageCount = response.meta?.pagination?.pageCount || 1;
    page++;
  } while (page <= pageCount);

  return records;
}

export async function getEventLocationRecords(
  locale: string = 'zh-Hans',
  kind: EventKindFilter = 'all'
): Promise<EventLocationRecord[]> {
  const [online, offline] = await Promise.all([
    kind === 'offline'
      ? Promise.resolve([] as EventLocationRecord[])
      : fetchEventLocationRecordsForCollection('online-events', 'online', locale),
    kind === 'online'
      ? Promise.resolve([] as EventLocationRecord[])
      : fetchEventLocationRecordsForCollection('offline-events', 'offline', locale),
  ]);

  return [...online, ...offline];
}

export async function getAllEvents(
  limit: number = 24,
  locale: string = 'zh-Hans',
  options: EventListOptions = {}
): Promise<StrapiResponse<EventListItem[]>> {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, options.pageSize || limit);
  const nowIso = new Date().toISOString();

  // 一次性取全两个集合再统一排序切片，避免跨页丢失/重复（活动量级小，可承受）。
  const [online, offline] = await Promise.all([
    options.kind === 'offline'
      ? Promise.resolve([] as OnlineEvent[])
      : fetchAllEventsForCollection<OnlineEvent>('online-events', 'online', locale, options, nowIso),
    options.kind === 'online'
      ? Promise.resolve([] as OfflineEvent[])
      : fetchAllEventsForCollection<OfflineEvent>('offline-events', 'offline', locale, options, nowIso),
  ]);

  const merged = [
    ...online.map((event) => ({ event, type: 'online' as const })),
    ...offline.map((event) => ({ event, type: 'offline' as const })),
  ].sort((a, b) => compareEventsForDisplay(a, b, options.sort || 'relevant'));
  const start = (page - 1) * pageSize;
  const total = merged.length;

  return {
    data: merged.slice(start, start + pageSize),
    meta: eventPageMeta(page, pageSize, total),
  };
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
      ...COVER_IMAGE_POPULATE_PARAMS,
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
      ...COVER_IMAGE_POPULATE_PARAMS,
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
      ...COVER_IMAGE_POPULATE_PARAMS,
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
      'filters[isActive][$eq]': true,
      sort: 'priority:desc',
      'pagination[limit]': 50,
      ...COVER_IMAGE_POPULATE_PARAMS,
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
      'filters[$or][3][country][$containsi]': query,
      'filters[$or][4][region][$containsi]': query,
      'filters[$or][5][platform][$containsi]': query,
      'filters[$or][6][tags][$containsi]': query,
      'filters[$or][7][ticketPriceText][$containsi]': query,
      'filters[$or][8][sourceName][$containsi]': query,
      sort: 'startTime:desc',
      'pagination[limit]': 50,
      ...COVER_IMAGE_POPULATE_PARAMS,
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
      'filters[$or][5][country][$containsi]': query,
      'filters[$or][6][region][$containsi]': query,
      'filters[$or][7][city][$containsi]': query,
      'filters[$or][8][venue][$containsi]': query,
      'filters[$or][9][address][$containsi]': query,
      'filters[$or][10][tags][$containsi]': query,
      'filters[$or][11][ticketPriceText][$containsi]': query,
      'filters[$or][12][sourceName][$containsi]': query,
      sort: 'startTime:desc',
      'pagination[limit]': 50,
      ...COVER_IMAGE_POPULATE_PARAMS,
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
  isPinned?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: string;
}

export interface FriendLink {
  id: number;
  documentId: string;
  title: string;
  description?: string;
  url: string;
  icon?: StrapiMedia;
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
  eventFormat?: EventFormat | null;
  statusOverride?: EventStatusOverride | null;
  country?: string;
  region?: string;
  platform?: string;
  startTime: string;
  endTime: string;
  link?: string;
  ticketUrl?: string;
  ticketStatus?: EventTicketStatus | null;
  ticketPriceText?: string;
  priceMin?: number | string | null;
  priceMax?: number | string | null;
  currency?: string;
  coverImage?: StrapiMedia;
  organizer?: string;
  organizerVerified?: boolean;
  tags?: string;
  sourcePlatform?: string | null;
  sourceName?: string;
  sourceUrl?: string;
  lastVerifiedAt?: string;
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
  eventFormat?: EventFormat | null;
  statusOverride?: EventStatusOverride | null;
  country?: string;
  region?: string;
  city?: string;
  venue?: string;
  address?: string;
  location: string;
  mapUrl?: string;
  guests?: string;
  startTime: string;
  endTime: string;
  link?: string;
  ticketUrl?: string;
  ticketStatus?: EventTicketStatus | null;
  ticketPriceText?: string;
  priceMin?: number | string | null;
  priceMax?: number | string | null;
  currency?: string;
  coverImage?: StrapiMedia;
  organizer?: string;
  organizerVerified?: boolean;
  tags?: string;
  sourcePlatform?: string | null;
  sourceName?: string;
  sourceUrl?: string;
  lastVerifiedAt?: string;
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

/**
 * 学生类型
 */
export type SchoolType = 'abydos' | 'gehenna' | 'millennium' | 'trinity' | 'hyakkiyako' | 'shanhaijing' | 'redwinter' | 'valkyrie' | 'arius' | 'srt' | 'tokiwadai' | 'kronos' | 'other';

export interface Student {
  id: number;
  documentId: string;
  name: string;
  school?: SchoolType;
  school_ref?: { id: number; documentId: string; name: string; slug: string; color?: string } | null;
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
      populate: 'avatar,school_ref',
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

// ─── Research Archives ───────────────────────────────────────────────────────

export type ResearchStance = 'official' | 'personal' | 'speculative';
export type ResearchMediaType = 'character' | 'story' | 'concept' | 'setting' | 'organization';
export type ResearchAffiliation =
  | 'millennium' | 'trinity' | 'gehenna' | 'hyakkiyako' | 'shanhaijing'
  | 'redwinter' | 'abydos' | 'schale' | 'extra' | 'mainline' | 'other';
export type CitationSourceType = 'game_line' | 'interview' | 'visual' | 'external';
export type CitationConfidence = 'official' | 'derived' | 'conjecture';
export type ResearchRelationType = 'related' | 'prototype' | 'echoes' | 'extends' | 'contradicts' | 'prerequisite';
export type ResearchSubjectType = 'school' | 'organization' | 'club' | 'character' | 'location' | 'concept' | 'item';
export type ResearchRevisionType = 'created' | 'updated' | 'confirmed' | 'refuted';
export type ResearchPathDifficulty = 'intro' | 'deep' | 'expert';

export interface ResearchTheme {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  curated_intro?: string;
  locale: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface ResearchCitation {
  id: number;
  documentId: string;
  claim_short: string;
  source_type: CitationSourceType;
  source_ref?: string;
  source_image?: StrapiMedia;
  source_quote?: string;
  confidence: CitationConfidence;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface ResearchRelatedLink {
  id: number;
  target_entry?: Pick<ResearchEntry, 'id' | 'documentId' | 'title' | 'slug'>;
  relation_type?: ResearchRelationType;
  curate_note?: string;
  order: number;
}

export interface ResearchRevision {
  id: number;
  date: string;
  revision_type: ResearchRevisionType;
  note?: string;
}

export interface ResearchSubject {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  subject_type: ResearchSubjectType;
  description?: string;
  cover?: StrapiMedia;
  students?: Student[];
  entries?: ResearchEntry[];
  locale: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface ResearchPath {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  description?: string;
  difficulty?: ResearchPathDifficulty;
  order: number;
  steps?: ResearchPathStep[];
  locale: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface ResearchEntry {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  stance: ResearchStance;
  summary?: string;
  body?: string;
  media_type: ResearchMediaType;
  spoiler_scope?: string | null;
  affiliations?: ResearchAffiliation[];
  themes?: ResearchTheme[];
  citations?: ResearchCitation[];
  subjects?: Pick<ResearchSubject, 'id' | 'documentId' | 'name' | 'slug' | 'subject_type'>[];
  related_links?: ResearchRelatedLink[];
  revisions?: ResearchRevision[];
  locale: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface ResearchPathStep {
  id: number;
  entry?: Pick<ResearchEntry, 'id' | 'documentId' | 'title' | 'slug'> & { summary?: string };
  step_note?: string;
}

export interface ResearchCuratorData {
  featured_entry?: ResearchEntry;
  pick_note?: string;
  path_description?: string;
  path_steps?: ResearchPathStep[];
}

export const RESEARCH_MEDIA_TYPES: ResearchMediaType[] = [
  'character', 'story', 'concept', 'setting', 'organization',
];

export const researchMediaTypeLabels: Record<string, Record<ResearchMediaType, string>> = {
  'zh-Hans': {
    character: '角色', story: '剧情', concept: '概念', setting: '设定', organization: '组织',
  },
  'en': {
    character: 'Character', story: 'Story', concept: 'Concept', setting: 'Setting', organization: 'Organization',
  },
  'ja': {
    character: 'キャラクター', story: 'ストーリー', concept: '概念', setting: '設定', organization: '組織',
  },
};

export const researchStanceLabels: Record<string, Record<ResearchStance, string>> = {
  'zh-Hans': { official: '官方依据', personal: '个人推论', speculative: '推测性' },
  'en': { official: 'Official basis', personal: 'Personal analysis', speculative: 'Speculative' },
  'ja': { official: '公式根拠', personal: '個人考察', speculative: '推測的' },
};

export const researchConfidenceLabels: Record<string, Record<CitationConfidence, string>> = {
  'zh-Hans': { official: '官方', derived: '推导', conjecture: '推测' },
  'en': { official: 'Official', derived: 'Derived', conjecture: 'Conjecture' },
  'ja': { official: '公式', derived: '推導', conjecture: '推測' },
};

export const researchSourceTypeLabels: Record<string, Record<CitationSourceType, string>> = {
  'zh-Hans': { game_line: '游戏台词', interview: '官方访谈', visual: '视觉证据', external: '外部来源' },
  'en': { game_line: 'Game line', interview: 'Interview', visual: 'Visual evidence', external: 'External source' },
  'ja': { game_line: 'ゲーム台詞', interview: '公式インタビュー', visual: 'ビジュアル証拠', external: '外部ソース' },
};

export const researchRelationTypeLabels: Record<string, Record<ResearchRelationType, string>> = {
  'zh-Hans': { related: '相关', prototype: '原型', echoes: '呼应', extends: '补充', contradicts: '相左', prerequisite: '前置阅读' },
  'en': { related: 'Related', prototype: 'Prototype', echoes: 'Echoes', extends: 'Builds on', contradicts: 'Contradicts', prerequisite: 'Read first' },
  'ja': { related: '関連', prototype: '原型・モチーフ', echoes: '呼応', extends: '補足', contradicts: '対立', prerequisite: '前提知識' },
};

export const researchSubjectTypeLabels: Record<string, Record<ResearchSubjectType, string>> = {
  'zh-Hans': { school: '学院', organization: '组织', club: '社团', character: '人物', location: '地点', concept: '概念', item: '物品' },
  'en': { school: 'School', organization: 'Organization', club: 'Club', character: 'Character', location: 'Location', concept: 'Concept', item: 'Item' },
  'ja': { school: '学園', organization: '組織', club: '部活', character: '人物', location: '場所', concept: '概念', item: 'アイテム' },
};

export const researchRevisionTypeLabels: Record<string, Record<ResearchRevisionType, string>> = {
  'zh-Hans': { created: '建立', updated: '更新', confirmed: '获官方证实', refuted: '被官方推翻' },
  'en': { created: 'Created', updated: 'Updated', confirmed: 'Confirmed by canon', refuted: 'Refuted by canon' },
  'ja': { created: '作成', updated: '更新', confirmed: '公式で確定', refuted: '公式で否定' },
};

export const researchPathDifficultyLabels: Record<string, Record<ResearchPathDifficulty, string>> = {
  'zh-Hans': { intro: '入门', deep: '深入', expert: '硬核' },
  'en': { intro: 'Intro', deep: 'Deep dive', expert: 'Expert' },
  'ja': { intro: '入門', deep: '深掘り', expert: 'エキスパート' },
};

const RESEARCH_ENTRY_LIST_POPULATE = {
  'populate[themes]': true,
  'populate[subjects]': true,
} as const;

const RESEARCH_ENTRY_DETAIL_POPULATE = {
  'populate[themes]': true,
  'populate[subjects]': true,
  'populate[citations][populate][source_image]': true,
  'populate[related_links][populate][target_entry]': true,
  'populate[revisions]': true,
} as const;

export async function getResearchEntries(locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<ResearchEntry[]>>(
    `/research-entries?${createCollectionQuery({
      locale: strapiLocale,
      sort: 'updatedAt:desc',
      'pagination[pageSize]': 100,
      ...RESEARCH_ENTRY_LIST_POPULATE,
    })}`
  );
}

export async function getResearchEntryBySlug(slug: string, locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  const response = await fetchAPI<StrapiResponse<ResearchEntry[]>>(
    `/research-entries?${createCollectionQuery({
      locale: strapiLocale,
      'filters[slug][$eq]': slug,
      ...RESEARCH_ENTRY_DETAIL_POPULATE,
    })}`
  );
  return {
    data: response.data?.[0] || null,
    meta: {},
  } as StrapiSingleResponse<ResearchEntry | null>;
}

export async function getResearchThemes(locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<ResearchTheme[]>>(
    `/research-themes?${createCollectionQuery({
      locale: strapiLocale,
      sort: 'name:asc',
      'pagination[pageSize]': 100,
    })}`
  );
}

export async function getResearchCurator(locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  try {
    return await fetchAPI<{ data: ResearchCuratorData }>(
      `/research-curator?${createCollectionQuery({
        locale: strapiLocale,
        'populate[featured_entry][populate][themes]': true,
        'populate[path_steps][populate][entry]': true,
      })}`
    );
  } catch {
    return { data: null };
  }
}

export async function getResearchThemeBySlug(slug: string, locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  const response = await fetchAPI<StrapiResponse<ResearchTheme[]>>(
    `/research-themes?${createCollectionQuery({
      locale: strapiLocale,
      'filters[slug][$eq]': slug,
    })}`
  );
  return { data: response.data?.[0] || null };
}

export async function getResearchEntriesByThemeSlug(themeSlug: string, locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<ResearchEntry[]>>(
    `/research-entries?${createCollectionQuery({
      locale: strapiLocale,
      'filters[themes][slug][$eq]': themeSlug,
      sort: 'updatedAt:desc',
      'pagination[pageSize]': 100,
      ...RESEARCH_ENTRY_LIST_POPULATE,
    })}`
  );
}

export async function getRecentResearchEntries(locale: string = 'zh-Hans', limit = 3) {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<ResearchEntry[]>>(
    `/research-entries?${createCollectionQuery({
      locale: strapiLocale,
      sort: 'updatedAt:desc',
      'pagination[pageSize]': limit,
      ...RESEARCH_ENTRY_LIST_POPULATE,
    })}`
  );
}

// ── 考据对象（实体枢纽）──

export async function getResearchSubjects(locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<ResearchSubject[]>>(
    `/research-subjects?${createCollectionQuery({
      locale: strapiLocale,
      sort: 'name:asc',
      'pagination[pageSize]': 100,
      'populate[cover]': true,
    })}`
  );
}

export async function getResearchSubjectBySlug(slug: string, locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  const response = await fetchAPI<StrapiResponse<ResearchSubject[]>>(
    `/research-subjects?${createCollectionQuery({
      locale: strapiLocale,
      'filters[slug][$eq]': slug,
      'populate[cover]': true,
      'populate[students][populate][avatar]': true,
    })}`
  );
  return {
    data: response.data?.[0] || null,
    meta: {},
  } as StrapiSingleResponse<ResearchSubject | null>;
}

export async function getResearchEntriesBySubjectSlug(subjectSlug: string, locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<ResearchEntry[]>>(
    `/research-entries?${createCollectionQuery({
      locale: strapiLocale,
      'filters[subjects][slug][$eq]': subjectSlug,
      sort: 'updatedAt:desc',
      'pagination[pageSize]': 100,
      ...RESEARCH_ENTRY_LIST_POPULATE,
    })}`
  );
}

/** 学生详情页用：找出关联了该学生的考据对象（及其条目数所需的最小字段） */
export async function getResearchSubjectsByStudent(
  student: Pick<Student, 'id' | 'documentId'>,
  locale: string = 'zh-Hans'
) {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<ResearchSubject[]>>(
    `/research-subjects?${createCollectionQuery({
      locale: strapiLocale,
      'filters[$or][0][students][id][$eq]': student.id,
      'filters[$or][1][students][documentId][$eq]': student.documentId,
      sort: 'name:asc',
      'pagination[pageSize]': 50,
      'populate[entries][fields][0]': 'title',
      'populate[entries][fields][1]': 'slug',
    })}`
  );
}

// ── 阅读路径 ──

const RESEARCH_PATH_POPULATE = {
  'populate[steps][populate][entry][fields][0]': 'title',
  'populate[steps][populate][entry][fields][1]': 'slug',
  'populate[steps][populate][entry][fields][2]': 'summary',
} as const;

export async function getResearchPaths(locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<ResearchPath[]>>(
    `/research-paths?${createCollectionQuery({
      locale: strapiLocale,
      'sort[0]': 'order:asc',
      'sort[1]': 'updatedAt:desc',
      'pagination[pageSize]': 50,
      ...RESEARCH_PATH_POPULATE,
    })}`
  );
}

export async function getResearchPathBySlug(slug: string, locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  const response = await fetchAPI<StrapiResponse<ResearchPath[]>>(
    `/research-paths?${createCollectionQuery({
      locale: strapiLocale,
      'filters[slug][$eq]': slug,
      ...RESEARCH_PATH_POPULATE,
    })}`
  );
  return {
    data: response.data?.[0] || null,
    meta: {},
  } as StrapiSingleResponse<ResearchPath | null>;
}

/** 条目详情页用：找出包含该条目的所有阅读路径（用于上一篇/下一篇导航） */
export async function getResearchPathsContainingEntry(entrySlug: string, locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<ResearchPath[]>>(
    `/research-paths?${createCollectionQuery({
      locale: strapiLocale,
      'filters[steps][entry][slug][$eq]': entrySlug,
      'sort[0]': 'order:asc',
      'pagination[pageSize]': 20,
      ...RESEARCH_PATH_POPULATE,
    })}`
  );
}

/** 知识图谱数据：条目（含主题/对象/条目间链接） */
export async function getResearchGraphEntries(locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<ResearchEntry[]>>(
    `/research-entries?${createCollectionQuery({
      locale: strapiLocale,
      sort: 'updatedAt:desc',
      'pagination[pageSize]': 200,
      'fields[0]': 'title',
      'fields[1]': 'slug',
      'fields[2]': 'media_type',
      'fields[3]': 'body',
      'populate[themes][fields][0]': 'name',
      'populate[themes][fields][1]': 'slug',
      'populate[subjects][fields][0]': 'name',
      'populate[subjects][fields][1]': 'slug',
      'populate[related_links][populate][target_entry][fields][0]': 'slug',
    })}`
  );
}

// ── 反向链接 ──

/**
 * 反向链接：链接到指定条目的其他条目。
 * 同时覆盖结构化的 related_links 与正文中的 [[wiki链接]]。
 */
export async function getResearchBacklinks(entrySlug: string, locale: string = 'zh-Hans') {
  const strapiLocale = toStrapiLocale(locale);
  return fetchAPI<StrapiResponse<ResearchEntry[]>>(
    `/research-entries?${createCollectionQuery({
      locale: strapiLocale,
      'filters[$or][0][related_links][target_entry][slug][$eq]': entrySlug,
      'filters[$or][1][body][$contains]': `[[${entrySlug}`,
      'filters[slug][$ne]': entrySlug,
      sort: 'updatedAt:desc',
      'pagination[pageSize]': 50,
      'populate[related_links][populate][target_entry][fields][0]': 'slug',
    })}`
  );
}

/**
 * 引用源反查：除当前条目外，还有哪些条目引用了这些引证。
 * 返回带最小 citations 字段的条目列表，由调用方按 citation 分组。
 */
export async function getEntriesSharingCitations(
  citationIds: number[],
  excludeEntrySlug: string,
  locale: string = 'zh-Hans'
) {
  if (citationIds.length === 0) {
    return { data: [] as ResearchEntry[], meta: {} };
  }
  const strapiLocale = toStrapiLocale(locale);
  const params: Record<string, string | number | boolean | undefined> = {
    locale: strapiLocale,
    'filters[slug][$ne]': excludeEntrySlug,
    sort: 'updatedAt:desc',
    'pagination[pageSize]': 50,
    'populate[citations][fields][0]': 'id',
  };
  citationIds.forEach((id, index) => {
    params[`filters[citations][id][$in][${index}]`] = id;
  });
  return fetchAPI<StrapiResponse<ResearchEntry[]>>(
    `/research-entries?${createCollectionQuery(params)}`
  );
}

// ─── End Research Archives ────────────────────────────────────────────────────

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
