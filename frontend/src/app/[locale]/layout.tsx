import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

// 支持的语言列表
const locales = ['zh-Hans', 'en', 'ja'] as const
type Locale = (typeof locales)[number]

const metadataByLocale: Record<Locale, {
    title: string
    description: string
    keywords: string
    openGraphLocale: string
}> = {
    'zh-Hans': {
        title: 'Schale Library - 夏莱图书馆 | 蔚蓝档案资料站',
        description: '收集游戏作品《蔚蓝档案》内容，以及游戏外的各种作品、活动等的系统',
        keywords: '蔚蓝档案,Blue Archive,Schale Library,夏莱图书馆',
        openGraphLocale: 'zh_CN',
    },
    en: {
        title: 'Schale Library | Blue Archive Fan Resource Library',
        description: 'A Blue Archive fan resource library for works, online events, offline events, and community discovery.',
        keywords: 'Blue Archive,Schale Library,fan works,online events,offline events',
        openGraphLocale: 'en_US',
    },
    ja: {
        title: 'Schale Library | ブルーアーカイブ資料ライブラリ',
        description: 'ブルーアーカイブ関連の作品、オンラインイベント、オフラインイベントを探せるファン資料ライブラリです。',
        keywords: 'ブルーアーカイブ,Schale Library,作品,オンラインイベント,オフラインイベント',
        openGraphLocale: 'ja_JP',
    },
}

interface LocaleLayoutProps {
    children: React.ReactNode
    params: Promise<{ locale: string }>
}

/**
 * 验证语言参数
 */
function isValidLocale(locale: string): locale is Locale {
    return locales.includes(locale as Locale)
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params
    if (!isValidLocale(locale)) {
        return {}
    }

    const metadata = metadataByLocale[locale]
    const languages = {
        'zh-Hans': '/zh-Hans',
        en: '/en',
        ja: '/ja',
    }

    return {
        title: metadata.title,
        description: metadata.description,
        keywords: metadata.keywords,
        alternates: {
            canonical: `/${locale}`,
            languages,
        },
        openGraph: {
            title: metadata.title,
            description: metadata.description,
            type: 'website',
            locale: metadata.openGraphLocale,
        },
    }
}

/**
 * Locale 布局 - 验证语言参数
 */
export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
    const { locale } = await params

    // 验证语言参数
    if (!isValidLocale(locale)) {
        notFound()
    }

    return <>{children}</>
}

/**
 * 生成静态参数
 */
export function generateStaticParams() {
    return locales.map((locale) => ({ locale }))
}
