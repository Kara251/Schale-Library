import { NextRequest, NextResponse } from 'next/server'

// 支持的语言列表
const locales = ['zh-Hans', 'en', 'ja'] as const
type Locale = (typeof locales)[number]
const defaultLocale: Locale = 'zh-Hans'

// 浏览器语言代码映射
const localeMapping: Record<string, Locale> = {
    'zh': 'zh-Hans',
    'zh-CN': 'zh-Hans',
    'zh-Hans': 'zh-Hans',
    'zh-TW': 'zh-Hans',
    'en': 'en',
    'en-US': 'en',
    'en-GB': 'en',
    'ja': 'ja',
    'ja-JP': 'ja',
}

/**
 * 从 Accept-Language 头获取首选语言
 */
function getPreferredLocale(request: NextRequest): Locale {
    const acceptLanguage = request.headers.get('Accept-Language')
    if (!acceptLanguage) return defaultLocale

    const languages = acceptLanguage
        .split(',')
        .map(lang => {
            const [code, q = 'q=1'] = lang.trim().split(';')
            const quality = parseFloat(q.replace('q=', '')) || 1
            return { code: code.trim(), quality }
        })
        .sort((a, b) => b.quality - a.quality)

    for (const { code } of languages) {
        if (localeMapping[code]) {
            return localeMapping[code]
        }
        const prefix = code.split('-')[0]
        if (localeMapping[prefix]) {
            return localeMapping[prefix]
        }
    }

    return defaultLocale
}

/**
 * 检查路径是否已包含语言前缀
 */
function hasLocalePrefix(pathname: string): boolean {
    const segments = pathname.split('/')
    const firstSegment = segments[1]
    return locales.includes(firstSegment as Locale)
}

/**
 * 获取路径中的语言前缀
 */
function getLocaleFromPath(pathname: string): Locale | null {
    const segments = pathname.split('/')
    const firstSegment = segments[1]
    if (locales.includes(firstSegment as Locale)) {
        return firstSegment as Locale
    }
    return null
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // 跳过静态资源
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/img') ||
        pathname.includes('.')
    ) {
        return NextResponse.next()
    }

    // 检查路径是否已有语言前缀
    if (hasLocalePrefix(pathname)) {
        const pathLocale = getLocaleFromPath(pathname)
        if (pathLocale) {
            const response = NextResponse.next()
            response.cookies.set('NEXT_LOCALE', pathLocale, {
                path: '/',
                maxAge: 60 * 60 * 24 * 365,
            })
            return response
        }
    }

    // 路径没有语言前缀，需要重定向
    const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value as Locale | undefined
    const locale = cookieLocale && locales.includes(cookieLocale)
        ? cookieLocale
        : getPreferredLocale(request)

    // 重定向到带语言前缀的路径
    const newUrl = new URL(`/${locale}${pathname}`, request.url)
    newUrl.search = request.nextUrl.search

    const response = NextResponse.redirect(newUrl)
    response.cookies.set('NEXT_LOCALE', locale, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
    })

    return response
}

export const config = {
    matcher: [
        // 匹配所有路径，除了静态资源
        '/((?!_next/static|_next/image|favicon.ico|img/).*)',
    ],
}
