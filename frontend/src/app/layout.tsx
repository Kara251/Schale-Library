import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { BackToTop } from "@/components/back-to-top"
import { BackgroundImage } from "@/components/background-image"
import { AuthProvider } from "@/contexts/auth-context"
import { LocaleProvider } from "@/contexts/locale-context"
import "./globals.css"

export const metadata: Metadata = {
  title: "Schale Library - 夏莱图书馆 | 蔚蓝档案资料站",
  description: "收集游戏作品《蔚蓝档案》内容，以及游戏外的各种作品、活动等的系统",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 字体 - 使用 loli.net 国内 CDN 镜像（全球可用） */}
        <link rel="preconnect" href="https://fonts.loli.net" crossOrigin="anonymous" />
        {/* Nunito - 英文圆润字体 */}
        <link
          href="https://fonts.loli.net/css2?family=Nunito:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Noto Sans SC - 中文思源黑体 */}
        <link
          href="https://fonts.loli.net/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        {/* Noto Sans JP - 日文思源黑体 */}
        <link
          href="https://fonts.loli.net/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <BackgroundImage />
        <LocaleProvider>
          <AuthProvider>
            {children}
            <BackToTop />
            <Analytics />
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  )
}


