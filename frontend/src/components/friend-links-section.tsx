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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group ba-card block p-4"
            >
              <div className="ba-card-content">
                <div className="flex items-start gap-4">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-secondary">
                    {link.icon ? (
                      <Image
                        src={getMediaUrl(link.icon.url)}
                        alt={link.icon.alternativeText || link.title}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <LinkIcon className="h-6 w-6 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="ba-title line-clamp-1 group-hover:text-primary">{link.title}</h3>
                      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                    {link.description ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {link.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">{t.empty}</div>
      )}
    </section>
  )
}
