import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { BackToTop } from "@/components/back-to-top"
import "./globals.css"

export const metadata: Metadata = {
  title: "Schale Library - 夏莱图书馆 | 蔚蓝档案资料站",
  description: "收集游戏作品《蔚蓝档案》内容，以及游戏外的各种作品、活动等的系统",
  keywords: "蔚蓝档案,Blue Archive,Schale,夏莱图书馆,二次元,游戏资料,活动信息",
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
      <body className="font-sans antialiased">
        {children}
        <BackToTop />
        <Analytics />
      </body>
    </html>
  )
}
