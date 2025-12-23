'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { LocaleLink } from '@/components/locale-link'
import { Home, Search } from 'lucide-react'
import { useLocale } from '@/contexts/locale-context'
import type { Locale } from '@/lib/i18n'

const content: Record<Locale, {
  title: string
  desc: string
  home: string
  search: string
  errorHint: string
  contact: string
}> = {
  'zh-Hans': {
    title: '看起来是不存在的书本呢',
    desc: '抱歉，我们没能找到这本书。也许它还没被收入图书馆的藏书中，或者已经被借出去了。',
    home: '返回首页',
    search: '搜索图书馆',
    errorHint: '如果您认为这是一个错误，请',
    contact: '联系图书馆',
  },
  'en': {
    title: 'Page not found',
    desc: 'Sorry, we could not find this page. It may not exist yet or has been moved.',
    home: 'Back to Home',
    search: 'Search Library',
    errorHint: 'If you believe this is an error, please',
    contact: 'contact us',
  },
  'ja': {
    title: 'ページが見つかりません',
    desc: '申し訳ありませんが、このページが見つかりませんでした。まだ存在しないか、移動された可能性があります。',
    home: 'ホームに戻る',
    search: '図書館を検索',
    errorHint: 'これが間違いだと思われる場合は、',
    contact: 'お問い合わせください',
  },
}

export default function NotFound() {
  const { locale } = useLocale()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const t = mounted ? (content[locale] || content['zh-Hans']) : content['zh-Hans']

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
        <div className="content-panel flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-6 max-w-md">
            {/* 404 大标题 */}
            <div className="space-y-2">
              <h1 className="text-8xl md:text-9xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                404
              </h1>
              <h2 className="text-2xl md:text-3xl font-bold">{t.title}</h2>
            </div>

            {/* 描述文字 */}
            <p className="text-muted-foreground">{t.desc}</p>

            {/* 操作按钮 */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg">
                <LocaleLink href="/">
                  <Home className="mr-2 h-4 w-4" />
                  {t.home}
                </LocaleLink>
              </Button>
              <Button asChild variant="outline" size="lg">
                <LocaleLink href="/global-search">
                  <Search className="mr-2 h-4 w-4" />
                  {t.search}
                </LocaleLink>
              </Button>
            </div>

            {/* 提示信息 */}
            <div className="pt-8 text-sm text-muted-foreground">
              <p>{t.errorHint}</p>
              <LocaleLink href="/contact" className="text-primary hover:underline">
                {t.contact}
              </LocaleLink>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
