import type { MetadataRoute } from 'next'

import {
  getAnnouncements,
  getContentEntryPathId,
  getOfflineEvents,
  getOnlineEvents,
  getStudents,
  getWorks,
} from '@/lib/api'
import { locales } from '@/lib/i18n'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '')
const staticRoutes = ['', '/works', '/online-events', '/offline-events', '/announcements', '/resources', '/about', '/contact', '/privacy']

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

    const [worksRes, studentsRes, onlineEventsRes, offlineEventsRes, announcementsRes] = await Promise.all([
      getWorks(100, locale).catch(() => ({ data: [] })),
      getStudents(locale).catch(() => ({ data: [] })),
      getOnlineEvents(100, locale).catch(() => ({ data: [] })),
      getOfflineEvents(100, locale).catch(() => ({ data: [] })),
      getAnnouncements(locale).catch(() => ({ data: [] })),
    ])

    entries.push(...(worksRes.data || []).map((item) => sitemapEntry(`/${locale}/works/${getContentEntryPathId(item)}`, item.updatedAt)))
    entries.push(...(studentsRes.data || []).map((item) => sitemapEntry(`/${locale}/students/${getContentEntryPathId(item)}`, item.updatedAt)))
    entries.push(...(onlineEventsRes.data || []).map((item) => sitemapEntry(`/${locale}/online-events/${getContentEntryPathId(item)}`, item.updatedAt)))
    entries.push(...(offlineEventsRes.data || []).map((item) => sitemapEntry(`/${locale}/offline-events/${getContentEntryPathId(item)}`, item.updatedAt)))
    entries.push(...(announcementsRes.data || []).map((item) => sitemapEntry(`/${locale}/announcements/${getContentEntryPathId(item)}`, item.updatedAt)))
  }

  return entries
}
