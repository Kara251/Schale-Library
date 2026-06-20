'use client'

import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { LocaleLink } from '@/components/locale-link'
import { Home, Search } from 'lucide-react'
import { useLocale } from '@/contexts/locale-context'
import { translations } from '@/lib/i18n'

export default function NotFound() {
  const { locale } = useLocale()
  const dict = translations[locale] || translations['zh-Hans']
  const t = {
    title: dict['notFound.title'] as string,
    desc: dict['notFound.desc'] as string,
    home: dict['common.backHome'] as string,
    search: dict['nav.searchLibrary'] as string,
    errorHint: dict['notFound.errorHint'] as string,
    contact: dict['common.contactLibrary'] as string,
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
        <div className="content-panel flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-6 max-w-md">
            {/* 404 大标题 */}
            <div className="space-y-2">
              <h1 className="text-8xl md:text-9xl font-bold text-primary">
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
