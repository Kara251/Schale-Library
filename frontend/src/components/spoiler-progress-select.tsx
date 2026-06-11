'use client'

import { ShieldAlert } from 'lucide-react'
import { useSpoilerProgress } from '@/hooks/use-spoiler-progress'
import {
  SPOILER_SCOPE_ORDER,
  researchSpoilerScopeLabels,
  type ResearchSpoilerScope,
} from '@/lib/api'
import { translations, type Locale } from '@/lib/i18n'

interface SpoilerProgressSelectProps {
  locale: Locale
  className?: string
}

/**
 * 阅读进度选择器：超过进度的考据条目会被模糊处理并显示剧透警告。
 */
export function SpoilerProgressSelect({ locale, className }: SpoilerProgressSelectProps) {
  const t = translations[locale] || translations['zh-Hans']
  const labels = researchSpoilerScopeLabels[locale] || researchSpoilerScopeLabels['zh-Hans']
  const [progress, setProgress] = useSpoilerProgress()

  return (
    <label className={`inline-flex items-center gap-2 text-sm ${className || ''}`}>
      <ShieldAlert className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">{t['research.spoiler.label'] as string}</span>
      <select
        value={progress}
        onChange={(event) => setProgress(event.target.value as ResearchSpoilerScope)}
        className="h-8 rounded-md border bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
      >
        {(Object.keys(SPOILER_SCOPE_ORDER) as ResearchSpoilerScope[]).map((scope) => (
          <option key={scope} value={scope}>
            {labels[scope]}
          </option>
        ))}
      </select>
    </label>
  )
}
