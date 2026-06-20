'use client'

/**
 * 全局错误边界：兜住根 layout / Provider 自身的渲染异常。
 *
 * 注意：global-error 会替换整个根 layout，因此必须自带 <html>/<body>，
 * 且【刻意】不依赖任何 Provider、Header/Footer、LocaleLink、useLocale ——
 * 它要兜的正是这些组件崩溃的场景。语言从路径名直接探测，导航用原生 <a>。
 */

import { useEffect } from 'react'
import './globals.css'

type Locale = 'zh-Hans' | 'en' | 'ja'

const content: Record<Locale, { title: string; desc: string; retry: string; home: string }> = {
  'zh-Hans': {
    title: '书架塌了一角…',
    desc: '页面加载时发生了意外错误，请稍后重试。',
    retry: '重试',
    home: '返回首页',
  },
  en: {
    title: 'Something went wrong',
    desc: 'An unexpected error occurred while loading the page. Please try again.',
    retry: 'Try again',
    home: 'Back to Home',
  },
  ja: {
    title: '問題が発生しました',
    desc: 'ページの読み込み中に予期しないエラーが発生しました。後でもう一度お試しください。',
    retry: '再試行',
    home: 'ホームに戻る',
  },
}

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'zh-Hans'
  const seg = window.location.pathname.split('/')[1]
  if (seg === 'en' || seg === 'ja' || seg === 'zh-Hans') return seg
  return 'zh-Hans'
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('GlobalError:', error)
  }, [error])

  const locale = detectLocale()
  const t = content[locale]
  const homeHref = `/${locale}`

  return (
    <html lang={locale}>
      <body className="font-sans antialiased">
        <main className="min-h-screen flex items-center justify-center px-4 py-12">
          <div className="text-center space-y-6 max-w-md">
            <h1 className="text-5xl md:text-6xl font-bold text-primary">500</h1>
            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">{t.title}</h2>
              <p className="text-muted-foreground">{t.desc}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t.retry}
              </button>
              <a
                href={homeHref}
                className="inline-flex items-center justify-center rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {t.home}
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
