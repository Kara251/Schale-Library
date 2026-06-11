'use client'

import { useState, type ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isSpoilerBlocked, useSpoilerProgress } from '@/hooks/use-spoiler-progress'
import { SpoilerProgressSelect } from '@/components/spoiler-progress-select'
import { researchSpoilerScopeLabels, type ResearchSpoilerScope } from '@/lib/api'
import { translations, type Locale } from '@/lib/i18n'

interface SpoilerGateProps {
  scope?: ResearchSpoilerScope
  locale: Locale
  children: ReactNode
}

/**
 * 条目详情的剧透门：超出读者进度时模糊正文并显示警告条，
 * 读者可调整进度或选择仍要阅读。
 */
export function SpoilerGate({ scope, locale, children }: SpoilerGateProps) {
  const t = translations[locale] || translations['zh-Hans']
  const spoilerLabels = researchSpoilerScopeLabels[locale] || researchSpoilerScopeLabels['zh-Hans']
  const [progress] = useSpoilerProgress()
  const [revealed, setRevealed] = useState(false)
  const blocked = isSpoilerBlocked(scope, progress) && !revealed

  if (!blocked) {
    return <>{children}</>
  }

  return (
    <div className="relative">
      <div className="spoiler-blur max-h-[60vh] overflow-hidden" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex items-start justify-center bg-gradient-to-b from-background/40 via-background/80 to-background pt-16">
        <div className="mx-4 w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-lg">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-destructive" />
          <h2 className="text-lg font-bold mb-2">{t['research.spoiler.warningTitle'] as string}</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            {(t['research.spoiler.warningBody'] as string).replace('{scope}', spoilerLabels[scope || 'none'])}
          </p>
          <div className="flex flex-col items-center gap-3">
            <SpoilerProgressSelect locale={locale} />
            <Button variant="outline" size="sm" onClick={() => setRevealed(true)}>
              {t['research.spoiler.reveal'] as string}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
