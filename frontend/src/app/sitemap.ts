import type { MetadataRoute } from 'next'

import {
  type Announcement,
  getContentEntryPathId,
  getAllCollectionItems,
  type OfflineEvent,
  type OnlineEvent,
  type Creator,
} from '@/lib/api'
import { locales } from '@/lib/i18n'
import { SITE_URL } from '@/lib/config'

const siteUrl = SITE_URL
const staticRoutes = ['', '/creators', '/research-archives', '/events', '/online-events', '/offline-events', '/announcements', '/resources', '/about', '/contact', '/privacy']
const SITEMAP_PAGE_SIZE = 100

function sitemapEntry(path: string, lastModified?: string): MetadataRoute.Sitemap[number] {
  return {
    url: `${siteUrl}${path}`,
    lastModified: lastModified ? new Date(lastModified) : new Date(),
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []

  for (const locale of locales) {
    entries.push(...staticRoutes.map((route) => sitemapEntry(`/${locale}${route}`)))

    const [creators, onlineEvents, offlineEvents, announcements] = await Promise.all([
      getAllCollectionItems<Creator>('creators', locale, { pageSize: SITEMAP_PAGE_SIZE }).catch(() => []),
      getAllCollectionItems<OnlineEvent>('online-events', locale, { pageSize: SITEMAP_PAGE_SIZE }).catch(() => []),
      getAllCollectionItems<OfflineEvent>('offline-events', locale, { pageSize: SITEMAP_PAGE_SIZE }).catch(() => []),
      getAllCollectionItems<Announcement>('announcements', locale, {
        pageSize: SITEMAP_PAGE_SIZE,
        filters: { 'filters[isActive][$eq]': true },
      }).catch(() => []),
    ])

    entries.push(...creators.map((item) => sitemapEntry(`/${locale}/creators/${getContentEntryPathId(item)}`, item.updatedAt)))
    entries.push(...onlineEvents.map((item) => sitemapEntry(`/${locale}/online-events/${getContentEntryPathId(item)}`, item.updatedAt)))
    entries.push(...offlineEvents.map((item) => sitemapEntry(`/${locale}/offline-events/${getContentEntryPathId(item)}`, item.updatedAt)))
    entries.push(...announcements.map((item) => sitemapEntry(`/${locale}/announcements/${getContentEntryPathId(item)}`, item.updatedAt)))
  }

  return entries
}
