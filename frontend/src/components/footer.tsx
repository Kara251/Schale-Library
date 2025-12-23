'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { LocaleLink } from "@/components/locale-link"
import { useLocale } from "@/contexts/locale-context"
import type { Locale } from "@/lib/i18n"

const content: Record<Locale, {
  subtitle: string
  about: string
  contact: string
  privacy: string
  disclaimer: string
}> = {
  'zh-Hans': {
    subtitle: '蔚蓝档案资源收集站',
    about: '关于图书馆',
    contact: '联系图书馆',
    privacy: '隐私政策',
    disclaimer: '本站与 Nexon 及 Yostar 无关',
  },
  'en': {
    subtitle: 'Blue Archive Resource Collection',
    about: 'About',
    contact: 'Contact',
    privacy: 'Privacy Policy',
    disclaimer: 'Not affiliated with Nexon or Yostar',
  },
  'ja': {
    subtitle: 'ブルーアーカイブ資料収集サイト',
    about: '図書館について',
    contact: 'お問い合わせ',
    privacy: 'プライバシーポリシー',
    disclaimer: 'Nexon および Yostar とは関係ありません',
  },
}

export function Footer() {
  const { locale } = useLocale()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const t = mounted ? (content[locale] || content['zh-Hans']) : content['zh-Hans']

  return (
    <footer className="bg-card border-t border-border py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* 左半部分 - 大 Logo */}
          <div className="md:w-1/2 flex justify-center md:justify-start">
            <Image
              src="/img/ShcaleLibraryLogo.png"
              alt="Schale Library"
              width={160}
              height={160}
              className="rounded"
              style={{ width: 'auto', height: 'auto' }}
            />
          </div>

          {/* 右半部分 - 其他内容 */}
          <div className="md:w-1/2 flex flex-col items-center md:items-end gap-4">
            {/* 导航链接 */}
            <div className="flex flex-wrap justify-center md:justify-end gap-4 text-sm text-muted-foreground">
              <LocaleLink href="/about" className="hover:text-foreground transition-colors">
                {t.about}
              </LocaleLink>
              <LocaleLink href="/contact" className="hover:text-foreground transition-colors">
                {t.contact}
              </LocaleLink>
              <LocaleLink href="/privacy" className="hover:text-foreground transition-colors">
                {t.privacy}
              </LocaleLink>
              <a
                href="https://github.com/Kara251/Schale-Library"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </a>
            </div>

            {/* 版权信息 */}
            <div className="text-sm text-muted-foreground text-center md:text-right">
              <p>© 2025 Schale Library</p>
              <p className="text-xs">{t.disclaimer}</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
