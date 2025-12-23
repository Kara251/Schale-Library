'use client'

import NextLink from 'next/link'
import { useLocale } from '@/contexts/locale-context'
import { ComponentProps } from 'react'

type LocaleLinkProps = ComponentProps<typeof NextLink>

/**
 * 语言感知的 Link 组件
 * 自动添加当前语言前缀到 href
 */
export function LocaleLink({ href, ...props }: LocaleLinkProps) {
    const { locale } = useLocale()

    // 如果 href 是字符串，添加语言前缀
    let localizedHref = href
    if (typeof href === 'string') {
        // 跳过外部链接和已有语言前缀的链接
        if (!href.startsWith('http') && !href.startsWith('//')) {
            // 检查是否已有语言前缀
            const hasLocalePrefix = /^\/(zh-Hans|en|ja)(\/|$)/.test(href)
            if (!hasLocalePrefix) {
                // 添加语言前缀
                localizedHref = `/${locale}${href.startsWith('/') ? '' : '/'}${href}`
            }
        }
    } else if (typeof href === 'object' && href.pathname) {
        // URL 对象
        const hasLocalePrefix = /^\/(zh-Hans|en|ja)(\/|$)/.test(href.pathname)
        if (!hasLocalePrefix) {
            localizedHref = {
                ...href,
                pathname: `/${locale}${href.pathname.startsWith('/') ? '' : '/'}${href.pathname}`,
            }
        }
    }

    return <NextLink href={localizedHref} {...props} />
}

/**
 * 获取带语言前缀的路径
 */
export function useLocalePath() {
    const { locale } = useLocale()

    return (path: string): string => {
        if (path.startsWith('http') || path.startsWith('//')) {
            return path
        }
        const hasLocalePrefix = /^\/(zh-Hans|en|ja)(\/|$)/.test(path)
        if (hasLocalePrefix) {
            return path
        }
        return `/${locale}${path.startsWith('/') ? '' : '/'}${path}`
    }
}
