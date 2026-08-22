import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/config'

const siteUrl = SITE_URL

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/zh-Hans/manage/', '/en/manage/', '/ja/manage/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
