/**
 * 活动域：线上/线下活动列表、详情、搜索、合并取数（bundle）与地区筛选项。
 */

import { eventLocationSearchTerms, normalizeEventLocationName } from '@/lib/utils/event-location';
import {
  createCollectionQuery,
  fetchAPI,
  isNumericIdentifier,
  toStrapiLocale,
} from './core';
import type {
  ContentIdentifier,
  StrapiMedia,
  StrapiResponse,
  StrapiSingleResponse,
} from './types';

export const COVER_IMAGE_POPULATE_PARAMS = {
  'populate[coverImage]': true,
} as const;

export type EventNatureFilter = 'all' | 'official' | 'fanmade';
export type EventStatusFilter = 'all' | 'upcoming' | 'ongoing' | 'ended';
export type EventSortMode = 'relevant' | 'startTime' | 'endTime';
export type EventKindFilter = 'all' | 'online' | 'offline';
export type EventFormat = 'stream' | 'stage' | 'only' | 'exhibition' | 'contest' | 'uncategorized' | 'live_stream' | 'live_show' | 'only_event' | 'collaboration' | 'campaign' | 'meetup' | 'release' | 'other';
export type EventStatusOverride = 'normal' | 'postponed' | 'cancelled' | 'rescheduled' | 'ticketing' | 'sold_out' | 'changed';
export type EventTicketStatus = 'unknown' | 'free' | 'ticketing' | 'lottery' | 'sold_out' | 'closed';
type EventCollection = 'online-events' | 'offline-events';
export type EventKind = 'online' | 'offline';

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

export interface EventListItem {
  event: OnlineEvent | OfflineEvent;
  type: EventKind;
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
      // 线上活动无城市维度：显式匹配空集，保持筛选语义而非静默忽略。
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

export function eventPageMeta(page: number, pageSize: number, total: number) {
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

// 性能：从已拉全的活动列表直接派生地区筛选项，替代对同一集合的第二次全量扫描。
function collectEventLocationRecords(
  items: Array<{ country?: string | null; region?: string | null; city?: string | null }>,
  kind: EventKind,
  seen: Set<string>,
  records: EventLocationRecord[]
) {
  for (const event of items) {
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
}

/**
 * 活动页合并取数：一次全量扫描同时产出列表分页与地区筛选项，
 * 替代原先 getAllEvents + getEventLocationRecords 的双重全量扫描。
 */
export async function getEventsBundle(
  locale: string = 'zh-Hans',
  options: EventListOptions & { limit?: number } = {}
): Promise<{ response: StrapiResponse<EventListItem[]>; locationRecords: EventLocationRecord[] }> {
  const limit = Math.max(1, options.limit || 24);
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, options.pageSize || limit);
  const nowIso = new Date().toISOString();
  const seen = new Set<string>();
  const locationRecords: EventLocationRecord[] = [];

  const [online, offline] = await Promise.all([
    options.kind === 'offline'
      ? Promise.resolve([] as OnlineEvent[])
      : fetchAllEventsForCollection<OnlineEvent>('online-events', 'online', locale, options, nowIso).then((items) => {
          collectEventLocationRecords(items, 'online', seen, locationRecords);
          return items;
        }),
    options.kind === 'online'
      ? Promise.resolve([] as OfflineEvent[])
      : fetchAllEventsForCollection<OfflineEvent>('offline-events', 'offline', locale, options, nowIso).then((items) => {
          collectEventLocationRecords(items, 'offline', seen, locationRecords);
          return items;
        }),
  ]);

  const merged = [
    ...online.map((event) => ({ event, type: 'online' as const })),
    ...offline.map((event) => ({ event, type: 'offline' as const })),
  ].sort((a, b) => compareEventsForDisplay(a, b, options.sort || 'relevant'));
  const start = (page - 1) * pageSize;
  const total = merged.length;

  return {
    response: {
      data: merged.slice(start, start + pageSize),
      meta: eventPageMeta(page, pageSize, total),
    },
    locationRecords,
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
