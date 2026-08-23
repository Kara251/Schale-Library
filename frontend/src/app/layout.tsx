import type { Metadata } from "next"
import { headers } from "next/headers"
import { BackToTop } from "@/components/back-to-top"
import { BackgroundImage } from "@/components/background-image"
import { AuthProvider } from "@/contexts/auth-context"
import { LocaleProvider } from "@/contexts/locale-context"
import { ToastProvider } from "@/contexts/toast-context"
import { CloudflareAnalytics, GoogleAnalytics, Clarity } from "@/components/third-party-analytics"
import { SITE_URL } from "@/lib/config"
import "./globals.css"

type Locale = 'zh-Hans' | 'en' | 'ja'

const htmlLangByLocale: Record<Locale, string> = {
  'zh-Hans': 'zh-Hans',
  en: 'en',
  ja: 'ja',
}

function getHtmlLang(locale: string | null) {
  return htmlLangByLocale[locale as Locale] || htmlLangByLocale['zh-Hans']
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Schale Library - 夏莱图书馆 | 蔚蓝档案资料站",
  description: "夏莱图书馆：收录《蔚蓝档案》相关内容与游戏外的作品、活动资讯，提供考据档案与创作者导航",
  keywords: "蔚蓝档案,Blue Archive,Schale Library,夏莱图书馆",
  authors: [{ name: "Kara251" }],
  generator: "Next.js",
  openGraph: {
    title: "Schale Library - 夏莱图书馆",
    description: "蔚蓝档案收集站",
    type: "website",
    locale: "zh_CN",
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children?: React.ReactNode
}>) {
  const requestHeaders = await headers()
  const htmlLang = getHtmlLang(requestHeaders.get('x-schale-locale'))

  return (
    <html lang={htmlLang} suppressHydrationWarning>
      <head>
        {/* 字体：字体栈实际只用 BlueakaBeta2GBK（自托管）+ Noto Sans JP；
            Nunito / Noto Sans SC 为死重已移除。W6 迁移 OpenNext 后构建环境可重试 next/font。 */}
        <link rel="preconnect" href="https://fonts.loli.net" crossOrigin="anonymous" />
        {/* 字体文件在 gstatic.loli.net，与 CSS 不同域 */}
        <link rel="preconnect" href="https://gstatic.loli.net" crossOrigin="anonymous" />
        <link
          href="https://fonts.loli.net/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <BackgroundImage />
        <LocaleProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
              <BackToTop />
              {/* NEXT_PUBLIC_CF_BEACON_TOKEN 未配置时不渲染 */}
              <CloudflareAnalytics />
              <GoogleAnalytics />
              <Clarity />
            </ToastProvider>
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  )
}
