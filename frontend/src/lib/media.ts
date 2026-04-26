const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083'

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
