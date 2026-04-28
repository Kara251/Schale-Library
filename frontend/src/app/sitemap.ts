import type { MetadataRoute } from 'next'

import {
  type Announcement,
  getContentEntryPathId,
  getAllCollectionItems,
  type OfflineEvent,
  type OnlineEvent,
  type Student,
  type Work,
} from '@/lib/api'
import { locales } from '@/lib/i18n'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '')
const staticRoutes = ['', '/works', '/online-events', '/offline-events', '/announcements', '/resources', '/about', '/contact', '/privacy']
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

    const [works, students, onlineEvents, offlineEvents, announcements] = await Promise.all([
      getAllCollectionItems<Work>('works', locale, { pageSize: SITEMAP_PAGE_SIZE }).catch(() => []),
      getAllCollectionItems<Student>('students', locale, { pageSize: SITEMAP_PAGE_SIZE, populate: 'avatar' }).catch(() => []),
      getAllCollectionItems<OnlineEvent>('online-events', locale, { pageSize: SITEMAP_PAGE_SIZE }).catch(() => []),
      getAllCollectionItems<OfflineEvent>('offline-events', locale, { pageSize: SITEMAP_PAGE_SIZE }).catch(() => []),
      getAllCollectionItems<Announcement>('announcements', locale, {
        pageSize: SITEMAP_PAGE_SIZE,
        filters: { 'filters[isActive][$eq]': true },
      }).catch(() => []),
    ])

    entries.push(...works.map((item) => sitemapEntry(`/${locale}/works/${getContentEntryPathId(item)}`, item.updatedAt)))
    entries.push(...students.map((item) => sitemapEntry(`/${locale}/students/${getContentEntryPathId(item)}`, item.updatedAt)))
    entries.push(...onlineEvents.map((item) => sitemapEntry(`/${locale}/online-events/${getContentEntryPathId(item)}`, item.updatedAt)))
    entries.push(...offlineEvents.map((item) => sitemapEntry(`/${locale}/offline-events/${getContentEntryPathId(item)}`, item.updatedAt)))
    entries.push(...announcements.map((item) => sitemapEntry(`/${locale}/announcements/${getContentEntryPathId(item)}`, item.updatedAt)))
  }

  return entries
}
