import { notFound } from 'next/navigation'

// 支持的语言列表
const locales = ['zh-Hans', 'en', 'ja'] as const
type Locale = (typeof locales)[number]

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
