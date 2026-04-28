import 'server-only'

import type { AdminSession } from '@/lib/server/admin-auth'
import {
  ADMIN_COLLECTION_META,
  type AdminCollectionKey,
  type AdminMediaAsset,
} from '@/lib/admin-panel'

const STRAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083'
const DEFAULT_PAGE_SIZE = 12

export const ADMIN_COLLECTION_CONFIG = ADMIN_COLLECTION_META
export type AdminPublishStatus = 'all' | 'published' | 'draft'

export interface AdminListQuery {
  locale?: string
  page?: number
  pageSize?: number
  search?: string
  status?: AdminPublishStatus | string
  action?: string
  actor?: string
  collection?: string
  featured?: string
  from?: string
  to?: string
  stage?: string
}

export interface AdminStrapiEntry {
  id: number
  documentId?: string
  publishedAt?: string | null
  updatedAt?: string
  createdAt?: string
  locale?: string
  [key: string]: unknown
}

export interface AdminListResponse<T extends AdminStrapiEntry> {
  data: T[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

export interface AdminDashboardItem {
  key: AdminCollectionKey
  title: string
  total: number
  href: string
}

export interface AdminSystemHealthCheck {
  key: string
  label: string
  status: 'ok' | 'warning' | 'error'
  message: string
}

export interface AdminSystemHealth {
  status: 'ok' | 'warning' | 'error'
  generatedAt: string
  checks: AdminSystemHealthCheck[]
}

export interface ContentQualityIssue extends AdminStrapiEntry {
  issueType: string
  severity: 'info' | 'warning' | 'error'
  status: 'open' | 'resolved'
  collection: string
  targetId?: number
  targetDocumentId?: string
  locale?: string
  title?: string
  message: string
  detectedAt: string
}

export interface ContentQualityQuery {
  page?: number
  pageSize?: number
  status?: string
  severity?: string
  collection?: string
  issueType?: string
}

export interface BulkActionPayload {
  collection: AdminCollectionKey
  action: string
  ids: number[]
  locale?: string
  studentIds?: number[]
  sourcePlatform?: string
  school?: string
  organization?: string
  featuredPriority?: number
}

function buildCollectionQuery(key: AdminCollectionKey, query: AdminListQuery): URLSearchParams {
  const config = ADMIN_COLLECTION_CONFIG[key]
  const params = new URLSearchParams()
  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.max(1, Math.min(50, query.pageSize ?? DEFAULT_PAGE_SIZE))

  params.set('page', String(page))
  params.set('pageSize', String(pageSize))

  if (config.localized && query.locale) {
    params.set('locale', query.locale)
  }

  if (query.search?.trim()) {
    params.set('search', query.search.trim())
  }

  if (config.supportsDraft && query.status && query.status !== 'all') {
    params.set('status', query.status)
  } else if (!config.supportsDraft && query.status && query.status !== 'all') {
    params.set('status', query.status)
  }

  for (const key of ['action', 'actor', 'collection', 'featured', 'from', 'to', 'stage'] as const) {
    if (query[key]) {
      params.set(key, String(query[key]))
    }
  }

  return params
}

interface AdminFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: BodyInit | Record<string, unknown>
  contentType?: string
}

async function adminFetchJson<T>(session: AdminSession, pathname: string, options: AdminFetchOptions = {}): Promise<T> {
  const headers = new Headers({
    Authorization: `Bearer ${session.token}`,
  })

  let body: BodyInit | undefined
  if (options.body instanceof FormData) {
    body = options.body
  } else if (options.body !== undefined) {
    headers.set('Content-Type', options.contentType || 'application/json')
    body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
  }

  const response = await fetch(`${STRAPI_URL}${pathname}`, {
    method: options.method || 'GET',
    headers,
    body,
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || '后台数据请求失败')
  }

  return response.json() as Promise<T>
}

export async function listAdminCollection<T extends AdminStrapiEntry>(
  session: AdminSession,
  key: AdminCollectionKey,
  query: AdminListQuery
): Promise<AdminListResponse<T>> {
  const config = ADMIN_COLLECTION_CONFIG[key]
  const searchParams = buildCollectionQuery(key, query)
  return adminFetchJson<AdminListResponse<T>>(session, `/api/panel/${config.endpoint}?${searchParams.toString()}`)
}

export async function getSystemHealth(session: AdminSession): Promise<AdminSystemHealth> {
  return adminFetchJson<AdminSystemHealth>(session, '/api/panel/system/health')
}

export async function listContentQualityIssues(
  session: AdminSession,
  query: ContentQualityQuery
): Promise<AdminListResponse<ContentQualityIssue>> {
  const params = new URLSearchParams()
  params.set('page', String(Math.max(1, query.page || 1)))
  params.set('pageSize', String(Math.min(100, Math.max(1, query.pageSize || 20))))
  if (query.status) params.set('status', query.status)
  if (query.severity) params.set('severity', query.severity)
  if (query.collection) params.set('collection', query.collection)
  if (query.issueType) params.set('issueType', query.issueType)

  return adminFetchJson<AdminListResponse<ContentQualityIssue>>(session, `/api/panel/quality/issues?${params.toString()}`)
}

export async function scanContentQuality(session: AdminSession): Promise<{ success: boolean; count: number }> {
  return adminFetchJson<{ success: boolean; count: number }>(session, '/api/panel/quality/scan', {
    method: 'POST',
    body: {},
  })
}

export async function runBulkAction(
  session: AdminSession,
  payload: BulkActionPayload
): Promise<{ success: boolean; updated: number; failed: number; errors: string[] }> {
  return adminFetchJson<{ success: boolean; updated: number; failed: number; errors: string[] }>(session, '/api/panel/bulk-action', {
    method: 'POST',
    body: { ...payload },
  })
}

export async function getAdminCollectionItem<T extends AdminStrapiEntry>(
  session: AdminSession,
  key: AdminCollectionKey,
  id: number,
  locale?: string
): Promise<T> {
  const config = ADMIN_COLLECTION_CONFIG[key]
  const searchParams = new URLSearchParams()
  if (config.localized && locale) {
    searchParams.set('locale', locale)
  }
  const data = await adminFetchJson<{ data: T }>(
    session,
    `/api/panel/${config.endpoint}/${id}${searchParams.size ? `?${searchParams.toString()}` : ''}`
  )
  return data.data
}

export async function createAdminCollectionItem<T extends AdminStrapiEntry>(
  session: AdminSession,
  key: AdminCollectionKey,
  payload: Record<string, unknown>,
  locale?: string
): Promise<T> {
  const config = ADMIN_COLLECTION_CONFIG[key]
  const data = await adminFetchJson<{ data: T }>(session, `/api/panel/${config.endpoint}`, {
    method: 'POST',
    body: { data: payload, locale },
  })
  return data.data
}

export async function updateAdminCollectionItem<T extends AdminStrapiEntry>(
  session: AdminSession,
  key: AdminCollectionKey,
  id: number,
  payload: Record<string, unknown>,
  locale?: string
): Promise<T> {
  const config = ADMIN_COLLECTION_CONFIG[key]
  const data = await adminFetchJson<{ data: T }>(session, `/api/panel/${config.endpoint}/${id}`, {
    method: 'PUT',
    body: { data: payload, locale },
  })
  return data.data
}

export async function deleteAdminCollectionItem(
  session: AdminSession,
  key: AdminCollectionKey,
  id: number,
  locale?: string
): Promise<{ success: boolean }> {
  const config = ADMIN_COLLECTION_CONFIG[key]
  const searchParams = new URLSearchParams()
  if (config.localized && locale) {
    searchParams.set('locale', locale)
  }
  return adminFetchJson<{ success: boolean }>(
    session,
    `/api/panel/${config.endpoint}/${id}${searchParams.size ? `?${searchParams.toString()}` : ''}`,
    { method: 'DELETE' }
  )
}

export async function uploadAdminMedia(
  session: AdminSession,
  file: File,
  fieldName?: string,
  collection?: string
): Promise<AdminMediaAsset[]> {
  const formData = new FormData()
  formData.append('files', file)
  if (fieldName) {
    formData.append('fieldName', fieldName)
  }
  if (collection) {
    formData.append('collection', collection)
  }
  const data = await adminFetchJson<{ data: AdminMediaAsset[] }>(session, '/api/panel/upload', {
    method: 'POST',
    body: formData,
  })
  return data.data
}

export interface AdminSyncResult {
  success: boolean
  message?: string
  total?: number
  created?: number
  skipped?: number
  failed?: number
  errors?: string[]
}

export async function syncBilibiliSubscription(
  session: AdminSession,
  id: number
): Promise<AdminSyncResult> {
  return adminFetchJson<AdminSyncResult>(session, `/api/bilibili-subscriptions/${id}/sync`, {
    method: 'POST',
    body: {},
  })
}

export async function syncAllBilibiliSubscriptions(
  session: AdminSession
): Promise<AdminSyncResult> {
  return adminFetchJson<AdminSyncResult>(session, '/api/bilibili-subscriptions/sync-all', {
    method: 'POST',
    body: {},
  })
}

async function getCollectionTotal(session: AdminSession, key: AdminCollectionKey, locale?: string): Promise<number> {
  const result = await listAdminCollection(session, key, {
    locale,
    page: 1,
    pageSize: 1,
    status: 'all',
  })

  return result.meta.pagination.total
}

export async function getAdminDashboardItems(session: AdminSession, locale: string): Promise<AdminDashboardItem[]> {
  const keys = Object.keys(ADMIN_COLLECTION_CONFIG) as AdminCollectionKey[]
  const totals = await Promise.all(keys.map((key) => getCollectionTotal(session, key, locale)))

  return keys.map((key, index) => ({
    key,
    title: ADMIN_COLLECTION_CONFIG[key].title[locale as 'zh-Hans' | 'en' | 'ja'] || ADMIN_COLLECTION_CONFIG[key].title['zh-Hans'],
    total: totals[index],
    href: `/${locale}/manage/${key}`,
  }))
}
