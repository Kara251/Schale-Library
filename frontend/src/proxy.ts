import { NextRequest, NextResponse } from 'next/server'

import { defaultLocale, locales, type Locale } from '@/lib/i18n'

const localeMapping: Record<string, Locale> = {
    zh: 'zh-Hans',
    'zh-CN': 'zh-Hans',
    'zh-Hans': 'zh-Hans',
    'zh-TW': 'zh-Hans',
    en: 'en',
    'en-US': 'en',
    'en-GB': 'en',
    ja: 'ja',
    'ja-JP': 'ja',
}

function isLocale(value: string): value is Locale {
    return locales.includes(value as Locale)
}

function resolveLocale(value?: string | null): Locale | null {
    if (!value) {
        return null
    }

    if (isLocale(value)) {
        return value
    }

    if (localeMapping[value]) {
        return localeMapping[value]
    }

    const prefix = value.split('-')[0]
    return localeMapping[prefix] ?? null
}

function getPreferredLocale(request: NextRequest): Locale {
    const acceptLanguage = request.headers.get('Accept-Language')
    if (!acceptLanguage) {
        return defaultLocale
    }

    const languages = acceptLanguage
        .split(',')
        .map((language) => {
            const [code, q = 'q=1'] = language.trim().split(';')
            const quality = Number.parseFloat(q.replace('q=', '')) || 1

            return { code: code.trim(), quality }
        })
        .sort((a, b) => b.quality - a.quality)

    for (const { code } of languages) {
        const matchedLocale = resolveLocale(code)
        if (matchedLocale) {
            return matchedLocale
        }
    }

    return defaultLocale
}

function getLocaleFromPath(pathname: string): Locale | null {
    const firstSegment = pathname.split('/')[1]
    return resolveLocale(firstSegment)
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/img') ||
        pathname.includes('.')
    ) {
        return NextResponse.next()
    }

    const pathnameLocale = getLocaleFromPath(pathname)
    if (pathnameLocale) {
        const response = NextResponse.next()
        response.cookies.set('NEXT_LOCALE', pathnameLocale, {
            path: '/',
            maxAge: 60 * 60 * 24 * 365,
        })
        return response
    }

    const cookieLocale = resolveLocale(request.cookies.get('NEXT_LOCALE')?.value)
    const locale = cookieLocale ?? getPreferredLocale(request)
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
    matcher: ['/((?!_next/static|_next/image|favicon.ico|img/).*)'],
}
