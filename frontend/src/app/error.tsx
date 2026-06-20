'use client'

import { useEffect } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { LocaleLink } from '@/components/locale-link'
import { AlertCircle, Home, RefreshCw } from 'lucide-react'
import { useLocale } from '@/contexts/locale-context'
import { translations } from '@/lib/i18n'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { locale } = useLocale()
  const t = translations[locale] || translations['zh-Hans']

  useEffect(() => {
    console.error('Error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
        <div className="content-panel flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-6 max-w-md">
            {/* 错误图标 */}
            <div className="flex justify-center">
              <div className="p-4 bg-destructive/10 rounded-full">
                <AlertCircle className="h-16 w-16 text-destructive" />
              </div>
            </div>

            {/* 错误信息 */}
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold">{t['error.title'] as string}</h1>
              <p className="text-muted-foreground">{t['error.desc'] as string}</p>
            </div>

            {/* 错误详情（开发环境） */}
            {process.env.NODE_ENV === 'development' && error.message && (
              <div className="p-4 bg-muted rounded-lg text-left">
                <p className="text-xs font-mono text-destructive break-all">
                  {error.message}
                </p>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={reset} size="lg">
                <RefreshCw className="mr-2 h-4 w-4" />
                {t['error.retry'] as string}
              </Button>
              <Button asChild variant="outline" size="lg">
                <LocaleLink href="/">
                  <Home className="mr-2 h-4 w-4" />
                  {t['common.backHome'] as string}
                </LocaleLink>
              </Button>
            </div>

            {/* 提示信息 */}
            <div className="pt-4 text-sm text-muted-foreground">
              <p>{t['error.hint'] as string}</p>
              <LocaleLink href="/contact" className="text-primary hover:underline">
                {t['common.contactLibrary'] as string}
              </LocaleLink>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
