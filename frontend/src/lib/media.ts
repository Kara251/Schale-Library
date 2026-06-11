import { STRAPI_API_URL as API_URL } from '@/lib/config'

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

export function getMediaUrl(url?: string | null) {
  if (!url) {
    return ''
  }

  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.startsWith('/api/')
  ) {
    return url
  }

  if (url.startsWith('/')) {
    return `${trimTrailingSlash(API_URL)}${url}`
  }

  return url
}
