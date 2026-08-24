import Image from 'next/image'
import { ExternalLink, Link as LinkIcon } from 'lucide-react'

import type { FriendLink } from '@/lib/api'
import type { Locale } from '@/lib/i18n'
import { getMediaUrl } from '@/lib/media'

interface FriendLinksSectionProps {
  links: FriendLink[]
  locale: string
}

const labels: Record<Locale, { title: string; empty: string }> = {
  'zh-Hans': {
    title: '友情链接',
    empty: '暂无友情链接',
  },
  en: {
    title: 'Friend Links',
    empty: 'No friend links yet',
  },
  ja: {
    title: '相互リンク',
    empty: '相互リンクはまだありません',
  },
}

export function FriendLinksSection({ links, locale }: FriendLinksSectionProps) {
  const t = labels[locale as Locale] || labels['zh-Hans']

  return (
    <section className="mt-10">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl font-bold">{t.title}</h2>
      </div>

      {links.length > 0 ? (
        // 每项按内容宽度排布，不铺满整行 ——
        // 此前是等宽栅格，只有一两个友链时就是一个横贯整屏、右半边全空的方块
        <div className="flex flex-wrap gap-x-10 gap-y-6">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex max-w-sm items-center gap-3"
            >
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded">
                {link.icon ? (
                  <Image
                    src={getMediaUrl(link.icon.url)}
                    alt={link.icon.alternativeText || link.title}
                    fill
                    sizes="40px"
                    className="object-contain"
                  />
                ) : (
                  <LinkIcon className="h-5 w-5 text-muted-foreground/50" />
                )}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="ba-title truncate group-hover:text-primary">{link.title}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </span>
                {link.description ? (
                  <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                    {link.description}
                  </span>
                ) : null}
              </span>
            </a>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      )}
    </section>
  )
}
